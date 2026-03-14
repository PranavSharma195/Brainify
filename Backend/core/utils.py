import secrets, string
def generate_token(n=48):
    return ''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(n))

def get_client_ip(request):
    x = request.META.get('HTTP_X_FORWARDED_FOR')
    return x.split(',')[0].strip() if x else request.META.get('REMOTE_ADDR')

def send_verification_email(request, user, token):
    from django.core.mail import send_mail
    from django.conf import settings
    link = request.build_absolute_uri(f'/verify-email/{token}/')
    body = f"""Hello {user.first_name},

Welcome to Brainify — AI Brain MRI Platform!

Please verify your email address:
{link}

This link expires in 24 hours. If you didn't create an account, ignore this email.

— The Brainify Team
"""
    try:
        send_mail('Verify your Brainify account', body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
    except Exception:
        pass
