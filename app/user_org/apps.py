from django.apps import AppConfig


class UserOrgConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "user_org"

    def ready(self):
        import user_org.models  # noqa
