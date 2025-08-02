import logging
import os

import resend
from django.template import Template
from django.template.context import Context

logger = logging.getLogger(__name__)


class SendEmailException(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


def send_email(template_context, template_path, payload: resend.Emails.SendParams):
    resend.api_key = os.environ.get("RESEND_API_KEY")
    if not resend.api_key:
        logger.error("RESEND_API_KEY not found in environment variables")
        raise SendEmailException("RESEND_API_KEY not found in environment variables")

    if not template_path.exists():
        logger.error(f"Email template not found at {template_path}")
        raise SendEmailException(f"Email template not found at {template_path}")

    try:
        with open(template_path, "r") as template_file:
            template_content = template_file.read()
            template = Template(template_content)
            html_body = template.render(Context(template_context))
    except Exception as e:
        logger.error(f"Error rendering email template: {str(e)}")
        raise SendEmailException(f"Error rendering email template: {str(e)}") from e

    payload["html"] = html_body

    try:
        email = resend.Emails.send(payload)
        logger.info(f"Email sent successfully: {email}")
        return email
    except Exception as e:
        logger.error(f"Error sending email via Resend: {str(e)}")
        raise SendEmailException(f"Error sending email via Resend: {str(e)}") from e
