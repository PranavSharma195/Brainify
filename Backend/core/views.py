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

@login_required
@require_POST
def save_notes(request, scan_id):
    scan = get_object_or_404(MRIScan, id=scan_id)
    result = getattr(scan,'result',None)
    if not result: return JsonResponse({'error':'No result'},status=404)
    data = json.loads(request.body)
    result.radiologist_notes = data.get('notes',''); result.save()
    return JsonResponse({'success':True})


@login_required
def download_report(request, scan_id):
    scan = get_object_or_404(MRIScan, id=scan_id)
    result = getattr(scan,'result',None)
    pdf = generate_pdf_report(scan, result, request.user)
    rep,_=Report.objects.get_or_create(result=result, defaults={'user':request.user})
    rep.download_count+=1; rep.save()
    safe = scan.patient_name.replace(' ','_')
    resp = HttpResponse(pdf,content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="Brainify_{safe}_{str(scan.id)[:8]}.pdf"'
    return resp


@login_required
def cases_list(request):
    q=request.GET.get('q',''); status=request.GET.get('status','')
    qs=MRIScan.objects.filter(uploaded_by=request.user, is_deleted=False).select_related('result')
    if q: qs=qs.filter(Q(patient_name__icontains=q)|Q(patient_id__icontains=q))
    if status: qs=qs.filter(status=status)
    return render(request,'core/cases.html',{'scans':qs.order_by('-upload_date'),'query':q,'status_filter':status})



@login_required
def profile_view(request):
    profile,_=UserProfile.objects.get_or_create(user=request.user)
    history=LoginHistory.objects.filter(user=request.user)[:10]
    my_scans=MRIScan.objects.filter(uploaded_by=request.user)
    stats={'total':my_scans.count(),'completed':my_scans.filter(status='completed').count(),
           'tumors':SegmentationResult.objects.filter(scan__uploaded_by=request.user,tumor_detected=True).count()}
    if request.method=='POST':
        u=request.user
        u.first_name=request.POST.get('first_name',u.first_name)
        u.last_name =request.POST.get('last_name',u.last_name)
        # Email cannot be changed — intentionally not reading from POST
        u.save()
        profile.role=request.POST.get('role',profile.role)
        # Handle avatar upload
        if request.FILES.get('avatar'):
            import base64
            av = request.FILES['avatar']
            pil = Image.open(av).convert('RGB')
            # Fix EXIF rotation so photo is not sideways/upside down
            try:
                from PIL import ImageOps
                pil = ImageOps.exif_transpose(pil)
            except Exception:
                pass
            pil.thumbnail((200, 200), Image.LANCZOS)
            buf = io.BytesIO()
            pil.save(buf, 'JPEG', quality=85)
            profile.avatar_b64 = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
        # Handle password change
        old_pwd=request.POST.get('old_password','')
        new_pwd=request.POST.get('new_password','')
        if old_pwd and new_pwd:
            if request.user.check_password(old_pwd):
                if len(new_pwd)>=8:
                    request.user.set_password(new_pwd); request.user.save()
                    messages.success(request,'Password changed. Please log in again.')
                    return redirect('login')
                else: messages.error(request,'New password must be at least 8 characters.')
            else: messages.error(request,'Current password is incorrect.')
        profile.save()
        messages.success(request,'Profile updated successfully.')
        return redirect('profile')
    ROLES=[('radiologist','Radiologist'),('neurologist','Neurologist'),
           ('technician','Technician'),('researcher','Researcher'),('admin','Admin')]
    return render(request,'core/profile.html',{'profile':profile,'history':history,'stats':stats,'roles':ROLES})



@login_required
def news_feed_api(request):
    import requests as req
    import time
    import xml.etree.ElementTree as ET
    import hashlib

    now = int(time.time())

    REDDIT_SUBS = [
        'braintumor','glioblastoma','braincancer','neuro_oncology',
        'neurology','oncology','medicalscience','neuroscience',
        'askdocs','medicine','healthcareworkers',
    ]

    # Expanded — covers ALL brain abnormalities not just tumors
    KEYWORDS = [
        # Tumors
        'brain tumor','brain tumour','glioblastoma','glioma','meningioma',
        'astrocytoma','medulloblastoma','gbm','craniotomy','brain cancer',
        'brain metastasis','oligodendroglioma','who grade','idh mutation',
        'pituitary tumor','acoustic neuroma','ependymoma','schwannoma',
        'choroid plexus','pineal tumor','craniopharyngioma',
        # Surgery & treatment
        'tumor resection','brain surgery','neurosurgery','brain radiation',
        'temozolomide','bevacizumab','immunotherapy brain','stereotactic',
        'gamma knife','cyberknife','awake craniotomy','brain biopsy',
        'chemoradiation','checkpoint inhibitor brain',
        # Abnormalities
        'brain lesion','brain mass','intracranial','brain anomaly',
        'brain abnormality','cerebral abnormality','neurological disorder',
        'brain hemorrhage','brain bleed','subdural hematoma','epidural hematoma',
        'brain aneurysm','arteriovenous malformation','avm brain',
        'brain abscess','encephalitis','brain inflammation','cerebritis',
        'hydrocephalus','brain cyst','arachnoid cyst','brain edema',
        'cerebral edema','brain swelling','brain atrophy',
        # Strokes & vascular
        'brain stroke','cerebral stroke','ischemic stroke','hemorrhagic stroke',
        'tia','transient ischemic','cerebral infarction','brain infarct',
        # Scans & diagnosis
        'brain mri','mri brain','brain ct','brain pet scan','brain imaging',
        'cranial mri','flair brain','dwi brain','brain spectroscopy',
        # Neurological
        'seizure brain','epilepsy brain','brain seizure','neurology diagnosis',
        'neuro-oncology','neurooncology','brain fog diagnosis',
        'cognitive decline brain','dementia brain','alzheimer brain',
        'parkinson brain','multiple sclerosis brain','ms brain lesion',
        'white matter lesion','leukoencephalopathy','brain calcification',
        # Research
        'brain research','neuroscience discovery','brain study','brain trial',
        'clinical trial brain','brain clinical','cns tumor','central nervous',
    ]

    # Subreddits where ALL posts are brain-relevant — no keyword filter needed
    BRAIN_SUBS = {'braintumor','glioblastoma','braincancer','neuro_oncology'}

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0',
        'Accept': 'application/json,text/html,application/xhtml+xml',
    }

    all_posts = []
    sub_counts = {}
    seen_ids = set()

    for sub in REDDIT_SUBS:
        try:
            url = f'https://www.reddit.com/r/{sub}/new.json?limit=100&raw_json=1'
            resp = req.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                continue
            posts = [c['data'] for c in resp.json().get('data',{}).get('children',[])]
            for p in posts:
                if p['id'] in seen_ids:
                    continue
                text = (p.get('title','') + ' ' + p.get('selftext','')).lower()
                is_brain_sub = sub in BRAIN_SUBS
                if is_brain_sub or any(k in text for k in KEYWORDS):
                    seen_ids.add(p['id'])
                    sub_counts[sub] = sub_counts.get(sub, 0) + 1
                    all_posts.append({
                        'id': p['id'],
                        'title': p.get('title',''),
                        'selftext': p.get('selftext','')[:500],
                        'subreddit': p.get('subreddit_display_name', sub),
                        'permalink': p.get('permalink',''),
                        'url': p.get('url',''),
                        'ups': p.get('ups', 0),
                        'num_comments': p.get('num_comments', 0),
                        'created_utc': int(p.get('created_utc', 0)),
                        'author': p.get('author','[reddit]'),
                        'source_type': 'reddit',
                    })
        except Exception as e:
            print(f'[News/Reddit] {sub}: {e}')

    RSS_FEEDS = [
        ('ScienceDaily Neurology', 'https://www.sciencedaily.com/rss/health_medicine/brain_tumors.xml'),
        ('ScienceDaily Brain', 'https://www.sciencedaily.com/rss/mind_brain.xml'),
        ('NIH News', 'https://www.nih.gov/rss/news/news.rss'),
        ('Medical News Today', 'https://www.medicalnewstoday.com/rss'),
        ('NCI Cancer', 'https://www.cancer.gov/news-events/cancer-currents-blog/feed'),
    ]

    rss_headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
    }

    for source_name, rss_url in RSS_FEEDS:
        try:
            resp = req.get(rss_url, headers=rss_headers, timeout=8)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.content)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}

            # Handle both RSS and Atom formats
            items = root.findall('.//item') or root.findall('.//atom:entry', ns)

            for item in items[:30]:
                def _t(tag):
                    el = item.find(tag) or item.find(f'atom:{tag}', ns)
                    return el.text.strip() if el is not None and el.text else ''

                title = _t('title')
                desc = _t('description') or _t('summary') or _t('content')
                link = _t('link') or _t('guid')
                pub = _t('pubDate') or _t('published') or _t('updated')

                if not title:
                    continue

                # Filter by keyword
                text = (title + ' ' + desc).lower()
                if not any(k in text for k in KEYWORDS):
                    continue

                # Parse date
                post_time = now
                try:
                    from email.utils import parsedate_to_datetime
                    from datetime import datetime, timezone
                    import re
                    # Try RFC 2822 (RSS)
                    post_time = int(parsedate_to_datetime(pub).timestamp())
                except Exception:
                    try:
                        # Try ISO 8601 (Atom)
                        from datetime import datetime
                        pub_clean = re.sub(r'\.[0-9]+', '', pub).replace('Z', '+00:00')
                        post_time = int(datetime.fromisoformat(pub_clean).timestamp())
                    except Exception:
                        post_time = now - 3600  # default 1h ago

                uid = hashlib.md5((title + link).encode()).hexdigest()[:12]
                if uid in seen_ids:
                    continue
                seen_ids.add(uid)

                # Clean HTML from description
                import re
                desc_clean = re.sub(r'<[^>]+>', '', desc).strip()[:500]

                all_posts.append({
                    'id': uid,
                    'title': title,
                    'selftext': desc_clean,
                    'subreddit': source_name,
                    'permalink': '',
                    'url': link,
                    'ups': 0,
                    'num_comments': 0,
                    'created_utc': post_time,
                    'author': source_name,
                    'source_type': 'rss',
                    'external_url': link,
                })
                sub_counts[source_name] = sub_counts.get(source_name, 0) + 1
        except Exception as e:
            print(f'[News/RSS] {source_name}: {e}')

    # Sort newest first
    all_posts.sort(key=lambda p: p['created_utc'], reverse=True)

    return JsonResponse({
        'posts': all_posts,
        'sub_counts': sub_counts,
        'fetched_at': now,
        'total': len(all_posts),
    })

def news_comments_api(request, permalink):
    import requests as req
    try:
        # permalink comes as subreddit/comments/id/slug
        url = f'https://www.reddit.com/{permalink}.json?limit=50'
        resp = req.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; BrainifyApp/1.0)',
            'Accept': 'application/json',
        }, timeout=10)
        data = resp.json()

        post_data = data[0]['data']['children'][0]['data']
        comments_raw = data[1]['data']['children']

        comments = []
        for c in comments_raw:
            if c.get('kind') != 't1':
                continue
            cd = c['data']
            body = cd.get('body','')
            if body in ('[deleted]','[removed]',''):
                continue
            comments.append({
                'author': cd.get('author',''),
                'body': body[:800],
                'ups': cd.get('ups', 0),
                'created_utc': cd.get('created_utc', 0),
            })

        return JsonResponse({
            'selftext': post_data.get('selftext','')[:2000],
            'comments': comments,
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'comments': []}, status=500)


@login_required
def news_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return render(request, 'core/news.html', {
        'notifications_on': profile.news_notifications,
    })

@login_required
def toggle_notifications(request):
    if request.method == 'POST':
        import json
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        data = json.loads(request.body)
        profile.news_notifications = data.get('enabled', True)
        profile.save()
        return JsonResponse({'ok': True, 'enabled': profile.news_notifications})
    return JsonResponse({'ok': False})


@login_required
def news_feed_api(request):
    import requests as req
    import time
    import xml.etree.ElementTree as ET
    import hashlib

    now = int(time.time())

    REDDIT_SUBS = [
        'braintumor','glioblastoma','braincancer','neuro_oncology',
        'neurology','oncology','medicalscience','neuroscience',
        'askdocs','medicine','healthcareworkers',
    ]

    # Expanded — covers ALL brain abnormalities not just tumors
    KEYWORDS = [
        # Tumors
        'brain tumor','brain tumour','glioblastoma','glioma','meningioma',
        'astrocytoma','medulloblastoma','gbm','craniotomy','brain cancer',
        'brain metastasis','oligodendroglioma','who grade','idh mutation',
        'pituitary tumor','acoustic neuroma','ependymoma','schwannoma',
        'choroid plexus','pineal tumor','craniopharyngioma',
        # Surgery & treatment
        'tumor resection','brain surgery','neurosurgery','brain radiation',
        'temozolomide','bevacizumab','immunotherapy brain','stereotactic',
        'gamma knife','cyberknife','awake craniotomy','brain biopsy',
        'chemoradiation','checkpoint inhibitor brain',
        # Abnormalities
        'brain lesion','brain mass','intracranial','brain anomaly',
        'brain abnormality','cerebral abnormality','neurological disorder',
        'brain hemorrhage','brain bleed','subdural hematoma','epidural hematoma',
        'brain aneurysm','arteriovenous malformation','avm brain',
        'brain abscess','encephalitis','brain inflammation','cerebritis',
        'hydrocephalus','brain cyst','arachnoid cyst','brain edema',
        'cerebral edema','brain swelling','brain atrophy',
        # Strokes & vascular
        'brain stroke','cerebral stroke','ischemic stroke','hemorrhagic stroke',
        'tia','transient ischemic','cerebral infarction','brain infarct',
        # Scans & diagnosis
        'brain mri','mri brain','brain ct','brain pet scan','brain imaging',
        'cranial mri','flair brain','dwi brain','brain spectroscopy',
        # Neurological
        'seizure brain','epilepsy brain','brain seizure','neurology diagnosis',
        'neuro-oncology','neurooncology','brain fog diagnosis',
        'cognitive decline brain','dementia brain','alzheimer brain',
        'parkinson brain','multiple sclerosis brain','ms brain lesion',
        'white matter lesion','leukoencephalopathy','brain calcification',
        # Research
        'brain research','neuroscience discovery','brain study','brain trial',
        'clinical trial brain','brain clinical','cns tumor','central nervous',
    ]

    # Subreddits where ALL posts are brain-relevant — no keyword filter needed
    BRAIN_SUBS = {'braintumor','glioblastoma','braincancer','neuro_oncology'}

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0',
        'Accept': 'application/json,text/html,application/xhtml+xml',
    }

    all_posts = []
    sub_counts = {}
    seen_ids = set()

    for sub in REDDIT_SUBS:
        try:
            url = f'https://www.reddit.com/r/{sub}/new.json?limit=100&raw_json=1'
            resp = req.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                continue
            posts = [c['data'] for c in resp.json().get('data',{}).get('children',[])]
            for p in posts:
                if p['id'] in seen_ids:
                    continue
                text = (p.get('title','') + ' ' + p.get('selftext','')).lower()
                is_brain_sub = sub in BRAIN_SUBS
                if is_brain_sub or any(k in text for k in KEYWORDS):
                    seen_ids.add(p['id'])
                    sub_counts[sub] = sub_counts.get(sub, 0) + 1
                    all_posts.append({
                        'id': p['id'],
                        'title': p.get('title',''),
                        'selftext': p.get('selftext','')[:500],
                        'subreddit': p.get('subreddit_display_name', sub),
                        'permalink': p.get('permalink',''),
                        'url': p.get('url',''),
                        'ups': p.get('ups', 0),
                        'num_comments': p.get('num_comments', 0),
                        'created_utc': int(p.get('created_utc', 0)),
                        'author': p.get('author','[reddit]'),
                        'source_type': 'reddit',
                    })
        except Exception as e:
            print(f'[News/Reddit] {sub}: {e}')

    RSS_FEEDS = [
        ('ScienceDaily Neurology', 'https://www.sciencedaily.com/rss/health_medicine/brain_tumors.xml'),
        ('ScienceDaily Brain', 'https://www.sciencedaily.com/rss/mind_brain.xml'),
        ('NIH News', 'https://www.nih.gov/rss/news/news.rss'),
        ('Medical News Today', 'https://www.medicalnewstoday.com/rss'),
        ('NCI Cancer', 'https://www.cancer.gov/news-events/cancer-currents-blog/feed'),
    ]

    rss_headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
    }

    for source_name, rss_url in RSS_FEEDS:
        try:
            resp = req.get(rss_url, headers=rss_headers, timeout=8)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.content)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}

            # Handle both RSS and Atom formats
            items = root.findall('.//item') or root.findall('.//atom:entry', ns)

            for item in items[:30]:
                def _t(tag):
                    el = item.find(tag) or item.find(f'atom:{tag}', ns)
                    return el.text.strip() if el is not None and el.text else ''

                title = _t('title')
                desc = _t('description') or _t('summary') or _t('content')
                link = _t('link') or _t('guid')
                pub = _t('pubDate') or _t('published') or _t('updated')

                if not title:
                    continue

                # Filter by keyword
                text = (title + ' ' + desc).lower()
                if not any(k in text for k in KEYWORDS):
                    continue

                # Parse date
                post_time = now
                try:
                    from email.utils import parsedate_to_datetime
                    from datetime import datetime, timezone
                    import re
                    # Try RFC 2822 (RSS)
                    post_time = int(parsedate_to_datetime(pub).timestamp())
                except Exception:
                    try:
                        # Try ISO 8601 (Atom)
                        from datetime import datetime
                        pub_clean = re.sub(r'\.[0-9]+', '', pub).replace('Z', '+00:00')
                        post_time = int(datetime.fromisoformat(pub_clean).timestamp())
                    except Exception:
                        post_time = now - 3600  # default 1h ago

                uid = hashlib.md5((title + link).encode()).hexdigest()[:12]
                if uid in seen_ids:
                    continue
                seen_ids.add(uid)

                # Clean HTML from description
                import re
                desc_clean = re.sub(r'<[^>]+>', '', desc).strip()[:500]

                all_posts.append({
                    'id': uid,
                    'title': title,
                    'selftext': desc_clean,
                    'subreddit': source_name,
                    'permalink': '',
                    'url': link,
                    'ups': 0,
                    'num_comments': 0,
                    'created_utc': post_time,
                    'author': source_name,
                    'source_type': 'rss',
                    'external_url': link,
                })
                sub_counts[source_name] = sub_counts.get(source_name, 0) + 1
        except Exception as e:
            print(f'[News/RSS] {source_name}: {e}')

    # Sort newest first
    all_posts.sort(key=lambda p: p['created_utc'], reverse=True)

    return JsonResponse({
        'posts': all_posts,
        'sub_counts': sub_counts,
        'fetched_at': now,
        'total': len(all_posts),
    })


def news_comments_api(request, permalink):
    import requests as req
    try:
        # permalink comes as subreddit/comments/id/slug
        url = f'https://www.reddit.com/{permalink}.json?limit=50'
        resp = req.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; BrainifyApp/1.0)',
            'Accept': 'application/json',
        }, timeout=10)
        data = resp.json()

        post_data = data[0]['data']['children'][0]['data']
        comments_raw = data[1]['data']['children']

        comments = []
        for c in comments_raw:
            if c.get('kind') != 't1':
                continue
            cd = c['data']
            body = cd.get('body','')
            if body in ('[deleted]','[removed]',''):
                continue
            comments.append({
                'author': cd.get('author',''),
                'body': body[:800],
                'ups': cd.get('ups', 0),
                'created_utc': cd.get('created_utc', 0),
            })

        return JsonResponse({
            'selftext': post_data.get('selftext','')[:2000],
            'comments': comments,
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'comments': []}, status=500)


@login_required
def chatbot_view(request):
    return render(request, 'core/chatbot.html', {'active': 'chatbot'})

@login_required
def chatbot_api(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    import json, os

    data     = json.loads(request.body)
    mode     = data.get('mode', 'research')
    messages = data.get('messages', [])
    report   = data.get('report', '').strip()

    GROQ_KEY = os.environ.get('GROQ_API_KEY', '')
    if not GROQ_KEY:
        return JsonResponse({
            'error': 'GROQ_API_KEY not set. Get a free key at console.groq.com — add it to your .env file as GROQ_API_KEY=gsk_...',
            'ok': False
        }, status=401)

    if mode == 'report':
        system_base = """You are a medical AI assistant specializing in brain MRI and radiology report interpretation for the Brainify platform.
Explain reports in clear plain English for clinicians, patients, and families.
When analyzing a report:
1. Summarize KEY FINDINGS (what was found, where, how big)
2. Explain what each finding MEANS clinically
3. Flag URGENT/concerning findings with ⚠️
4. Define all medical terminology in simple words
5. List typical NEXT STEPS the patient should take
6. Clearly note what is NORMAL vs ABNORMAL
Use headers and bullet points. Be compassionate but accurate. Always recommend consulting a physician for final decisions."""
        # Inject report directly into system prompt so it persists across ALL turns
        if report:
            system = system_base + f"""

═══════════════════════════════════════════
PATIENT REPORT (analyze this throughout the entire conversation):
═══════════════════════════════════════════
{report}
═══════════════════════════════════════════
Always refer back to this report when answering questions. The user is asking about THIS specific report."""
        else:
            system = system_base + """

No report has been pasted yet. If the user asks about their report, politely ask them to paste the report text in the text area below the chat."""
    else:
        system = """You are a specialized brain tumor and neurological research assistant for the Brainify AI radiology platform.
Deep expertise in: glioblastoma, glioma, meningioma, astrocytoma, medulloblastoma, all WHO grades, brain hemorrhage, aneurysm, stroke, hydrocephalus.
Treatments: surgery, radiation, chemotherapy, immunotherapy, clinical trials, targeted therapy.
Diagnostics: MRI sequences (FLAIR, DWI, SWI), CT, PET, biopsy, biomarkers (IDH, MGMT, EGFR, 1p/19q).
Research: 2024-2025 clinical trials, survival statistics, emerging therapies, standard of care protocols.
Provide accurate, detailed medical information with clear structure. Always note when professional consultation is needed."""

    groq_messages = [{'role': 'system', 'content': system}]
    for m in messages:
        role = 'assistant' if m['role'] == 'assistant' else 'user'
        groq_messages.append({'role': role, 'content': m['content']})

    MODELS = [
        ('llama-3.3-70b-versatile', 8192),
        ('llama-3.1-8b-instant',    8192),
        ('mixtral-8x7b-32768',      32768),
        ('gemma2-9b-it',            8192),
    ]

    last_error = ''
    for model, max_tok in MODELS:
        payload = json.dumps({
            'model': model,
            'messages': groq_messages,
            'max_tokens': min(2048, max_tok),
            'temperature': 0.4,
        }).encode('utf-8')

        try:
            import requests as req_lib
            r = req_lib.post(
                'https://api.groq.com/openai/v1/chat/completions',
                data=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {GROQ_KEY}',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Origin': 'https://console.groq.com',
                    'Referer': 'https://console.groq.com/',
                },
                timeout=30
            )
            if r.status_code == 429:
                last_error = f'rate_limit:{model}'
                continue
            if not r.ok:
                try:
                    err_msg = r.json().get('error', {}).get('message', r.text[:300])
                except Exception:
                    err_msg = r.text[:300]
                if r.status_code in (403,) or '1010' in err_msg:
                    last_error = 'cloudflare'; continue
                return JsonResponse({'error': f'Error: {err_msg}', 'ok': False}, status=500)
            reply = r.json()['choices'][0]['message']['content']
            return JsonResponse({'reply': reply, 'ok': True, 'model': model})

        except Exception as e:
            last_error = str(e)
            continue

    if 'rate_limit' in last_error:
        return JsonResponse({
            'error': '⏱ The AI is busy right now. Please wait 15 seconds and try again.',
            'ok': False, 'quota': True
        }, status=429)
    return JsonResponse({'error': last_error or 'Request failed', 'ok': False}, status=500)