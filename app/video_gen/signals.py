from django.dispatch import Signal, receiver
from video_gen.tasks import send_admin_email_for_project

project_created = Signal()  # Args: project_id

project_updated = Signal()  # Args: project_id


@receiver(project_created)
def notify_admin_project_created(sender, **kwargs):
    project_id = kwargs.get("project_id")
    send_admin_email_for_project.delay(project_id, "Project Created")


@receiver(project_updated)
def notify_admin_project_updated(sender, **kwargs):
    project_id = kwargs.get("project_id")
    send_admin_email_for_project.delay(project_id, "Project Updated")


# @receiver(project_updated)
# @receiver(project_created)
# def test_signal(sender, **kwargs):
#     print("test signal:", sender, kwargs)
