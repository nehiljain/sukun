from django.urls import path

from . import views

urlpatterns = [
    path("execute/", views.execute_task, name="execute_task"),
    path("status/<uuid:execution_id>/", views.task_status, name="task_status"),
    path("history/", views.task_history, name="task_history"),
    path("available/", views.available_tasks, name="available_tasks"),
]
