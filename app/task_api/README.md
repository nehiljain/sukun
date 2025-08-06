# Task API

A REST API for executing Celery tasks with permission-based access control.

## Overview

The Task API provides a secure way for external services to trigger Celery tasks with proper authentication and authorization. It uses Django's permission system to control which users can execute which tasks.

## Key Features

- **Permission-based access**: Tasks require specific permissions to execute
- **Django integration**: Leverages existing django-celery-results for task tracking
- **REST endpoints**: Standard REST API for task execution and monitoring
- **Real-time status**: Poll task status and get results when complete

## Usage

### 1. Decorating Tasks

Add the `@api_task` decorator to your Celery tasks to make them accessible via the API:

```python
from celery import shared_task
from task_api.decorators import api_task

@api_task(['user_org.can_send_email'], 'Send verification email to user')
@shared_task(bind=True, max_retries=3)
def send_verification_email_api(self, user_id, verification_url):
    """API-accessible task for sending verification emails."""
    # Your task implementation here
    pass
```

### 2. Setting Up Permissions

Create Django permissions and assign them to users or groups:

```python
# In Django admin or programmatically
from django.contrib.auth.models import Permission, Group

# Create a permission
permission = Permission.objects.create(
    codename='can_send_email',
    name='Can send emails via API',
    content_type=ContentType.objects.get_for_model(SomeModel)
)

# Assign to a group
group = Group.objects.create(name='Email Senders')
group.permissions.add(permission)

# Add users to the group
user.groups.add(group)
```

### 3. API Endpoints

#### Execute a Task

```http
POST /api/tasks/execute/
Authorization: Token <your-token>
Content-Type: application/json

{
    "task_name": "user_org.tasks.send_verification_email_api",
    "args": [123],
    "kwargs": {"verification_url": "https://example.com/verify/abc123"}
}
```

Response:

```json
{
  "execution_id": "550e8400-e29b-41d4-a716-446655440000",
  "celery_task_id": "c8a0f0e8-1234-5678-9abc-def012345678",
  "status": "PENDING",
  "message": "Task submitted successfully"
}
```

#### Check Task Status

```http
GET /api/tasks/550e8400-e29b-41d4-a716-446655440000/
Authorization: Token <your-token>
```

Response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "task_name": "user_org.tasks.send_verification_email_api",
  "celery_task_id": "c8a0f0e8-1234-5678-9abc-def012345678",
  "status": "SUCCESS",
  "result": true,
  "args": [123],
  "kwargs": { "verification_url": "https://example.com/verify/abc123" },
  "created_at": "2024-01-01T10:00:00Z",
  "started_at": "2024-01-01T10:00:01Z",
  "completed_at": "2024-01-01T10:00:05Z",
  "duration": "0:00:04",
  "is_complete": true,
  "traceback": null
}
```

#### List Available Tasks

```http
GET /api/tasks/available/
Authorization: Token <your-token>
```

Response:

```json
[
  {
    "task_name": "user_org.tasks.send_verification_email_api",
    "description": "Send verification email to user",
    "permissions": ["user_org.can_send_email"]
  }
]
```

#### View Task History

```http
GET /api/tasks/?status=SUCCESS&page=1
Authorization: Token <your-token>
```

## Authentication

The API uses Django REST Framework's token authentication. Include your token in the Authorization header:

```
Authorization: Token <your-api-token>
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK`: Successful request
- `202 Accepted`: Task submitted successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: User lacks required permissions
- `404 Not Found`: Task or execution not found
- `500 Internal Server Error`: Server error during task execution

## Security

- All endpoints require authentication
- Tasks must be explicitly decorated with `@api_task` to be accessible
- Permission checks are enforced for each task execution
- Users can only view their own task executions

## Administration

Task executions can be viewed and managed in the Django admin interface under "Task API" → "Task executions".
