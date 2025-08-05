import uuid
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from user_org.models import AppUser
from rest_framework import status
from rest_framework.test import APIClient
from user_org.models import AnonymousSession, Organization, Workspace
from video_gen.models import AspectRatio, VideoProject
from video_gen.services.video_project_service import ChatMessage


class VideoProjectViewSetTests(TestCase):
    def setUp(self):
        # Create test users
        self.client = APIClient()

        # Create regular user with organization
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword",  # pragma: allowlist secret
        )
        self.appuser = AppUser.objects.create(user=self.user)
        self.org = Organization.objects.create(name="Test Org", created_by=self.appuser)
        self.appuser.active_org = self.org
        self.appuser.save()

        # Create a workspace for the user's organization
        self.workspace = Workspace.objects.create(
            name="Test Workspace", organization=self.org, user=self.appuser
        )

        # Create staff user
        self.staff_user = User.objects.create_user(
            username="staffuser",
            password="staffpassword",  # pragma: allowlist secret
            is_staff=True,
        )
        self.staff_appuser = AppUser.objects.create(user=self.staff_user)
        self.staff_appuser.active_org = self.org
        self.staff_appuser.save()

        # Create anonymous organization
        self.anonymous_user = User.objects.create_user(
            username="anonymoususer",
            password="anonymouspassword",  # pragma: allowlist secret
        )
        self.anonymous_appuser = AppUser.objects.create(user=self.anonymous_user)
        self.anonymous_org = Organization.objects.create(
            name="Anonymous", created_by=self.anonymous_appuser
        )

        # Fix anonymous workspace
        self.anonymous_workspace = Workspace.objects.create(
            name="Anonymous",
            organization=self.anonymous_org,
            user=self.anonymous_appuser,
        )

        # Create test video projects
        self.private_project = VideoProject.objects.create(
            name="Private Project",
            description="Test Private Project",
            status=VideoProject.Status.DRAFT,
            aspect_ratio=AspectRatio.LANDSCAPE,
            org=self.org,
            workspace=self.workspace,
            is_public=False,
        )

        self.public_project = VideoProject.objects.create(
            name="Public Project",
            description="Test Public Project",
            status=VideoProject.Status.DRAFT,
            aspect_ratio=AspectRatio.PORTRAIT,
            org=self.org,
            workspace=self.workspace,
            is_public=True,
        )

        # URLs
        self.list_url = reverse("videos-projects-list")
        self.private_detail_url = reverse(
            "videos-projects-detail", kwargs={"pk": self.private_project.id}
        )
        self.public_detail_url = reverse(
            "videos-projects-detail", kwargs={"pk": self.public_project.id}
        )
        self.chat_history_url = reverse(
            "videos-projects-chat-history", kwargs={"pk": self.public_project.id}
        )
        self.add_message_url = reverse(
            "videos-projects-add-message", kwargs={"pk": self.public_project.id}
        )
        self.save_state_url = reverse(
            "videos-projects-save-state", kwargs={"pk": self.private_project.id}
        )

    def test_anonymous_user_access(self):
        """Test what anonymous users can and cannot access"""
        # Can access public projects
        response = self.client.get(self.public_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Public Project")

        # Can access list endpoint and see only public projects
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Public Project")

        # Cannot access private projects
        response = self.client.get(self.private_detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot access project actions that require authentication
        response = self.client.post(self.save_state_url, {})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Can access chat history for public projects
        response = self.client.get(self.chat_history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_access(self):
        """Test what authenticated users can access"""
        self.client.force_authenticate(user=self.user)

        # Can access own private and public projects
        response = self.client.get(self.private_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.get(self.public_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Can access list endpoint and see all own projects
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_create_project_authenticated(self):
        """Test creating a project as an authenticated user"""
        self.client.force_authenticate(user=self.user)

        data = {
            "name": "New Project",
            "description": "A new test project",
            "aspect_ratio": AspectRatio.LANDSCAPE,
            "workspace": str(self.workspace.id),
        }

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Project")
        self.assertEqual(response.data["is_public"], False)

        # Verify project was created in database
        project_id = response.data["id"]
        project = VideoProject.objects.get(id=project_id)
        self.assertEqual(project.org, self.org)
        self.assertFalse(project.is_public)

    def test_create_project_anonymous(self):
        """Test creating a project as an anonymous user with session key"""
        session_key = "test-session-key"

        data = {
            "name": "Anonymous Project",
            "description": "An anonymous test project",
            "aspect_ratio": AspectRatio.SQUARE,
            "session_key": session_key,
        }

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Anonymous Project")
        self.assertEqual(response.data["is_public"], True)

        # Verify project was created in database
        project_id = response.data["id"]
        project = VideoProject.objects.get(id=project_id)
        self.assertEqual(project.org, self.anonymous_org)
        self.assertTrue(project.is_public)

        # Verify anonymous session was created
        self.assertTrue(
            AnonymousSession.objects.filter(session_key=session_key).exists()
        )

    def test_create_project_anonymous_without_session_key(self):
        """Test creating a project as anonymous user without session key fails"""
        data = {
            "name": "Anonymous Project",
            "description": "An anonymous test project",
            "aspect_ratio": AspectRatio.SQUARE,
        }

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Session key is required", response.data["error"])

    @patch(
        "video_gen.services.video_project_service.VideoProjectService.add_chat_message"
    )
    @patch("video_gen.services.agent_service.agent_service.process_message")
    def test_add_message(self, mock_process_message, mock_add_chat_message):
        """Test adding a message to chat history"""
        self.client.force_authenticate(user=self.user)

        # Setup mocks
        user_message = ChatMessage(
            sender="user", message="Hello", timestamp="2023-01-01T00:00:00"
        )

        agent_response = ChatMessage(
            sender="assistant",
            message="How can I help you?",
            timestamp="2023-01-01T00:00:01",
        )

        mock_add_chat_message.side_effect = [
            [user_message.model_dump()],
            [user_message.model_dump(), agent_response.model_dump()],
        ]

        mock_process_message.return_value = agent_response

        # Send request
        data = {"message": "Hello", "sender": "user"}

        response = self.client.post(self.add_message_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["messages"]), 2)
        self.assertEqual(response.data["messages"][0]["message"], "Hello")
        self.assertEqual(response.data["messages"][1]["message"], "How can I help you?")

        # Verify mocks were called correctly
        mock_add_chat_message.assert_called()
        mock_process_message.assert_called_once()

    @patch(
        "video_gen.services.video_project_service.VideoProjectService.create_first_message"
    )
    def test_chat_history_creates_first_message(self, mock_create_first_message):
        """Test that getting chat history creates first message if none exists"""
        self.client.force_authenticate(user=self.user)

        # Clear chat messages
        self.public_project.chat_messages = []
        self.public_project.save()

        # Setup mock
        first_message = ChatMessage(
            sender="assistant",
            message="Welcome! How can I help you with your video project?",
            timestamp="2023-01-01T00:00:00",
        )
        mock_create_first_message.return_value = first_message

        # Get chat history
        response = self.client.get(self.chat_history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["message"], first_message.message)

        # Verify first message was created
        mock_create_first_message.assert_called_once()

    def test_save_state(self):
        """Test saving editor state for a video project"""
        self.client.force_authenticate(user=self.user)

        state_data = {
            "state": {
                "fps": 30,
                "durationInFrames": 300,
                "overlays": [{"id": "text1", "type": "text", "content": "Hello World"}],
            }
        }

        response = self.client.post(self.save_state_url, state_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Editor state saved successfully")

        # Verify state was saved
        self.private_project.refresh_from_db()
        self.assertEqual(self.private_project.state, state_data["state"])

    def test_save_state_missing_fields(self):
        """Test saving editor state with missing required fields"""
        self.client.force_authenticate(user=self.user)

        # Missing required fields
        state_data = {
            "state": {
                "fps": 30
                # Missing durationInFrames and overlays
            }
        }

        response = self.client.post(self.save_state_url, state_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Missing required fields", response.data["error"])

    @patch(
        "video_gen.services.video_project_service.VideoProjectService.duplicate_project"
    )
    def test_duplicate_project(self, mock_duplicate_project):
        """Test duplicating a project to another organization"""
        self.client.force_authenticate(user=self.user)

        # Create target org
        target_org = Organization.objects.create(
            name="Target Org", created_by=self.appuser
        )

        # Setup mock
        duplicate = VideoProject(
            id=uuid.uuid4(),
            name="Duplicated Project",
            description="Duplicated from original",
            status=VideoProject.Status.DRAFT,
            aspect_ratio=AspectRatio.LANDSCAPE,
            org=target_org,
            workspace=self.workspace,
            is_public=False,
        )
        mock_duplicate_project.return_value = duplicate

        # Make request
        duplicate_url = reverse(
            "videos-projects-duplicate", kwargs={"pk": self.public_project.id}
        )
        data = {"organization_id": str(target_org.id)}

        response = self.client.post(duplicate_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Duplicated Project")

        # Verify service was called
        mock_duplicate_project.assert_called_once_with(
            source_project=self.public_project, target_org_id=str(target_org.id)
        )

    def test_duplicate_project_missing_org_id(self):
        """Test duplicating a project without providing organization ID"""
        self.client.force_authenticate(user=self.user)

        duplicate_url = reverse(
            "videos-projects-duplicate", kwargs={"pk": self.public_project.id}
        )
        data = {}  # Missing organization_id

        response = self.client.post(duplicate_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Target organization ID is required", response.data["error"])

    @patch("video_gen.services.agent_service.agent_service.process_message")
    @patch("video_gen.services.agent_service.agent_service.register_tool")
    def test_agent_query(self, mock_register_tool, mock_process_message):
        """Test querying the agent with a custom tool"""
        self.client.force_authenticate(user=self.user)

        # Setup mocks
        agent_response = ChatMessage(
            sender="assistant",
            message="Project name updated",
            timestamp="2023-01-01T00:00:00",
        )
        mock_process_message.return_value = agent_response

        # Make request
        agent_query_url = reverse(
            "videos-projects-agent-query", kwargs={"pk": self.private_project.id}
        )
        data = {"query": "Change the project name to 'New Project Name'"}

        response = self.client.post(agent_query_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["response"], "Project name updated")

        # Verify mocks were called
        mock_register_tool.assert_called_once()
        mock_process_message.assert_called_once_with(
            project=self.private_project,
            user_message="Change the project name to 'New Project Name'",
        )

    def test_agent_query_missing_query(self):
        """Test querying the agent without providing a query"""
        self.client.force_authenticate(user=self.user)

        agent_query_url = reverse(
            "videos-projects-agent-query", kwargs={"pk": self.private_project.id}
        )
        data = {}  # Missing query

        response = self.client.post(agent_query_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Query is required", response.data["error"])

    @patch(
        "video_gen.services.video_project_service.VideoProjectService.get_project_media"
    )
    def test_get_project_media(self, mock_get_project_media):
        """Test getting media associated with a project"""
        self.client.force_authenticate(user=self.user)

        # Setup mock
        mock_get_project_media.return_value = [
            {"id": "media1", "type": "image", "url": "https://example.com/image1.jpg"},
            {"id": "media2", "type": "video", "url": "https://example.com/video1.mp4"},
        ]

        # Make request
        media_url = reverse(
            "videos-projects-media", kwargs={"pk": self.private_project.id}
        )
        response = self.client.get(media_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["media"]), 2)

        # Verify service was called
        mock_get_project_media.assert_called_once_with(str(self.private_project.id))
