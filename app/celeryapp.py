import os

from celery import Celery

# Set the default Django settings module - use correct path to settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

app = Celery("app")

# Use Django settings for Celery
app.config_from_object("django.conf:settings", namespace="CELERY")
# Auto-discover tasks from installed apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
