from django.apps import AppConfig


class MusicGenConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "sound_gen"

    def ready(self):
        import sound_gen.models  # noqa
