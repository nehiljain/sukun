import logging
from pathlib import Path

from celery import shared_task
from common.email import send_email
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, name="releases.send_user_sign_up_email")
def send_user_sign_up_email(self, user_id, verification_url):
    try:
        from releases.models import AppUser

        app_user = AppUser.objects.get(user__id=user_id)
        template_path = (
            Path(settings.BASE_DIR)
            / "releases"
            / "templates"
            / "email"
            / "verification_email.html"
        )
        context = {
            "name": app_user.name,
            "verification_url": verification_url,
        }

        params = {
            "from": "no-reply <noreply@demodrive.tech>",
            "to": [app_user.user.email],
            "subject": "Verify your DemoDrive account",
        }

        send_email(context, template_path, params)
        app_user.verification_sent_at = timezone.now()
        app_user.save()
        return True
    except Exception as e:
        logger.exception(f"Error sending verification email: {e}")
        self.retry(exc=e, countdown=60)
        return False
