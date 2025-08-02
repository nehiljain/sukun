import json

# from common.middleware import IsOrgMember
import logging
import uuid

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from video_gen.models import Recording, Room
from video_gen.serializers import RecordingSerializer, RoomSerializer

logger = logging.getLogger(__name__)


class RoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for the Room model that allows users to manage their rooms
    """

    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        org = user.appuser.active_org
        return Room.objects.filter(org=org, created_by=user.appuser)

    @action(detail=False, methods=["get"])
    def active_room(self, request):
        """
        Get the user's active room information or create one if it doesn't exist
        """
        user = request.user
        org = user.appuser.active_org

        try:
            room = Room.objects.get(created_by=user.appuser, org=org)
            # Check if there's an active recording for this room
            # active_recording = Recording.objects.filter(
            #     room=room,
            #     status__in=[Recording.Status.ACTIVE, Recording.Status.RECORDING],
            # ).first()

            response_data = {
                "room": RoomSerializer(room).data,
                # "active_recording": RecordingSerializer(active_recording).data
                # if active_recording
                # else None,
            }

            return Response(response_data)
        except Room.DoesNotExist:
            # Create a new room for the user
            room_name = f"{user.appuser.name.lower().replace(' ', '-')}-room"
            daily_api_url = "https://api.daily.co/v1/rooms"
            daily_headers = {
                "Authorization": f"Bearer {settings.DAILY_API_KEY}",
                "Content-Type": "application/json",
            }

            room_data = {
                "privacy": "public",
                "name": room_name,
                "properties": {
                    "exp": int(timezone.now().timestamp()) + 86400,
                    "enable_recording": "raw-tracks",
                    "recordings_template": "{domain_name}/{room_name}/{recording_id}/{epoch_time}",
                    "recordings_bucket": {
                        "bucket_name": "dd-stage-dailyco",
                        "bucket_region": settings.AWS_REGION,
                        "assume_role_arn": "arn:aws:iam::792115949541:role/dailyco-s3-role",
                        "allow_api_access": False,
                    },
                },
            }

            try:
                response = requests.post(
                    daily_api_url, headers=daily_headers, data=json.dumps(room_data)
                )
                response.raise_for_status()
                room_data = response.json()

                room = Room.objects.create(
                    name=f"{user.appuser.name}'s Room",
                    daily_room_name=room_name,
                    daily_room_url=room_data["url"],
                    created_by=user.appuser,
                    org=org,
                )

                return Response(
                    {
                        "room": {
                            "id": room.id,
                            "name": room.name,
                            "daily_room_name": room.daily_room_name,
                            "daily_room_url": room.daily_room_url,
                        },
                        "active_recording": None,
                    }
                )
            except Exception as e:
                logger.error(f"Failed to create Daily room: {e}")
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )


class RecordingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for the Recording model that allows users to manage recording sessions
    with Daily API integration.
    """

    serializer_class = RecordingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # org = user.appuser.active_org
        return Recording.objects.filter(created_by=user.appuser)

    def create(self, request, *args, **kwargs):
        user = request.user
        name = request.data.get("name", "Recording Session")
        org = user.appuser.active_org

        # Check for active recordings in user's room
        try:
            room = Room.objects.get(created_by=user.appuser, org=org)
            if Recording.objects.filter(
                room=room,
                status__in=[Recording.Status.ACTIVE, Recording.Status.RECORDING],
            ).exists():
                return Response(
                    {"error": "Another recording is already active in your room"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Room.DoesNotExist:
            # Create new room for user if doesn't exist
            room_name = f"{user.appuser.name.lower().replace(' ', '-')}-room"
            daily_api_url = "https://api.daily.co/v1/rooms"
            daily_headers = {
                "Authorization": f"Bearer {settings.DAILY_API_KEY}",
                "Content-Type": "application/json",
            }

            room_data = {
                "privacy": "public",
                "name": room_name,
                "properties": {
                    # "exp": int(timezone.now().timestamp()) + 86400,
                    "enable_recording": "raw-tracks",
                    "recordings_template": "{domain_name}/{room_name}/{recording_id}/{epoch_time}",
                    "recordings_bucket": {
                        "bucket_name": "dd-stage-dailyco",
                        "bucket_region": settings.AWS_REGION,
                        "assume_role_arn": "arn:aws:iam::792115949541:role/dailyco-s3-role",
                        "allow_api_access": False,
                    },
                },
            }

            try:
                response = requests.post(
                    daily_api_url, headers=daily_headers, data=json.dumps(room_data)
                )
                response.raise_for_status()
                room_data = response.json()

                room = Room.objects.create(
                    name=f"{user.appuser.name}'s Room",
                    daily_room_name=room_name,
                    daily_room_url=room_data["url"],
                    created_by=user.appuser,
                    org=org,
                )
            except Exception as e:
                logger.error(f"Failed to create Daily room: {e}")
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # Create the Recording instance with ACTIVE status
        recording = Recording.objects.create(
            name=name,
            created_by=user.appuser,
            room=room,
            s3_folder_path=f"recordings/{room.daily_room_name}/rec_{uuid.uuid4()}/",
            status=Recording.Status.ACTIVE,  # Set to ACTIVE instead of CREATED
        )

        serializer = self.get_serializer(recording)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def start_recording(self, request, pk=None):
        """
        Start recording the Daily session
        """
        recording = self.get_object()

        if recording.status != Recording.Status.ACTIVE:
            return Response(
                {"error": "Recording session must be active to start recording"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if there's already an active recording in this room
        if Recording.objects.filter(
            room=recording.room, status=Recording.Status.RECORDING
        ).exists():
            return Response(
                {"error": "Another recording is already in progress in this room"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Call Daily API to start recording
        daily_api_url = f"https://api.daily.co/v1/rooms/{recording.room.daily_room_name}/recordings/start"
        daily_headers = {
            "Authorization": f"Bearer {settings.DAILY_API_KEY}",
            "Content-Type": "application/json",
        }

        recording_options = {
            # "fps": "60",
            "videoBitrate": "5000",
            "audioBitrate": "320",
            "type": "raw-tracks",  # Record individual participant tracks
        }

        try:
            logger.info(daily_api_url)
            logger.info(recording_options)
            response = requests.post(
                daily_api_url, headers=daily_headers, data=json.dumps(recording_options)
            )
            response.raise_for_status()
            recording_data = response.json()

            # Update recording status
            recording.status = Recording.Status.RECORDING
            recording.recording_started_at = timezone.now()
            recording.daily_recording_id = recording_data.get("id")
            recording.s3_folder_path = f"recordings/{recording.room.daily_room_name}/rec_{recording.daily_recording_id}/"
            recording.daily_session_data = recording_data
            recording.save()

            return Response(RecordingSerializer(recording).data)
        except Exception as e:
            logger.exception(e)
            return Response(
                {"error": f"Failed to start recording: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def stop_recording(self, request, pk=None):
        """
        Stop the recording session
        """
        recording = self.get_object()

        if recording.status != Recording.Status.RECORDING:
            return Response(
                {"error": "Recording must be in recording state to stop it"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Call Daily API to stop recording
        daily_api_url = f"https://api.daily.co/v1/rooms/{recording.room.daily_room_name}/recordings/stop"
        daily_headers = {
            "Authorization": f"Bearer {settings.DAILY_API_KEY}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(daily_api_url, headers=daily_headers)
            response.raise_for_status()

            # Update recording status
            recording.status = Recording.Status.COMPLETED
            recording.recording_ended_at = timezone.now()
            recording.save()

            return Response(RecordingSerializer(recording).data)
        except Exception as e:
            logger.exception(e)
            return Response(
                {"error": f"Failed to stop recording: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def get_recording_status(self, request, pk=None):
        """
        Get the current status of the recording and its assets
        """
        recording = self.get_object()

        if not recording.daily_recording_id:
            return Response(
                {"error": "No recording has been started for this session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Call Daily API to get recording status
        daily_api_url = (
            f"https://api.daily.co/v1/recordings/{recording.daily_recording_id}"
        )
        daily_headers = {
            "Authorization": f"Bearer {settings.DAILY_API_KEY}",
        }

        try:
            response = requests.get(daily_api_url, headers=daily_headers)
            response.raise_for_status()
            recording_data = response.json()

            return Response(recording_data)
        except Exception as e:
            return Response(
                {"error": f"Failed to get recording status: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def list_room_recordings(self, request):
        """
        List all recordings for the user's assigned room
        """
        user = request.user
        org = user.appuser.active_org

        try:
            room = Room.objects.get(created_by=user.appuser, org=org)
            recordings = Recording.objects.filter(room=room).order_by("-created_at")
            serializer = self.get_serializer(recordings, many=True)
            return Response(serializer.data)
        except Room.DoesNotExist:
            return Response(
                {
                    "error": "You don't have a room assigned yet. Create a recording first."
                },
                status=status.HTTP_404_NOT_FOUND,
            )
