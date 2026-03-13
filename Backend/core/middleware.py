from django.utils.deprecation import MiddlewareMixin


class LoginHistoryMiddleware(MiddlewareMixin):
    """Records successful logins in LoginHistory."""

    def process_request(self, request):
        pass  # tracking done in login_view directly

    @staticmethod
    def get_client_ip(request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
