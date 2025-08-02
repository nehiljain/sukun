import resend
import os
from django.core.management.base import BaseCommand
from django.template import Template, Context
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path

# Get the current directory path
CURRENT_DIR = Path(__file__).resolve().parent


class Command(BaseCommand):
    help = "Sends an email using Resend API"

    def add_arguments(self, parser):
        # Basic email params
        parser.add_argument(
            "--to-username", nargs="+", help="List of email recipients usernames"
        )
        parser.add_argument("--to-emails", nargs="+", help="List of email recipients")
        parser.add_argument(
            "--cc-emails",
            nargs="+",
            help="List of email recipients to be added to the CC field",
        )
        parser.add_argument("--date", help="Report date in YYYY-MM-DD format")

        # Template selection
        parser.add_argument(
            "--template-name",
            help="Name of the email template to use",
            default="report.html",
            choices=["report.html", "sign-up-email.html"],
        )

        # Report template specific params
        parser.add_argument("--report-url", help="Report URL to include in email")
        parser.add_argument(
            "--product-name",
            help="Product name to include in email",
            default="Documentation",
        )
        parser.add_argument(
            "--email-text",
            help="Custom email body text",
            default="Here is your weekly documentation quality report.",
        )

        # Sign-up template specific params
        parser.add_argument(
            "--payment-link",
            help="Payment link for sign-up template",
        )
        parser.add_argument(
            "--plan-name",
            help="Plan name for sign-up template",
            default="Pro Plan",
        )
        parser.add_argument(
            "--plan-price",
            help="Plan price for sign-up template",
            default="$50/month",
        )
        parser.add_argument(
            "--promo-code",
            help="Promo code for sign-up template",
            default="WELCOME",
        )

    def handle(self, *args, **options):
        load_dotenv()
        resend.api_key = os.getenv("RESEND_API_KEY")

        to_emails = options["to_emails"]
        cc_emails = options["cc_emails"]
        to_username = options.get("to_username", ["there"])[0]
        template_name = options["template_name"]

        # Prepare context based on template type
        if template_name == "sign-up-email.html":
            context = {
                "username": to_username,
                "paymentLink": options["payment_link"],
                "planName": options["plan_name"],
                "planPrice": options["plan_price"],
                "promoCode": options["promo_code"],
            }
            print(context)
            subject = "DemoDrive sign-up link for DAGWorks"
        else:  # report.html
            date_str = options.get("date", "2024-12-16")
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
                formatted_date = date.strftime("%m/%d")
                subject = f"DemoDrive: Your weekly report {formatted_date}"
            except ValueError:
                self.stderr.write(
                    self.style.ERROR("Invalid date format. Use YYYY-MM-DD")
                )
                return
            context = {
                "report_url": options["report_url"]
                or "https://app.demodrive.tech/reports/default",
                "product_name": options["product_name"],
                "to_username": to_username,
                "email_text": options["email_text"],
            }

        try:
            # Read the template file directly from the email_static_files directory
            template_path = CURRENT_DIR / "email_static_files" / template_name
            with open(template_path, "r") as template_file:
                template_content = template_file.read()
                template = Template(template_content)
                html_body = template.render(Context(context))

            params = {
                "from": "Demodrive AI <founders@demodrive.tech>",
                "to": to_emails,
                "cc": cc_emails,
                "subject": subject,
                "html": html_body,
            }

            email = resend.Emails.send(params)
            self.stdout.write(self.style.SUCCESS(f"Successfully sent email: {email}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to send email: {str(e)}"))
