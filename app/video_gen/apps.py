from django.apps import AppConfig


class VideoGenConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "video_gen"

    def ready(self):
        import video_gen.models  # noqa
        import video_gen.signals  # noqa
