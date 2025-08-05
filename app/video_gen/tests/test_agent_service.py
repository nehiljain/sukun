import json
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import TestCase
from video_gen.models import VideoProject
from video_gen.services.agent_service import (
    AgentTool,
    OpenAIAgentService,
    agent_service,
)


class AgentToolTestCase(TestCase):
    def test_agent_tool_initialization(self):
        """Test that AgentTool is initialized correctly"""
        mock_func = MagicMock()
        tool = AgentTool(
            name="test_tool",
            description="Test description",
            parameters={"type": "object"},
            func=mock_func,
        )

        self.assertEqual(tool.name, "test_tool")
        self.assertEqual(tool.description, "Test description")
        self.assertEqual(tool.parameters, {"type": "object"})
        self.assertEqual(tool.func, mock_func)


class OpenAIAgentServiceTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        # Initialize service with mocked OpenAI client
        self.service = OpenAIAgentService()
        self.service.client = MagicMock()

        # Create mock project ID
        self.project_id = str(uuid4())

        # Create mock render ID
        self.render_id = str(uuid4())

        # Create patches for VideoProject and RenderVideo
        self.video_project_patcher = patch(
            "video_gen.services.agent_service.VideoProject"
        )
        self.render_video_patcher = patch(
            "video_gen.services.agent_service.RenderVideo"
        )

        # Start the patches
        self.mock_video_project = self.video_project_patcher.start()
        self.mock_render_video = self.render_video_patcher.start()

        # Set up the DoesNotExist exception
        self.mock_video_project.DoesNotExist = VideoProject.DoesNotExist

    def tearDown(self):
        """Clean up after tests"""
        self.video_project_patcher.stop()
        self.render_video_patcher.stop()

    def test_register_tool(self):
        """Test registering a new tool"""
        initial_tool_count = len(self.service.tools)

        # Register a new tool
        mock_func = MagicMock()
        self.service.register_tool(
            name="test_tool",
            description="Test description",
            parameters={"type": "object"},
            func=mock_func,
        )

        # Check if tool was added
        self.assertEqual(len(self.service.tools), initial_tool_count + 1)
        added_tool = self.service.tools[-1]
        self.assertEqual(added_tool.name, "test_tool")
        self.assertEqual(added_tool.description, "Test description")

    def test_get_tool_definitions(self):
        """Test converting tools to OpenAI format"""
        # Register a test tool
        mock_func = MagicMock()
        self.service.register_tool(
            name="test_tool",
            description="Test description",
            parameters={"type": "object"},
            func=mock_func,
        )

        definitions = self.service._get_tool_definitions()

        # Find our test tool in definitions
        test_tool_def = next(
            (d for d in definitions if d["function"]["name"] == "test_tool"), None
        )
        self.assertIsNotNone(test_tool_def)
        self.assertEqual(test_tool_def["type"], "function")
        self.assertEqual(test_tool_def["function"]["description"], "Test description")
        self.assertEqual(test_tool_def["function"]["parameters"], {"type": "object"})

    def test_tool_get_project_status(self):
        """Test get_project_status tool implementation"""
        # Mock the project retrieval
        mock_project = MagicMock()
        mock_project.state = {"test": "data"}
        mock_project.status = "in_progress"
        self.mock_video_project.objects.get.return_value = mock_project

        # Test successful call
        result = self.service._tool_get_project_status(self.project_id)

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["state"], mock_project.state)
        self.assertEqual(result["project_status"], mock_project.status)

        # Test with non-existent project
        self.mock_video_project.objects.get.side_effect = VideoProject.DoesNotExist()
        result = self.service._tool_get_project_status(str(uuid4()))
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["message"], "Project not found")

        # Test with generic exception
        self.mock_video_project.objects.get.side_effect = Exception("Test error")
        result = self.service._tool_get_project_status(self.project_id)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["message"], "Test error")

        # Reset side effect
        self.mock_video_project.objects.get.side_effect = None

    def test_tool_get_latest_render(self):
        """Test get_latest_render tool implementation"""
        # Mock the project
        mock_project = MagicMock()
        self.mock_video_project.objects.get.return_value = mock_project

        # Mock the render
        mock_render = MagicMock()
        mock_render.id = self.render_id
        mock_render.status = "generated"
        mock_render.video_url = "https://example.com/video.mp4"
        mock_render.thumbnail_url = "https://example.com/thumbnail.jpg"
        mock_render.created_at = datetime.now()

        # Mock queryset
        mock_queryset = MagicMock()
        mock_queryset.order_by.return_value.first.return_value = mock_render
        self.mock_render_video.objects.filter.return_value = mock_queryset

        # Test successful call
        result = self.service._tool_get_latest_render(self.project_id)

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["render_id"], str(mock_render.id))
        self.assertEqual(result["render_status"], mock_render.status)
        self.assertEqual(result["url"], mock_render.video_url)
        self.assertEqual(result["thumbnail_url"], mock_render.thumbnail_url)

        # Test with project having no renders
        mock_queryset.order_by.return_value.first.return_value = None
        result = self.service._tool_get_latest_render(self.project_id)
        self.assertEqual(result["status"], "info")
        self.assertEqual(result["message"], "No renders found for this project")

        # Test with non-existent project
        self.mock_video_project.objects.get.side_effect = VideoProject.DoesNotExist()
        result = self.service._tool_get_latest_render(str(uuid4()))
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["message"], "Project not found")

        # Test with NULL url values
        self.mock_video_project.objects.get.side_effect = None
        mock_render.video_url = None
        mock_render.thumbnail_url = None
        mock_queryset.order_by.return_value.first.return_value = mock_render
        result = self.service._tool_get_latest_render(self.project_id)

        self.assertEqual(result["status"], "success")
        self.assertIsNone(result["url"])
        self.assertIsNone(result["thumbnail_url"])

        # Test with generic exception
        self.mock_video_project.objects.get.side_effect = Exception("Test error")
        result = self.service._tool_get_latest_render(self.project_id)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["message"], "Test error")

        # Reset side effect
        self.mock_video_project.objects.get.side_effect = None

    def test_tool_show_render_preview(self):
        """Test show_render_preview tool implementation"""
        # Mock the project
        mock_project = MagicMock()
        self.mock_video_project.objects.get.return_value = mock_project

        # Mock the render
        mock_render = MagicMock()
        mock_render.id = self.render_id
        mock_render.thumbnail_url = "https://example.com/thumbnail.jpg"

        # Mock queryset
        mock_queryset = MagicMock()
        mock_queryset.order_by.return_value.first.return_value = mock_render
        self.mock_render_video.objects.filter.return_value = mock_queryset

        # Test successful call
        result = self.service._tool_show_render_preview(self.project_id)

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["message"], "Render preview available")
        self.assertTrue(result["show_preview"])
        self.assertEqual(result["render_id"], str(mock_render.id))
        self.assertEqual(result["thumbnail_url"], mock_render.thumbnail_url)
        self.assertEqual(result["player_url"], f"/video-player/{mock_render.id}")

        # Test with project having no generated renders
        mock_queryset.order_by.return_value.first.return_value = None
        result = self.service._tool_show_render_preview(self.project_id)
        self.assertEqual(result["status"], "info")
        self.assertEqual(
            result["message"], "No generated renders available for preview"
        )
        self.assertFalse(result["show_preview"])

        # Test with non-existent project
        self.mock_video_project.objects.get.side_effect = VideoProject.DoesNotExist()
        result = self.service._tool_show_render_preview(str(uuid4()))
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["message"], "Project not found")

        # Test with generic exception
        self.mock_video_project.objects.get.side_effect = Exception("Test error")
        result = self.service._tool_show_render_preview(self.project_id)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["message"], "Test error")

        # Reset side effect
        self.mock_video_project.objects.get.side_effect = None

    @patch("openai.OpenAI")
    def test_process_message_no_tools(self, mock_openai):
        """Test processing a message without tool calls"""
        # Setup mock response
        mock_choice = MagicMock()
        mock_choice.message.content = "This is a test response"
        mock_choice.message.tool_calls = None

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        self.service.client = mock_client

        # Setup mock project with chat history
        mock_project = MagicMock()
        mock_project.id = self.project_id
        mock_project.name = "Test Project"
        mock_project.status = "in_progress"
        mock_project.chat_messages = [
            {
                "sender": "user",
                "message": "Hello",
                "timestamp": datetime.utcnow().isoformat(),
            },
            {
                "sender": "assistant",
                "message": "Hi there",
                "timestamp": datetime.utcnow().isoformat(),
            },
        ]

        # Process message
        result = self.service.process_message(mock_project, "How are you?")

        # Verify result
        self.assertEqual(result.sender, "assistant")
        self.assertEqual(result.message, "This is a test response")
        self.assertIsNotNone(result.timestamp)

    @patch("openai.OpenAI")
    def test_process_message_empty_history(self, mock_openai):
        """Test processing a message with empty chat history"""
        # Setup mock response
        mock_choice = MagicMock()
        mock_choice.message.content = "This is a test response"
        mock_choice.message.tool_calls = None

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        self.service.client = mock_client

        # Setup mock project with empty chat history
        mock_project = MagicMock()
        mock_project.id = self.project_id
        mock_project.name = "Test Project"
        mock_project.status = "in_progress"
        mock_project.chat_messages = None  # Test with None

        # Process message
        result = self.service.process_message(mock_project, "First message")

        # Verify result
        self.assertEqual(result.sender, "assistant")
        self.assertEqual(result.message, "This is a test response")
        self.assertIsNotNone(result.timestamp)

        # Test with empty list
        mock_project.chat_messages = []
        result = self.service.process_message(mock_project, "First message")
        self.assertEqual(result.sender, "assistant")
        self.assertEqual(result.message, "This is a test response")

    @patch("openai.OpenAI")
    def test_process_message_long_history(self, mock_openai):
        """Test processing a message with long chat history (more than 10 messages)"""
        # Setup mock response
        mock_choice = MagicMock()
        mock_choice.message.content = "This is a test response"
        mock_choice.message.tool_calls = None

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        self.service.client = mock_client

        # Setup mock project with 15 chat messages
        mock_project = MagicMock()
        mock_project.id = self.project_id
        mock_project.name = "Test Project"
        mock_project.status = "in_progress"
        mock_project.chat_messages = [
            {
                "sender": "user" if i % 2 == 0 else "assistant",
                "message": f"Message {i}",
                "timestamp": datetime.utcnow().isoformat(),
            }
            for i in range(15)
        ]

        # Process message
        self.service.process_message(mock_project, "New message")

        # Verify the API was called with only the last 10 messages + system message + current message
        calls = mock_client.chat.completions.create.call_args_list
        self.assertEqual(len(calls), 1)

        messages_param = calls[0][1].get("messages", [])
        # First message should be system message, last should be the user's current message
        self.assertEqual(messages_param[0].get("role"), "system")
        self.assertEqual(messages_param[-1].get("role"), "user")
        self.assertEqual(messages_param[-1].get("content"), "New message")

        # Should have 12 messages total (system + 10 history + current)
        self.assertEqual(len(messages_param), 12)

    # @patch("openai.OpenAI")
    # def test_process_message_with_tools(self, mock_openai):
    #     """Test processing a message with tool calls"""
    #     # Setup mock project
    #     mock_project = MagicMock()
    #     mock_project.id = self.project_id
    #     mock_project.name = "Test Project"
    #     mock_project.status = "in_progress"
    #     mock_project.chat_messages = []

    #     # Setup first mock response with tool calls
    #     mock_tool_call = MagicMock()
    #     mock_tool_call.id = "call_123"
    #     mock_tool_call.function.name = "get_project_status"
    #     mock_tool_call.function.arguments = json.dumps({"project_id": self.project_id})

    #     mock_choice1 = MagicMock()
    #     mock_choice1.message.tool_calls = [mock_tool_call]

    #     first_response = MagicMock()
    #     first_response.choices = [mock_choice1]

    #     # Setup second mock response after tool execution
    #     mock_choice2 = MagicMock()
    #     mock_choice2.message.content = "Your project is in progress"

    #     second_response = MagicMock()
    #     second_response.choices = [mock_choice2]

    #     # Configure mock client to return different responses
    #     mock_client = MagicMock()
    #     mock_client.chat.completions.create.side_effect = [
    #         first_response,
    #         second_response,
    #     ]

    #     self.service.client = mock_client

    #     # Mock the get_project_status tool results
    #     mock_project_get = MagicMock()
    #     mock_project_get.state = {"test": "data"}
    #     mock_project_get.status = "in_progress"
    #     self.mock_video_project.objects.get.return_value = mock_project_get

    #     # Process message
    #     result = self.service.process_message(
    #         mock_project, "What's the status of my project?"
    #     )

    #     # Verify result
    #     self.assertEqual(result.sender, "assistant")
    #     self.assertEqual(result.message, "Your project is in progress")
    #     self.assertIsNotNone(result.timestamp)

    #     # Mock the metadata attribute appropriately - it's a Pydantic model, so we should
    #     # check that metadata exists in an appropriate way for the model
    #     chat_result_dict = (
    #         result.model_dump() if hasattr(result, "model_dump") else result.dict()
    #     )
    #     self.assertIn("metadata", chat_result_dict)
    #     self.assertIsNotNone(chat_result_dict.get("metadata"))
    #     self.assertEqual(
    #         chat_result_dict["metadata"]["used_tools"][0], "get_project_status"
    #     )

    # @patch("openai.OpenAI")
    # def test_process_message_with_multiple_tools(self, mock_openai):
    #     """Test processing a message with multiple tool calls"""
    #     # Setup mock project
    #     mock_project = MagicMock()
    #     mock_project.id = self.project_id
    #     mock_project.name = "Test Project"
    #     mock_project.status = "in_progress"
    #     mock_project.chat_messages = []

    #     # Setup first mock response with multiple tool calls
    #     mock_tool_call1 = MagicMock()
    #     mock_tool_call1.id = "call_123"
    #     mock_tool_call1.function.name = "get_project_status"
    #     mock_tool_call1.function.arguments = json.dumps({"project_id": self.project_id})

    #     mock_tool_call2 = MagicMock()
    #     mock_tool_call2.id = "call_456"
    #     mock_tool_call2.function.name = "get_latest_render"
    #     mock_tool_call2.function.arguments = json.dumps({"project_id": self.project_id})

    #     mock_choice1 = MagicMock()
    #     mock_choice1.message.tool_calls = [mock_tool_call1, mock_tool_call2]

    #     first_response = MagicMock()
    #     first_response.choices = [mock_choice1]

    #     # Setup second mock response after tool execution
    #     mock_choice2 = MagicMock()
    #     mock_choice2.message.content = "Your project is in progress and has a render"

    #     second_response = MagicMock()
    #     second_response.choices = [mock_choice2]

    #     # Configure mock client to return different responses
    #     mock_client = MagicMock()
    #     mock_client.chat.completions.create.side_effect = [
    #         first_response,
    #         second_response,
    #     ]

    #     self.service.client = mock_client

    #     # Mock the tool results
    #     mock_project_get = MagicMock()
    #     mock_project_get.state = {"test": "data"}
    #     mock_project_get.status = "in_progress"
    #     self.mock_video_project.objects.get.return_value = mock_project_get

    #     mock_render = MagicMock()
    #     mock_render.id = self.render_id
    #     mock_render.status = "generated"
    #     mock_render.video_url = "https://example.com/video.mp4"
    #     mock_render.thumbnail_url = "https://example.com/thumbnail.jpg"
    #     mock_render.created_at = datetime.now()

    #     mock_queryset = MagicMock()
    #     mock_queryset.order_by.return_value.first.return_value = mock_render
    #     self.mock_render_video.objects.filter.return_value = mock_queryset

    #     # Process message
    #     result = self.service.process_message(
    #         mock_project, "What's my project status and latest render?"
    #     )

    #     # Verify result
    #     self.assertEqual(result.sender, "assistant")
    #     self.assertEqual(result.message, "Your project is in progress and has a render")
    #     self.assertIsNotNone(result.timestamp)

    #     # Verify metadata contains all used tools using Pydantic model's dict method
    #     chat_result_dict = (
    #         result.model_dump() if hasattr(result, "model_dump") else result.dict()
    #     )
    #     self.assertIn("metadata", chat_result_dict)
    #     self.assertIsNotNone(chat_result_dict.get("metadata"))
    #     self.assertEqual(len(chat_result_dict["metadata"]["used_tools"]), 2)
    #     self.assertIn("get_project_status", chat_result_dict["metadata"]["used_tools"])
    #     self.assertIn("get_latest_render", chat_result_dict["metadata"]["used_tools"])

    @patch("openai.OpenAI")
    def test_process_message_with_render_preview(self, mock_openai):
        """Test processing a message that triggers show_render_preview"""
        # Setup mock project
        mock_project = MagicMock()
        mock_project.id = self.project_id
        mock_project.name = "Test Project"
        mock_project.status = "in_progress"
        mock_project.chat_messages = []

        # Setup mock response with tool calls for show_render_preview
        mock_tool_call = MagicMock()
        mock_tool_call.id = "call_123"
        mock_tool_call.function.name = "show_render_preview"
        mock_tool_call.function.arguments = json.dumps({"project_id": self.project_id})

        mock_choice = MagicMock()
        mock_choice.message.tool_calls = [mock_tool_call]

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        self.service.client = mock_client

        # Mock the project for tool execution
        self.mock_video_project.objects.get.return_value = mock_project

        # Mock the render for show_render_preview tool
        mock_render = MagicMock()
        mock_render.id = self.render_id
        mock_render.thumbnail_url = "https://example.com/thumbnail.jpg"

        mock_queryset = MagicMock()
        mock_queryset.order_by.return_value.first.return_value = mock_render
        self.mock_render_video.objects.filter.return_value = mock_queryset

        # Process message asking to see the render
        result = self.service.process_message(mock_project, "Show me the video")

        # Verify result is a media message
        self.assertEqual(result.sender, "system")
        self.assertEqual(result.message, "Here's the latest render for your project:")
        self.assertIsNotNone(result.timestamp)
        self.assertEqual(result.media["type"], "video")
        self.assertEqual(result.media["id"], str(mock_render.id))
        self.assertEqual(result.media["thumbnail_url"], mock_render.thumbnail_url)

    @patch("openai.OpenAI")
    def test_process_message_tool_error(self, mock_openai):
        """Test handling of errors in tool execution"""
        # Setup mock project
        mock_project = MagicMock()
        mock_project.id = self.project_id
        mock_project.name = "Test Project"
        mock_project.status = "in_progress"
        mock_project.chat_messages = []

        # Setup first mock response with tool call
        mock_tool_call = MagicMock()
        mock_tool_call.id = "call_123"
        mock_tool_call.function.name = "get_project_status"
        mock_tool_call.function.arguments = json.dumps({"project_id": "invalid_id"})

        mock_choice1 = MagicMock()
        mock_choice1.message.tool_calls = [mock_tool_call]

        first_response = MagicMock()
        first_response.choices = [mock_choice1]

        # Setup second mock response after tool execution
        mock_choice2 = MagicMock()
        mock_choice2.message.content = "I couldn't find your project"

        second_response = MagicMock()
        second_response.choices = [mock_choice2]

        # Configure mock client to return different responses
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = [
            first_response,
            second_response,
        ]

        self.service.client = mock_client

        # Make the tool raise an error
        self.mock_video_project.objects.get.side_effect = VideoProject.DoesNotExist()

        # Process message
        result = self.service.process_message(
            mock_project, "What's the status of project XYZ?"
        )

        # Verify result reflects the error handling
        self.assertEqual(result.sender, "assistant")
        self.assertEqual(result.message, "I couldn't find your project")
        self.assertIsNotNone(result.timestamp)

    def test_error_handling(self):
        """Test error handling in process_message method"""
        # Setup mock project
        mock_project = MagicMock()
        mock_project.id = self.project_id
        mock_project.name = "Test Project"
        mock_project.status = "in_progress"
        mock_project.chat_messages = []

        # Force an error by making the client raise an exception
        self.service.client.chat.completions.create.side_effect = Exception(
            "Test error"
        )

        # Process message should catch the exception and return an error message
        result = self.service.process_message(mock_project, "This will cause an error")

        self.assertEqual(result.sender, "assistant")
        self.assertIn("I apologize", result.message)
        self.assertIn("error", result.message)


class AgentServiceInstanceTestCase(TestCase):
    """Test the singleton instance of the OpenAIAgentService"""

    def test_singleton_instance(self):
        """Test that agent_service is an instance of OpenAIAgentService"""
        self.assertIsInstance(agent_service, OpenAIAgentService)

        # Verify it has the default tools registered
        tool_names = [tool.name for tool in agent_service.tools]
        self.assertIn("get_project_status", tool_names)
        self.assertIn("get_latest_render", tool_names)
        self.assertIn("show_render_preview", tool_names)
