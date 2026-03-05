from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST




def landing(request):
    from .models import MRIScan
    return render(request, 'core/landing.html', {
        'total_scans': MRIScan.objects.count(),
        'total_users': User.objects.filter(is_active=True).count(),
    })


def login_view(request):
    if request.user.is_authenticated: return redirect('upload')
    if request.method == 'POST':
        identifier = request.POST.get('email','').strip()
        password   = request.POST.get('password','')
        username   = identifier
        try:
            u = User.objects.get(email=identifier); username = u.username
        except User.DoesNotExist: pass
        user = authenticate(request, username=username, password=password)
        if user:
            # Superusers bypass verification always
            if not user.is_superuser:
                try:
                    prof = UserProfile.objects.get(user=user)
                    if not prof.is_verified:
                        messages.warning(request,
                            'Please verify your email first. Check your inbox for the verification link.')
                        LoginHistory.objects.create(user=user, login_status='failed',
                            ip_address=_ip(request), user_agent=request.META.get('HTTP_USER_AGENT',''))
                        return render(request, 'core/login.html', {'unverified_email': user.email})
                except UserProfile.DoesNotExist:
                    # No profile = create one as verified
                    UserProfile.objects.create(user=user, role='admin', is_verified=True)
            login(request, user)
            LoginHistory.objects.create(user=user, login_status='success',
                ip_address=_ip(request), user_agent=request.META.get('HTTP_USER_AGENT',''))
            return redirect('upload')
        try:
            fu = User.objects.get(Q(email=identifier)|Q(username=identifier))
            LoginHistory.objects.create(user=fu, login_status='failed',
                ip_address=_ip(request), user_agent=request.META.get('HTTP_USER_AGENT',''))
        except User.DoesNotExist: pass
        messages.error(request,'Invalid email or password.')
    return render(request,'core/login.html')


def signup_view(request):
    if request.user.is_authenticated: return redirect('upload')
    if request.method == 'POST':
        full_name = request.POST.get('name','').strip()
        email     = request.POST.get('email','').strip().lower()
        password  = request.POST.get('password','')
        confirm   = request.POST.get('confirm_password','')
        role      = request.POST.get('role','radiologist')

        # Basic validation
        if not all([full_name, email, password]):
            messages.error(request,'All fields are required.')
            return render(request,'core/signup.html')
        if password != confirm:
            messages.error(request,'Passwords do not match.')
            return render(request,'core/signup.html')
        if len(password) < 8:
            messages.error(request,'Password must be at least 8 characters.')
            return render(request,'core/signup.html')

        # Validate email format
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            messages.error(request,'Please enter a valid email address.')
            return render(request,'core/signup.html')

        # Verify email actually exists via SMTP
        from .email_utils import verify_email_exists
        email_ok, email_err = verify_email_exists(email)
        if not email_ok:
            messages.error(request, email_err)
            return render(request,'core/signup.html')

        # Check email not already a real account
        if User.objects.filter(email=email).exists():
            messages.error(request,'An account with this email already exists. Please sign in.')
            return render(request,'core/signup.html')

        # Check not already pending
        PendingSignup.objects.filter(email=email).delete()

        # Hash password and store as pending — NO User created yet
        from django.contrib.auth.hashers import make_password
        token = generate_token()
        PendingSignup.objects.create(
            token=token,
            full_name=full_name,
            email=email,
            password_hash=make_password(password),
            role=role,
        )

        # Send verification email
        from .email_utils import send_pending_verification_email
        send_pending_verification_email(full_name.split()[0], email, token)

        from django.conf import settings as cfg
        verify_url = f"{cfg.FRONTEND_URL}/verify-email/{token}/"
        using_console = 'console' in cfg.EMAIL_BACKEND
        return render(request, 'core/signup_pending.html', {
            'name': full_name.split()[0],
            'email': email,
            'verify_url': verify_url if using_console else None,
            'using_console': using_console,
        })
    return render(request,'core/signup.html')


def resend_verification(request):
    if request.method == 'POST':
        email = request.POST.get('email','').strip().lower()
        # Check pending signups first
        try:
            pending = PendingSignup.objects.get(email=email)
            token = generate_token()
            pending.token = token
            pending.save()
            from .email_utils import send_pending_verification_email
            send_pending_verification_email(pending.full_name.split()[0], email, token)
            messages.success(request, f'Verification email resent to {email}. Check your inbox.')
            return render(request, 'core/signup_pending.html', {
                'name': pending.full_name.split()[0], 'email': email,
            })
        except PendingSignup.DoesNotExist:
            pass
        # Legacy: existing unverified user
        try:
            user = User.objects.get(email=email)
            profile = UserProfile.objects.get(user=user)
            if profile.is_verified:
                messages.info(request, 'Already verified. Please log in.')
                return redirect('login')
            token = generate_token()
            profile.email_token = token; profile.save()
            send_verification_email(user, token)
            messages.success(request, f'Verification email resent to {email}.')
        except (User.DoesNotExist, UserProfile.DoesNotExist):
            messages.error(request, 'No account found with that email.')
    return redirect('login')

def verify_email(request, token):
    print(f"[Brainify] Verifying token: {token[:20]}...")

    # Check PendingSignup first (new flow — user not created yet)
    try:
        pending = PendingSignup.objects.get(token=token)
        if pending.is_expired():
            pending.delete()
            messages.error(request, 'This verification link has expired. Please sign up again.')
            return redirect('signup')

        # Create the real user now
        parts = pending.full_name.split(' ', 1)
        base = pending.email.split('@')[0]
        uname = base; n = 1
        while User.objects.filter(username=uname).exists():
            uname = f"{base}{n}"; n += 1

        user = User.objects.create_user(
            username=uname,
            email=pending.email,
            first_name=parts[0],
            last_name=parts[1] if len(parts) > 1 else '',
        )
        user.password = pending.password_hash
        user.save()

        UserProfile.objects.create(user=user, role=pending.role, is_verified=True)
        pending.delete()

        login(request, user)
        messages.success(request, f'Welcome to Brainify, {parts[0]}! Your account is verified.')
        return redirect('upload')

    except PendingSignup.DoesNotExist:
        pass

    # Legacy flow — check if existing profile has this token
    try:
        profile = UserProfile.objects.get(email_token=token)
        profile.is_verified = True
        profile.email_token = ''
        profile.save()
        login(request, profile.user)
        messages.success(request, f'Email verified! Welcome, {profile.user.first_name or profile.user.username}!')
        return redirect('upload')
    except UserProfile.DoesNotExist:
        pass

    messages.error(request, 'This verification link is invalid or has already been used. Please sign in.')
    return redirect('login')
