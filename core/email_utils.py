"""Email utilities for Brainify."""
import secrets
import threading
from django.core.mail import send_mail
from django.conf import settings


def generate_token():
    return secrets.token_hex(32)


def email_domain_has_mx(email):
    """Check if email domain exists and is not disposable."""
    import socket
    try:
        domain = email.split('@')[1].lower()
        socket.getaddrinfo(domain, None)
        fake_domains = {
            'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
            'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
            'spam4.me','trashmail.com','yopmail.com','fakeinbox.com','maildrop.cc',
            'dispostable.com','mailnull.com','spamgourmet.com','trashmail.me',
            'discard.email','spamfree24.org','spamhereplease.com','emailondeck.com',
        }
        if domain in fake_domains:
            return False, "Disposable email addresses are not allowed."
        return True, None
    except socket.gaierror:
        return False, f"The email domain @{email.split('@')[1]} does not exist."
    except Exception:
        return True, None


def verify_email_exists(email):
    """Try SMTP RCPT check to verify mailbox exists."""
    import socket, smtplib, subprocess
    try:
        domain = email.split('@')[1].lower()

        # Get MX record
        mx_host = None
        try:
            result = subprocess.run(
                ['nslookup', '-type=MX', domain],
                capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.splitlines():
                if 'mail exchanger' in line.lower() or 'mx' in line.lower():
                    parts = line.strip().split()
                    candidate = parts[-1].rstrip('.')
                    if '.' in candidate and not candidate[0].isdigit():
                        mx_host = candidate
                        break
        except Exception:
            pass

        if not mx_host:
            common = [f'mail.{domain}', f'smtp.{domain}', f'mx.{domain}', domain]
            for host in common:
                try:
                    socket.getaddrinfo(host, 25)
                    mx_host = host
                    break
                except Exception:
                    continue

        if not mx_host:
            return False, f"The email domain @{domain} cannot receive emails. Please use a real email."

        # SMTP RCPT check
        try:
            smtp = smtplib.SMTP(timeout=8)
            smtp.connect(mx_host, 25)
            smtp.helo('verify.brainify.ai')
            smtp.mail('noreply@brainify.ai')
            code, _ = smtp.rcpt(str(email))
            smtp.quit()
            if code == 250:
                return True, None
            elif code == 550:
                return False, f"The email address {email} does not exist. Please use a real email."
            else:
                return True, None
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected,
                socket.timeout, ConnectionRefusedError, OSError):
            return True, None
        except Exception:
            return True, None
    except Exception:
        return True, None


def _send_email(subject, message, html_message, recipient):
    """Send email in background thread."""
    def _send():
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                html_message=html_message,
                fail_silently=False,
            )
            print(f"[Brainify] Email sent to {recipient}")
        except Exception as e:
            print(f"[Brainify] Email failed to {recipient}: {e}")

    def _delayed():
        import time
        time.sleep(0.3)
        _send()

    threading.Thread(target=_delayed, daemon=True).start()


def send_verification_email(user, token):
    """Send verification email to existing user."""
    verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}/"
    subject = "Verify your Brainify account"
    name = user.first_name or user.username

    message = f"Hello {name},\n\nVerify your Brainify account:\n{verify_url}\n\nLink expires in 24 hours.\n\n— Brainify Team"

    html_message = f"""<!DOCTYPE html>
<html><body style="font-family:'Segoe UI',sans-serif;background:#0f172a;color:#f8fafc;padding:40px;margin:0;">
<div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:20px;padding:40px;border:1px solid #334155;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="width:64px;height:64px;background:linear-gradient(135deg,#2b6cee,#1d4ed8);border-radius:16px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:30px;">🧠</span>
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#f8fafc;">Welcome to Brainify</h1>
  </div>
  <p style="color:#cbd5e1;line-height:1.7;">Hello <strong>{name}</strong>,<br><br>Click below to verify your email and activate your account.</p>
  <div style="text-align:center;margin:28px 0;">
    <a href="{verify_url}" style="display:inline-block;padding:15px 44px;background:#2b6cee;color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
      Verify Email Address
    </a>
  </div>
  <p style="color:#64748b;font-size:12px;text-align:center;">Expires in 24 hours. If you didn't sign up, ignore this.</p>
  <hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
  <p style="color:#475569;font-size:11px;text-align:center;margin:0;">© 2026 Brainify Medical Imaging Platform</p>
</div>
</body></html>"""

    _send_email(subject, message, html_message, user.email)
    return True


def send_pending_verification_email(first_name, email, token):
    """Send verification email for pending signup (user not created yet)."""
    verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}/"
    subject = "Verify your Brainify account"

    message = f"Hello {first_name},\n\nVerify your email to create your Brainify account:\n{verify_url}\n\nLink expires in 24 hours.\n\n— Brainify Team"

    html_message = f"""<!DOCTYPE html>
<html><body style="font-family:'Segoe UI',sans-serif;background:#0f172a;color:#f8fafc;padding:40px;margin:0;">
<div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:20px;padding:40px;border:1px solid #334155;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="width:64px;height:64px;background:linear-gradient(135deg,#2b6cee,#1d4ed8);border-radius:16px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:30px;">🧠</span>
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#f8fafc;">Welcome to Brainify</h1>
    <p style="color:#64748b;margin-top:6px;font-size:13px;">AI-Powered Brain MRI Segmentation</p>
  </div>
  <p style="color:#cbd5e1;line-height:1.7;">Hello <strong style="color:#f8fafc;">{first_name}</strong>,<br><br>Click below to verify your email and create your account. Your account is only created after verification.</p>
  <div style="text-align:center;margin:28px 0;">
    <a href="{verify_url}" style="display:inline-block;padding:15px 44px;background:#2b6cee;color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 4px 20px rgba(43,108,238,0.4);">
      Verify Email &amp; Create Account
    </a>
  </div>
  <p style="color:#64748b;font-size:12px;text-align:center;">Expires in 24 hours. If you didn't sign up for Brainify, ignore this email.</p>
  <hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
  <p style="color:#475569;font-size:11px;text-align:center;margin:0;">© 2026 Brainify Medical Imaging Platform</p>
</div>
</body></html>"""

    _send_email(subject, message, html_message, email)
    return True


def send_scan_complete_email(user, scan, result):
    """Notify user when scan analysis is complete."""
    subject = f"Brainify: Scan analysis complete — {scan.patient_name}"
    severity_emoji = {
        'normal': '✅', 'mild': 'ℹ️', 'moderate': '⚠️',
        'severe': '🔴', 'critical': '🚨'
    }.get(result.severity, '📊')

    message = f"""Hello {user.first_name or user.username},

Your MRI scan analysis for {scan.patient_name} is complete.

Result: {severity_emoji} {result.classification}
Confidence: {result.confidence_score:.1f}%
Severity: {result.severity.upper()}
Dice Score: {result.dice_score:.4f}

View full report: {settings.FRONTEND_URL}/analysis/{scan.id}/

— Brainify AI Platform"""

    _send_email(subject, message, None, user.email)
