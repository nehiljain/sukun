import json
import uuid
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from user_org.models import AppUser
from rest_framework import status
from rest_framework.test import APIClient
from user_org.models import Organization
from video_gen.models import AspectRatio, RenderVideo, VideoProject


class RenderVideoViewSetTests(TestCase):
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

        # Create staff user
        self.staff_user = User.objects.create_user(
            username="staffuser",
            password="staffpassword",  # pragma: allowlist secret
            is_staff=True,
        )
        self.staff_appuser = AppUser.objects.create(user=self.staff_user)
        self.staff_appuser.active_org = self.org
        self.staff_appuser.save()

        # Create test video project for the user's organization
        self.video_project = VideoProject.objects.create(
            name="Test Project",
            description="Test Project Description",
            status=VideoProject.Status.DRAFT,
            aspect_ratio=AspectRatio.LANDSCAPE,
            org=self.org,
        )

        # Create another organization
        self.other_appuser = AppUser.objects.create(
            user=User.objects.create_user(
                username="otheruser",
                password="otherpassword",  # pragma: allowlist secret
            )
        )
        self.other_org = Organization.objects.create(
            name="Other Org", created_by=self.other_appuser
        )
        self.other_appuser.active_org = self.other_org
        self.other_appuser.save()

        # Create a video project in other org
        self.other_video_project = VideoProject.objects.create(
            name="Other Project",
            description="Other Project Description",
            status=VideoProject.Status.DRAFT,
            aspect_ratio=AspectRatio.LANDSCAPE,
            org=self.other_org,
        )

        # Create public render video
        self.public_render_video = RenderVideo.objects.create(
            name="Public Render Video",
            video_project=self.video_project,
            status=RenderVideo.Status.GENERATED,
            is_public=True,
            video_url="https://example.com/public_video.mp4",
            thumbnail_url="https://example.com/public_thumbnail.jpg",
        )

        # Create private render video
        self.private_render_video = RenderVideo.objects.create(
            name="Private Render Video",
            video_project=self.video_project,
            status=RenderVideo.Status.GENERATED,
            is_public=False,
            video_url="https://example.com/private_video.mp4",
            thumbnail_url="https://example.com/private_thumbnail.jpg",
        )

        # Create featured public render video
        self.featured_render_video = RenderVideo.objects.create(
            name="Featured Render Video",
            video_project=self.video_project,
            status=RenderVideo.Status.GENERATED,
            is_public=True,
            is_featured=True,
            video_url="https://example.com/featured_video.mp4",
            thumbnail_url="https://example.com/featured_thumbnail.jpg",
        )

        # Create render video in another org
        self.other_render_video = RenderVideo.objects.create(
            name="Other Org Render Video",
            video_project=self.other_video_project,
            status=RenderVideo.Status.GENERATED,
            is_public=False,
            video_url="https://example.com/other_video.mp4",
            thumbnail_url="https://example.com/other_thumbnail.jpg",
        )

        # URLs
        self.list_url = reverse("render-videos-list")
        self.public_render_detail_url = reverse(
            "render-videos-detail", kwargs={"pk": self.public_render_video.id}
        )
        self.private_render_detail_url = reverse(
            "render-videos-detail", kwargs={"pk": self.private_render_video.id}
        )
        self.other_render_detail_url = reverse(
            "render-videos-detail", kwargs={"pk": self.other_render_video.id}
        )
        self.featured_renders_url = reverse("render-videos-get-featured-renders")

    def test_anonymous_user_can_access_public_render_videos(self):
        """Test that anonymous users can access public render videos"""
        # Test retrieve public render video
        response = self.client.get(self.public_render_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.public_render_video.id))

        # Test list endpoint should be forbidden for anonymous users
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test retrieve private render video (should fail)
        response = self.client.get(self.private_render_detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Test create render video (should fail)
        response = self.client.post(
            self.list_url, {"video_project": str(self.video_project.id)}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_access_featured_renders(self):
        """Test that anonymous users can access the featured renders endpoint"""
        response = self.client.get(self.featured_renders_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.featured_render_video.id))
        self.assertEqual(
            response.data[0]["aspect_ratio"], self.video_project.aspect_ratio
        )

    def test_authenticated_user_can_access_own_render_videos(self):
        """Test that authenticated users can access their own org's render videos"""
        self.client.force_authenticate(user=self.user)

        # Test list endpoint
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # 3 render videos in user's org

        # Test filter by video_project_id
        response = self.client.get(
            f"{self.list_url}?video_project_id={self.video_project.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        # Test retrieve own private render video
        response = self.client.get(self.private_render_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.private_render_video.id))

        # Test retrieve other org's render video (should fail)
        response = self.client.get(self.other_render_detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_user_can_access_all_render_videos(self):
        """Test that staff users can access all render videos across organizations"""
        self.client.force_authenticate(user=self.staff_user)

        # Test list endpoint
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)  # All 4 render videos

        # Test retrieve other org's render video
        response = self.client.get(self.other_render_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.other_render_video.id))

    @patch("video_gen.services.render_service.RenderService.start_render_process")
    def test_create_render_video_authenticated_user(self, mock_start_render):
        """Test creating a render video as an authenticated user"""
        self.client.force_authenticate(user=self.user)
        mock_start_render.return_value = True

        data = {
            "video_project_id": str(self.video_project.id),
            "resolution": "1080p",
            "render_speed": "medium",
        }

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["status"], "processing")

        # Verify render was created in database
        render_id = response.data["id"]
        render = RenderVideo.objects.get(id=render_id)
        self.assertEqual(render.video_project.id, self.video_project.id)
        self.assertEqual(render.resolution, "1080p")
        self.assertEqual(render.render_speed, "medium")
        self.assertEqual(render.status, RenderVideo.Status.PENDING)

        # Mock service should have been called
        mock_start_render.assert_called_once()

    @patch("video_gen.services.render_service.RenderService.start_render_process")
    def test_create_render_video_with_missing_video_project(self, mock_start_render):
        """Test creating a render video without providing a video project ID"""
        self.client.force_authenticate(user=self.user)

        data = {"resolution": "1080p", "render_speed": "medium"}

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("video_project_id is required", response.data["error"])

        # Mock service should not have been called
        mock_start_render.assert_not_called()

    @patch("video_gen.services.render_service.RenderService.start_render_process")
    def test_create_render_video_with_default_values(self, mock_start_render):
        """Test creating a render video with default resolution and render speed"""
        self.client.force_authenticate(user=self.user)
        mock_start_render.return_value = True

        data = {"video_project_id": str(self.video_project.id)}

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        # Verify default values
        render_id = response.data["id"]
        render = RenderVideo.objects.get(id=render_id)
        self.assertEqual(render.resolution, "720p")  # Default value
        self.assertEqual(render.render_speed, "medium")  # Default value

    @patch("video_gen.services.render_service.RenderService.start_render_process")
    def test_create_render_failed_to_start(self, mock_start_render):
        """Test creating a render video where the render process fails to start"""
        self.client.force_authenticate(user=self.user)
        mock_start_render.return_value = False

        data = {"video_project_id": str(self.video_project.id)}

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["status"], "error")

        # Verify render status was updated
        render_id = response.data["id"]
        render = RenderVideo.objects.get(id=render_id)
        self.assertEqual(render.status, RenderVideo.Status.ERROR)
        self.assertIsNone(render.render_token)

    @patch("video_gen.services.render_service.RenderService.start_render_process")
    def test_create_render_other_org_video_project(self, mock_start_render):
        """Test creating a render video for a video project in another organization"""
        self.client.force_authenticate(user=self.user)

        data = {"video_project_id": str(self.other_video_project.id)}

        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Video project not found", response.data["error"])

        # Mock service should not have been called
        mock_start_render.assert_not_called()

    @patch("video_gen.services.media_service.MediaService.generate_video_thumbnail")
    @patch("os.path.exists")
    @patch("os.remove")
    @patch("common.storage.utils.CloudStorageFactory.get_storage_backend")
    @patch("builtins.open", new_callable=MagicMock)
    def test_render_complete_endpoint_successful(
        self,
        mock_open,
        mock_storage_factory,
        mock_remove,
        mock_exists,
        mock_generate_thumbnail,
    ):
        """Test successful render completion notification processing"""
        # Setup mocks
        mock_exists.return_value = True
        mock_generate_thumbnail.return_value = "https://example.com/new_thumbnail.jpg"

        # Mock file operations
        mock_file = MagicMock()
        mock_context = MagicMock()
        mock_context.__enter__.return_value = mock_file
        mock_open.return_value = mock_context

        # Mock storage backend
        mock_storage = MagicMock()
        mock_storage.upload_file.return_value = "https://example.com/uploaded_video.mp4"
        mock_storage_factory.return_value = mock_storage

        # Set render token
        render_token = uuid.uuid4().hex
        self.private_render_video.render_token = render_token
        self.private_render_video.save()

        # Prepare request data
        data = {
            "output_path": "/media/renders/test_video.mp4",
            "render_token": render_token,
        }

        # Call the endpoint as a detail endpoint
        url = f"/api/render-videos/{self.private_render_video.id}/render_complete/"
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response_data = json.loads(response.content)
        self.assertEqual(response_data["message"], "Render complete")

        # Verify render was updated in database
        self.private_render_video.refresh_from_db()
        self.assertIsNone(self.private_render_video.render_token)
        self.assertEqual(
            self.private_render_video.video_url,
            "https://example.com/uploaded_video.mp4",
        )
        self.assertEqual(
            self.private_render_video.thumbnail_url,
            "https://example.com/new_thumbnail.jpg",
        )

        # Verify cleanup was called
        mock_remove.assert_called_once()

    def test_render_complete_with_invalid_token(self):
        """Test render completion with invalid token is rejected"""
        # Set render token
        render_token = uuid.uuid4().hex
        self.private_render_video.render_token = render_token
        self.private_render_video.save()

        # Prepare request data with wrong token
        data = {
            "output_path": "/media/renders/test_video.mp4",
            "render_token": "wrong_token",
        }

        # Call the endpoint as a detail endpoint
        url = f"/api/render-videos/{self.private_render_video.id}/render_complete/"
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response_data = json.loads(response.content)
        self.assertIn("Invalid render token", response_data["error"])

    @patch("video_gen.services.media_service.MediaService.generate_video_thumbnail")
    def test_retrieve_generates_thumbnail_if_missing(self, mock_generate_thumbnail):
        """Test that retrieving a render video generates a thumbnail if missing"""
        self.client.force_authenticate(user=self.user)
        mock_generate_thumbnail.return_value = (
            "https://example.com/generated_thumbnail.jpg"
        )

        # Set thumbnail_url to None
        self.private_render_video.thumbnail_url = None
        self.private_render_video.save()

        response = self.client.get(self.private_render_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify thumbnail was generated
        mock_generate_thumbnail.assert_called_once_with(
            self.private_render_video.video_url,
            f"render_{self.private_render_video.id}",
        )

        # Refresh from database and check updated thumbnail_url
        self.private_render_video.refresh_from_db()
        self.assertEqual(
            self.private_render_video.thumbnail_url,
            "https://example.com/generated_thumbnail.jpg",
        )
