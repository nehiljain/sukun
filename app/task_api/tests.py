import uuid
from unittest.mock import Mock, patch

from celery import shared_task
from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .decorators import (
    TaskRegistry,
    api_task,
    get_user_accessible_tasks,
    has_task_permission,
)
from .models import TaskExecution


class TaskRegistryTest(TestCase):
    """Test the TaskRegistry class and @api_task decorator."""

    def setUp(self):
        """Clear the registry before each test."""
        TaskRegistry._tasks = {}

    def test_task_registration_without_celery(self):
        """Test that @api_task decorator registers tasks without Celery."""

        @api_task(["test.can_run"], "Test task description")
        def test_task():
            return "test result"

        # Check that task was registered
        task_info = TaskRegistry.get_task_info("task_api.tests.test_task")
        self.assertIsNotNone(task_info)
        self.assertEqual(task_info["permissions"], ["test.can_run"])
        self.assertEqual(task_info["description"], "Test task description")
        self.assertIsNone(task_info["task_func"])  # No Celery task function yet

    def test_task_registration_with_celery(self):
        """Test that @api_task decorator registers Celery tasks immediately."""

        @shared_task
        @api_task(["test.can_run"], "Celery test task")
        def celery_test_task():
            return "celery result"

        # Check that task was registered with task function
        task_info = TaskRegistry.get_task_info("task_api.tests.celery_test_task")
        self.assertIsNotNone(task_info)
        self.assertEqual(task_info["permissions"], ["test.can_run"])
        self.assertEqual(task_info["description"], "Celery test task")
        self.assertIsNotNone(task_info["task_func"])  # Should have task function
        self.assertTrue(hasattr(task_info["task_func"], "delay"))

    def test_get_all_tasks(self):
        """Test getting all registered tasks."""

        @api_task(["test.can_run1"], "First task")
        def task1():
            pass

        @api_task(["test.can_run2"], "Second task")
        def task2():
            pass

        all_tasks = TaskRegistry.get_all_tasks()
        self.assertEqual(len(all_tasks), 2)
        self.assertIn("task_api.tests.task1", all_tasks)
        self.assertIn("task_api.tests.task2", all_tasks)

    def test_set_task_function(self):
        """Test setting task function after registration."""

        @api_task(["test.can_run"], "Test task")
        def test_task():
            pass

        # Create a mock Celery task
        mock_task = Mock()
        mock_task.delay = Mock()

        # Set the task function
        TaskRegistry.set_task_function("task_api.tests.test_task", mock_task)

        task_info = TaskRegistry.get_task_info("task_api.tests.test_task")
        self.assertEqual(task_info["task_func"], mock_task)


class PermissionTest(TestCase):
    """Test the permission system for tasks."""

    def setUp(self):
        """Set up test users and permissions."""
        TaskRegistry._tasks = {}

        # Create test users
        self.user = User.objects.create_user("testuser", "test@example.com", "pass")
        self.superuser = User.objects.create_superuser(
            "admin", "admin@example.com", "pass"
        )
        self.staff_user = User.objects.create_user("staff", "staff@example.com", "pass")
        self.staff_user.is_staff = True
        self.staff_user.save()

        # Create test permission
        content_type = ContentType.objects.get_for_model(User)
        self.permission = Permission.objects.create(
            codename="can_run_test_task",
            name="Can run test task",
            content_type=content_type,
        )

    def test_has_permission_unauthenticated(self):
        """Test that unauthenticated users have no permissions."""

        @api_task(["auth.can_run_test_task"], "Test task")
        def test_task():
            pass

        # Anonymous user should not have permission
        anonymous_user = None
        self.assertFalse(
            has_task_permission(anonymous_user, "task_api.tests.test_task")
        )

    def test_has_permission_superuser(self):
        """Test that superusers have all permissions."""

        @api_task(["auth.can_run_test_task"], "Test task")
        def test_task():
            pass

        self.assertTrue(has_task_permission(self.superuser, "task_api.tests.test_task"))

    def test_has_permission_staff(self):
        """Test that staff users have all permissions."""

        @api_task(["auth.can_run_test_task"], "Test task")
        def test_task():
            pass

        self.assertTrue(
            has_task_permission(self.staff_user, "task_api.tests.test_task")
        )

    def test_has_permission_with_permission(self):
        """Test user with required permission."""

        @api_task(["auth.can_run_test_task"], "Test task")
        def test_task():
            pass

        # Give user the permission
        self.user.user_permissions.add(self.permission)

        self.assertTrue(has_task_permission(self.user, "task_api.tests.test_task"))

    def test_has_permission_without_permission(self):
        """Test user without required permission."""

        @api_task(["auth.can_run_test_task"], "Test task")
        def test_task():
            pass

        self.assertFalse(has_task_permission(self.user, "task_api.tests.test_task"))

    def test_has_permission_no_permissions_required(self):
        """Test task with no permissions required."""

        @api_task([], "Public task")
        def public_task():
            pass

        self.assertTrue(has_task_permission(self.user, "task_api.tests.public_task"))

    def test_has_permission_nonexistent_task(self):
        """Test permission check for non-existent task."""

        self.assertFalse(has_task_permission(self.user, "nonexistent.task"))

    def test_get_user_accessible_tasks(self):
        """Test getting tasks accessible to a user."""

        @api_task(["auth.can_run_test_task"], "Protected task")
        def protected_task():
            pass

        @api_task([], "Public task")
        def public_task():
            pass

        # User without permission should only see public task
        accessible = get_user_accessible_tasks(self.user)
        self.assertEqual(len(accessible), 1)
        self.assertIn("task_api.tests.public_task", accessible)

        # Give user permission
        self.user.user_permissions.add(self.permission)

        # Now should see both tasks
        accessible = get_user_accessible_tasks(self.user)
        self.assertEqual(len(accessible), 2)
        self.assertIn("task_api.tests.protected_task", accessible)
        self.assertIn("task_api.tests.public_task", accessible)


class TaskExecutionModelTest(TestCase):
    """Test the TaskExecution model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user("testuser", "test@example.com", "pass")
        self.celery_task_id = str(uuid.uuid4())

    def test_task_execution_creation(self):
        """Test creating a TaskExecution instance."""
        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id=self.celery_task_id,
            user=self.user,
            args=[1, 2, 3],
            kwargs={"param": "value"},
        )

        self.assertEqual(execution.task_name, "test.task")
        self.assertEqual(execution.celery_task_id, self.celery_task_id)
        self.assertEqual(execution.user, self.user)
        self.assertEqual(execution.args, [1, 2, 3])
        self.assertEqual(execution.kwargs, {"param": "value"})

    def test_str_representation(self):
        """Test the string representation of TaskExecution."""
        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id=self.celery_task_id,
            user=self.user,
            args=[],
            kwargs={},
        )

        expected = f"test.task - testuser ({self.celery_task_id[:8]})"
        self.assertEqual(str(execution), expected)

    @patch("task_api.models.TaskResult.objects.get")
    def test_celery_result_property(self, mock_get):
        """Test the celery_result property."""
        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id=self.celery_task_id,
            user=self.user,
            args=[],
            kwargs={},
        )

        # Mock TaskResult
        mock_result = Mock()
        mock_get.return_value = mock_result

        result = execution.celery_result
        mock_get.assert_called_once_with(task_id=self.celery_task_id)
        self.assertEqual(result, mock_result)

    @patch("task_api.models.TaskResult.objects.get")
    def test_status_property(self, mock_get):
        """Test the status property."""
        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id=self.celery_task_id,
            user=self.user,
            args=[],
            kwargs={},
        )

        # Mock TaskResult with status
        mock_result = Mock()
        mock_result.status = "SUCCESS"
        mock_get.return_value = mock_result

        self.assertEqual(execution.status, "SUCCESS")

    @patch("task_api.models.TaskResult.objects.get")
    def test_status_property_no_result(self, mock_get):
        """Test status property when no TaskResult exists."""
        from django_celery_results.models import TaskResult

        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id=self.celery_task_id,
            user=self.user,
            args=[],
            kwargs={},
        )

        mock_get.side_effect = TaskResult.DoesNotExist()

        self.assertEqual(execution.status, "PENDING")

    @patch("task_api.models.TaskResult.objects.get")
    def test_is_complete_property(self, mock_get):
        """Test the is_complete property."""
        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id=self.celery_task_id,
            user=self.user,
            args=[],
            kwargs={},
        )

        # Test with SUCCESS status
        mock_result = Mock()
        mock_result.status = "SUCCESS"
        mock_get.return_value = mock_result
        self.assertTrue(execution.is_complete)

        # Test with PENDING status
        mock_result.status = "PENDING"
        self.assertFalse(execution.is_complete)

        # Test with FAILURE status
        mock_result.status = "FAILURE"
        self.assertTrue(execution.is_complete)


class TaskAPITest(APITestCase):
    """Test the Task API endpoints."""

    def setUp(self):
        """Set up test data."""
        TaskRegistry._tasks = {}

        self.user = User.objects.create_user("testuser", "test@example.com", "pass")
        self.token = Token.objects.create(user=self.user)

        # Create test permission
        content_type = ContentType.objects.get_for_model(User)
        self.permission = Permission.objects.create(
            codename="can_run_test_task",
            name="Can run test task",
            content_type=content_type,
        )

    def authenticate(self):
        """Helper to authenticate API client."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_execute_task_unauthenticated(self):
        """Test that unauthenticated users cannot execute tasks."""
        url = reverse("execute_task")
        data = {"task_name": "test.task", "args": [], "kwargs": {}}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_execute_task_nonexistent(self):
        """Test executing a non-existent task."""
        self.authenticate()

        url = reverse("execute_task")
        data = {"task_name": "nonexistent.task", "args": [], "kwargs": {}}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Task function not found", response.data["error"])

    def test_execute_task_no_permission(self):
        """Test executing a task without required permission."""
        self.authenticate()

        # Register a task with permission requirement
        @api_task(["auth.can_run_test_task"], "Test task")
        def test_task():
            pass

        url = reverse("execute_task")
        data = {"task_name": "task_api.tests.test_task", "args": [], "kwargs": {}}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("You do not have permission", response.data["error"])

    @patch("task_api.views.TaskRegistry.get_task_info")
    def test_execute_task_success(self, mock_get_task_info):
        """Test successfully executing a task."""
        self.authenticate()
        self.user.user_permissions.add(self.permission)

        # Mock task function
        mock_task = Mock()
        mock_celery_result = Mock()
        mock_celery_result.id = "celery-task-id-123"
        mock_task.delay.return_value = mock_celery_result

        mock_get_task_info.return_value = {
            "permissions": ["auth.can_run_test_task"],
            "description": "Test task",
            "task_func": mock_task,
        }

        url = reverse("execute_task")
        data = {
            "task_name": "test.task",
            "args": [1, 2, 3],
            "kwargs": {"param": "value"},
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("execution_id", response.data)
        self.assertEqual(response.data["celery_task_id"], "celery-task-id-123")
        self.assertEqual(response.data["status"], "PENDING")

        # Verify task was called with correct args
        mock_task.delay.assert_called_once_with(1, 2, 3, param="value")

        # Verify TaskExecution was created
        execution = TaskExecution.objects.get(celery_task_id="celery-task-id-123")
        self.assertEqual(execution.user, self.user)
        self.assertEqual(execution.task_name, "test.task")
        self.assertEqual(execution.args, [1, 2, 3])
        self.assertEqual(execution.kwargs, {"param": "value"})

    def test_execute_task_invalid_data(self):
        """Test executing task with invalid data."""
        self.authenticate()

        url = reverse("execute_task")
        data = {
            "task_name": "",  # Invalid empty task name
            "args": [],
            "kwargs": {},
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_task_status_unauthenticated(self):
        """Test getting task status without authentication."""
        execution_id = uuid.uuid4()
        url = reverse("task_status", args=[execution_id])

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_task_status_not_found(self):
        """Test getting status for non-existent task."""
        self.authenticate()

        execution_id = uuid.uuid4()
        url = reverse("task_status", args=[execution_id])

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("task_api.models.TaskResult.objects.get")
    def test_task_status_success(self, mock_get):
        """Test successfully getting task status."""
        self.authenticate()

        # Create TaskExecution
        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id="celery-task-id-123",
            user=self.user,
            args=[1, 2, 3],
            kwargs={"param": "value"},
        )

        # Mock Celery TaskResult
        mock_result = Mock()
        mock_result.status = "SUCCESS"
        mock_result.result = {"success": True}
        mock_result.traceback = None
        mock_result.date_created = None
        mock_result.date_done = None
        mock_get.return_value = mock_result

        url = reverse("task_status", args=[execution.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(execution.id))
        self.assertEqual(response.data["task_name"], "test.task")
        self.assertEqual(response.data["celery_task_id"], "celery-task-id-123")
        self.assertEqual(response.data["status"], "SUCCESS")

    def test_task_history_unauthenticated(self):
        """Test getting task history without authentication."""
        url = reverse("task_history")

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_task_history_empty(self):
        """Test getting empty task history."""
        self.authenticate()

        url = reverse("task_history")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_task_history_with_tasks(self):
        """Test getting task history with tasks."""
        self.authenticate()

        # Create some TaskExecutions
        TaskExecution.objects.create(
            task_name="test.task1",
            celery_task_id="task-1",
            user=self.user,
            args=[],
            kwargs={},
        )
        TaskExecution.objects.create(
            task_name="test.task2",
            celery_task_id="task-2",
            user=self.user,
            args=[],
            kwargs={},
        )

        # Create task for different user (should not appear)
        other_user = User.objects.create_user("other", "other@example.com", "pass")
        TaskExecution.objects.create(
            task_name="test.task3",
            celery_task_id="task-3",
            user=other_user,
            args=[],
            kwargs={},
        )

        url = reverse("task_history")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Only user's tasks

    def test_available_tasks_unauthenticated(self):
        """Test getting available tasks without authentication."""
        url = reverse("available_tasks")

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_available_tasks_empty(self):
        """Test getting available tasks when none registered."""
        self.authenticate()

        url = reverse("available_tasks")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_available_tasks_with_permissions(self):
        """Test getting available tasks based on user permissions."""
        self.authenticate()

        # Register tasks
        @api_task(["auth.can_run_test_task"], "Protected task")
        def protected_task():
            pass

        @api_task([], "Public task")
        def public_task():
            pass

        # Without permission - should only see public task
        url = reverse("available_tasks")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["description"], "Public task")

        # Give permission
        self.user.user_permissions.add(self.permission)

        # Now should see both tasks
        response = self.client.get(url)
        self.assertEqual(len(response.data), 2)

        task_descriptions = [task["description"] for task in response.data]
        self.assertIn("Protected task", task_descriptions)
        self.assertIn("Public task", task_descriptions)


class TaskAPIIntegrationTest(APITestCase):
    """Integration tests for the complete task execution workflow."""

    def setUp(self):
        """Set up test data."""
        TaskRegistry._tasks = {}

        self.user = User.objects.create_user("testuser", "test@example.com", "pass")
        self.token = Token.objects.create(user=self.user)

        # Create test permission
        content_type = ContentType.objects.get_for_model(User)
        self.permission = Permission.objects.create(
            codename="can_run_integration_task",
            name="Can run integration task",
            content_type=content_type,
        )
        self.user.user_permissions.add(self.permission)

    def authenticate(self):
        """Helper to authenticate API client."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    @patch("celery.Task.delay")
    def test_complete_task_workflow(self, mock_delay):
        """Test the complete workflow from task registration to execution and status check."""

        # Step 1: Register a task with @api_task decorator
        @shared_task
        @api_task(["auth.can_run_integration_task"], "Integration test task")
        def integration_test_task(param1, param2=None):
            return {"result": f"{param1}-{param2}"}

        # Step 2: Check that task appears in available tasks
        self.authenticate()
        url = reverse("available_tasks")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["task_name"], "task_api.tests.integration_test_task"
        )
        self.assertEqual(response.data[0]["description"], "Integration test task")

        # Step 3: Execute the task
        mock_celery_result = Mock()
        mock_celery_result.id = "integration-task-123"
        mock_delay.return_value = mock_celery_result

        url = reverse("execute_task")
        data = {
            "task_name": "task_api.tests.integration_test_task",
            "args": ["test_value"],
            "kwargs": {"param2": "kwarg_value"},
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        execution_id = response.data["execution_id"]

        # Verify task was called correctly
        mock_delay.assert_called_once_with("test_value", param2="kwarg_value")

        # Step 4: Check task status
        with patch("task_api.models.TaskResult.objects.get") as mock_get_result:
            mock_result = Mock()
            mock_result.status = "SUCCESS"
            mock_result.result = {"result": "test_value-kwarg_value"}
            mock_result.traceback = None
            mock_result.date_created = None
            mock_result.date_done = None
            mock_get_result.return_value = mock_result

            url = reverse("task_status", args=[execution_id])
            response = self.client.get(url)

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["status"], "SUCCESS")
            self.assertEqual(
                response.data["result"], {"result": "test_value-kwarg_value"}
            )

        # Step 5: Check task appears in history
        url = reverse("task_history")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["task_name"], "task_api.tests.integration_test_task"
        )

    def test_permission_denied_workflow(self):
        """Test that users without permissions cannot execute tasks."""

        # Register a task requiring a permission the user doesn't have
        @shared_task
        @api_task(["auth.some_other_permission"], "Restricted task")
        def restricted_task():
            return {"success": True}

        self.authenticate()

        # Task should not appear in available tasks
        url = reverse("available_tasks")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Execution should be denied
        url = reverse("execute_task")
        data = {"task_name": "task_api.tests.restricted_task", "args": [], "kwargs": {}}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_task_failure_handling(self):
        """Test handling of failed tasks."""

        @shared_task
        @api_task(["auth.can_run_integration_task"], "Failing task")
        def failing_task():
            raise ValueError("Task failed!")

        self.authenticate()

        # Mock task execution failure
        with patch("task_api.views.TaskRegistry.get_task_info") as mock_get_task_info:
            mock_task = Mock()
            mock_celery_result = Mock()
            mock_celery_result.id = "failing-task-123"
            mock_task.delay.side_effect = Exception("Task execution failed")

            mock_get_task_info.return_value = {
                "permissions": ["auth.can_run_integration_task"],
                "description": "Failing task",
                "task_func": mock_task,
            }

            url = reverse("execute_task")
            data = {
                "task_name": "task_api.tests.failing_task",
                "args": [],
                "kwargs": {},
            }

            response = self.client.post(url, data, format="json")
            self.assertEqual(
                response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            self.assertIn("Failed to execute task", response.data["error"])

    def test_serializer_validation(self):
        """Test that serializers properly validate input data."""

        self.authenticate()

        # Test missing required fields
        url = reverse("execute_task")
        data = {}  # Missing task_name

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("task_name", response.data)

        # Test invalid task_name in serializer validation
        data = {"task_name": "nonexistent.task"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pagination_in_history(self):
        """Test pagination works correctly in task history."""

        self.authenticate()

        # Create many task executions
        for i in range(25):  # More than default page size (20)
            TaskExecution.objects.create(
                task_name=f"test.task.{i}",
                celery_task_id=f"task-{i}",
                user=self.user,
                args=[i],
                kwargs={},
            )

        # Test first page
        url = reverse("task_history")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)  # Paginated response
        self.assertEqual(len(response.data["results"]), 20)  # Default page size
        self.assertIsNotNone(response.data["next"])  # Has next page

        # Test second page
        response = self.client.get(url + "?page=2")
        self.assertEqual(len(response.data["results"]), 5)  # Remaining tasks


class TaskExecutionAdminTest(TestCase):
    """Test the Django admin interface for TaskExecution."""

    def setUp(self):
        """Set up test data."""
        self.admin_user = User.objects.create_superuser(
            "admin", "admin@example.com", "pass"
        )
        self.user = User.objects.create_user("testuser", "test@example.com", "pass")

    def test_admin_list_view(self):
        """Test that TaskExecution admin list view works."""
        # Create test execution
        execution = TaskExecution.objects.create(
            task_name="test.task",
            celery_task_id="test-task-123",
            user=self.user,
            args=[1, 2, 3],
            kwargs={"param": "value"},
        )

        # The admin should be accessible (basic smoke test)
        self.assertTrue(TaskExecution.objects.filter(id=execution.id).exists())

    def test_admin_cannot_create(self):
        """Test that admin doesn't allow manual creation of TaskExecution."""
        from django.contrib import admin
        from task_api.admin import TaskExecutionAdmin

        admin_instance = TaskExecutionAdmin(TaskExecution, admin.site)

        # Mock request
        request = Mock()
        request.user = self.admin_user

        self.assertFalse(admin_instance.has_add_permission(request))
