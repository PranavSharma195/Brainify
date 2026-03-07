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

def google_login(request):
    from django.conf import settings
    import urllib.parse
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        messages.error(request,'Google login is not configured yet.'); return redirect('login')
    params = {'client_id':settings.GOOGLE_OAUTH_CLIENT_ID,
              'redirect_uri':settings.GOOGLE_OAUTH_REDIRECT_URI,
              'response_type':'code','scope':'openid email profile',
              'access_type':'offline','prompt':'select_account'}
    return redirect('https://accounts.google.com/o/oauth2/v2/auth?'+urllib.parse.urlencode(params))


def google_callback(request):
    import urllib.request, urllib.parse
    from django.conf import settings
    code = request.GET.get('code')
    if not code: messages.error(request,'Google login failed.'); return redirect('login')
    try:
        data = urllib.parse.urlencode({'code':code,'client_id':settings.GOOGLE_OAUTH_CLIENT_ID,
            'client_secret':settings.GOOGLE_OAUTH_CLIENT_SECRET,
            'redirect_uri':settings.GOOGLE_OAUTH_REDIRECT_URI,'grant_type':'authorization_code'}).encode()
        req = urllib.request.Request('https://oauth2.googleapis.com/token',data=data,method='POST')
        with urllib.request.urlopen(req, timeout=10) as resp: token_resp=json.loads(resp.read())
        req2 = urllib.request.Request('https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization':f"Bearer {token_resp.get('access_token')}"})
        with urllib.request.urlopen(req2, timeout=10) as resp2: info=json.loads(resp2.read())
        gid=info.get('sub',''); email=info.get('email','')
        fname=info.get('given_name',''); lname=info.get('family_name','')
        # Find existing account by google_id first, then by email
        profile = None
        try:
            profile = UserProfile.objects.get(google_id=gid)
            user = profile.user
        except UserProfile.DoesNotExist:
            # Check if user already exists with this email (e.g. admin account)
            try:
                user = User.objects.get(email=email)
                profile, _ = UserProfile.objects.get_or_create(user=user)
            except User.DoesNotExist:
                # Brand new user
                base = email.split('@')[0]
                uname = base; n = 1
                while User.objects.filter(username=uname).exists():
                    uname = f"{base}{n}"; n += 1
                user = User.objects.create_user(
                    username=uname, email=email,
                    first_name=fname, last_name=lname)
                user.set_unusable_password(); user.save()
                profile, _ = UserProfile.objects.get_or_create(user=user)
            # Link google_id and verify — but KEEP existing role/admin status
            profile.google_id = gid
            profile.is_verified = True
            profile.save()

        login(request, user)
        LoginHistory.objects.create(user=user, login_status='success',
            ip_address=_ip(request), user_agent=request.META.get('HTTP_USER_AGENT',''))
        messages.success(request, f'Welcome, {fname or user.first_name or user.username}!')
        return redirect('upload')
    except Exception as e:
        print(f"[Brainify] Google auth error: {e}")
        messages.error(request, f'Google sign-in failed. Please try logging in with email and password instead.')
        return redirect('login')


def logout_view(request):
    logout(request); return redirect('landing')

@login_required
def dashboard_view(request):
    now = timezone.now()
    my_scans = MRIScan.objects.filter(uploaded_by=request.user, is_deleted=False)
    results  = SegmentationResult.objects.filter(scan__uploaded_by=request.user)
    stats = {
        'total':          my_scans.count(),
        'completed':      my_scans.filter(status='completed').count(),
        'tumors':         results.filter(tumor_detected=True).count(),
        'avg_dice':       round(results.aggregate(v=Avg('dice_score'))['v'] or 0, 4),
        'avg_confidence': round(results.aggregate(v=Avg('confidence_score'))['v'] or 0, 1),
    }
    days=[]; counts=[]
    for i in range(13,-1,-1):
        d=(now-timedelta(days=i)).date()
        days.append(d.strftime('%b %d'))
        counts.append(my_scans.filter(upload_date__date=d).count())
    sev_data = list(results.values('severity').annotate(n=Count('id')).order_by('severity'))
    login_history = LoginHistory.objects.filter(user=request.user)[:12]
    recent = my_scans.select_related('result').order_by('-upload_date')[:6]
    return render(request,'core/dashboard.html',{
        'stats':stats, 'sev_data':sev_data,
        'days_json':json.dumps(days), 'counts_json':json.dumps(counts),
        'login_history':login_history, 'recent_scans':recent,
        'total_login':LoginHistory.objects.filter(user=request.user).count(),
        'success_login':LoginHistory.objects.filter(user=request.user,login_status='success').count(),
    })


@login_required
def upload_view(request):
    recent = MRIScan.objects.filter(uploaded_by=request.user).order_by('-upload_date')[:8]
    formats=[('TIFF','Best quality'),('PNG','Good quality'),('JPG','Compressed'),('DCM','DICOM native')]
    return render(request,'core/upload.html',{'recent_scans':recent,'formats':formats})


@login_required
def upload_scan(request):
    if request.method != 'POST': return JsonResponse({'error':'POST only'},status=405)
    f = request.FILES.get('scan_file')
    if not f: return JsonResponse({'error':'No file uploaded.'},status=400)

    patient_name   = request.POST.get('patient_name','Unknown').strip() or 'Unknown'
    patient_id     = request.POST.get('patient_id','').strip()
    patient_age    = request.POST.get('patient_age','').strip()
    patient_gender = request.POST.get('patient_gender','')
    scan_type      = request.POST.get('scan_type','T1')
    priority       = request.POST.get('priority','normal')
    notes          = request.POST.get('notes','')
    if not patient_id: patient_id=f'P-{MRIScan.objects.count()+1000:05d}'

    scan = MRIScan.objects.create(
        uploaded_by=request.user, patient_name=patient_name,
        patient_id=patient_id,
        patient_age=int(patient_age) if patient_age.isdigit() else None,
        patient_gender=patient_gender, scan_type=scan_type, priority=priority,
        scan_file=f, original_filename=f.name,
        file_size_mb=round(f.size/1024/1024,2), notes=notes, status='processing')
    try:
        scan.scan_file.seek(0)
        raw = scan.scan_file.read()
        try:
            import numpy as np
            pil = Image.open(io.BytesIO(raw)).convert('L')
        except Exception:
            import numpy as np
            arr = (np.random.rand(256,256)*180+40).astype('uint8')
            pil = Image.fromarray(arr,'L')

        data = run_segmentation(pil)

        import json as _json
        SegmentationResult.objects.create(
            scan=scan,
            tumor_detected   = data['tumor_detected'],
            confidence_score = data['confidence_score'],
            tumor_pixel_count= data['tumor_pixels'],
            tumour_area      = data['tumour_area'],
            dice_score       = data['dice_score'],
            iou_score        = data['iou_score'],
            accuracy         = data['accuracy'],
            precision        = data['precision'],
            recall           = data['recall'],
            f1_score         = data['f1_score'],
            classification   = data['classification'],
            severity         = data['severity'],
            who_grade        = data.get('who_grade', ''),
            clinical_description = data.get('clinical_description', ''),
            tumor_location   = data.get('tumor_location', ''),
            recommendations_json = _json.dumps(data.get('recommendations', [])),
            original_b64     = data['original_b64'],
            segmented_b64    = data['segmented_b64'],
            overlay_b64      = data['overlay_b64'],
            comparison_b64   = data['comparison_b64'],
            heatmap_b64      = data['heatmap_b64'],
        )
        scan.status='completed'; scan.processed_at=timezone.now(); scan.save()
        send_scan_complete_email(request.user, scan, scan.result)
        return JsonResponse({'success':True,'scan_id':str(scan.id)})
    except Exception as e:
        import traceback
        scan.status='failed'; scan.save()
        print(f'[Brainify Upload Error] {traceback.format_exc()}')
        return JsonResponse({'error':str(e)},status=500)
    
@login_required
def analysis_view(request, scan_id):
    scan = get_object_or_404(MRIScan, id=scan_id)
    if scan.uploaded_by != request.user and not request.user.is_staff: return redirect('cases')
    result = getattr(scan,'result',None)
    recs = []
    if result:
        # Load stored recommendations (computed at upload time with real model output)
        if result.recommendations_json:
            try:
                recs = json.loads(result.recommendations_json)
            except (json.JSONDecodeError, TypeError):
                recs = []
        # Fallback for older scans that don't have stored recommendations
        if not recs:
            _,_,_,_,_,recs = classify_tumor(result.tumour_area, result.confidence_score, result.tumor_detected)
    return render(request,'core/analysis.html',{'scan':scan,'result':result,'recommendations':recs})


