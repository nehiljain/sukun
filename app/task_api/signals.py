import importlib
import inspect
import logging

from django.apps import apps
from django.db.models.signals import post_migrate
from django.dispatch import receiver

from .decorators import TaskRegistry

logger = logging.getLogger(__name__)


@receiver(post_migrate)
def register_api_tasks(sender, **kwargs):
    """Discover and register all tasks decorated with @api_task."""
    if sender.name != "task_api":
        return
    # Import all Django apps to discover decorated tasks
    for app_config in apps.get_app_configs():
        try:
            # Try to import tasks module from each app
            tasks_module_name = f"{app_config.name}.tasks"
            tasks_module = importlib.import_module(tasks_module_name)

            # Look for functions with the api_task decorator
            for name, obj in inspect.getmembers(tasks_module):
                if inspect.isfunction(obj) and hasattr(obj, "_api_task_permissions"):
                    # This is a decorated task, register it
                    task_name = f"{tasks_module_name}.{name}"

                    # Check if it's also a Celery task
                    if hasattr(obj, "delay"):
                        TaskRegistry.set_task_function(task_name, obj)
                        logger.info(f"Registered API task: {task_name}, object: {obj}")

        except ImportError:
            # No tasks module in this app, skip
            continue
        except Exception as e:
            logger.exception(f"Error registering tasks from {app_config.name}: {e}")
            continue
