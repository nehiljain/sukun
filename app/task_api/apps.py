import importlib
import logging

from django.apps import AppConfig, apps

logger = logging.getLogger(__name__)


class TaskApiConfig(AppConfig):
    name = "task_api"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        """Register tasks when the app is ready."""
        # Import signals to ensure they're loaded
        from . import signals  # noqa

        # Also register tasks immediately during startup
        self.register_api_tasks()

    def register_api_tasks(self):
        """Import all task modules to trigger @api_task decorator registration."""
        from .decorators import TaskRegistry

        logger.info("Starting task registration by importing task modules...")

        # Import all Django apps to trigger decorator registration
        for app_config in apps.get_app_configs():
            try:
                # Try to import tasks module from each app
                tasks_module_name = f"{app_config.name}.tasks"
                importlib.import_module(tasks_module_name)
                logger.info(f"Imported {tasks_module_name}")

            except ImportError:
                # No tasks module in this app, skip silently
                logger.debug(f"No tasks module found in {app_config.name}")
                continue
            except Exception as e:
                logger.exception(f"Error importing tasks from {app_config.name}: {e}")
                continue

        # Log final registry state
        all_tasks = TaskRegistry.get_all_tasks()
        logger.info(
            f"Task registration complete. Found {len(all_tasks)} registered tasks."
        )
        for task_name, task_info in all_tasks.items():
            logger.info(f"  - {task_name}: task_func={task_info['task_func']}")
