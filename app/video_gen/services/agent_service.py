import json
import logging
import os
from datetime import datetime
from typing import Callable, Dict

from openai import OpenAI
from video_gen.models import RenderVideo, VideoProject
from video_gen.services.video_project_service import ChatMessage

logger = logging.getLogger(__name__)


class AgentTool:
    def __init__(self, name: str, description: str, parameters: Dict, func: Callable):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.func = func


class OpenAIAgentService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.tools = []
        self._register_default_tools()

    def _register_default_tools(self):
        """Register default tools for the agent"""
        self.register_tool(
            name="get_project_status",
            description="Get the current status of a video project",
            parameters={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the video project",
                    }
                },
                "required": ["project_id"],
            },
            func=self._tool_get_project_status,
        )

        self.register_tool(
            name="get_latest_render",
            description="Get the latest render video for a project",
            parameters={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the video project",
                    }
                },
                "required": ["project_id"],
            },
            func=self._tool_get_latest_render,
        )

        self.register_tool(
            name="show_render_preview",
            description="Returns a preview/thumbnail of the latest render video for the project. Use this when the user asks to see the video, preview, or render.",
            parameters={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the video project",
                    }
                },
                "required": ["project_id"],
            },
            func=self._tool_show_render_preview,
        )

        # self.register_tool(
        #     name="start_new_render",
        #     description="Start a new video rendering process",
        #     parameters={
        #         "type": "object",
        #         "properties": {
        #             "project_id": {
        #                 "type": "string",
        #                 "description": "The ID of the video project",
        #             },
        #             "quality": {
        #                 "type": "string",
        #                 "description": "Rendering quality (draft, preview, final)",
        #                 "enum": ["draft", "preview", "final"],
        #             },
        #             "notes": {
        #                 "type": "string",
        #                 "description": "Optional notes about this render",
        #             },
        #         },
        #         "required": ["project_id", "quality"],
        #     },
        #     func=self._tool_start_new_render,
        # )

    def register_tool(
        self, name: str, description: str, parameters: Dict, func: Callable
    ):
        """Register a new tool for the agent"""
        self.tools.append(AgentTool(name, description, parameters, func))

    def _get_tool_definitions(self):
        """Convert tools to OpenAI tool format"""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
            for tool in self.tools
        ]

    def _tool_get_project_status(self, project_id: str) -> Dict:
        """Tool implementation: Get project state"""
        try:
            project = VideoProject.objects.get(id=project_id)
            return {
                "status": "success",
                "state": project.state,
                "project_status": project.status,
            }
        except VideoProject.DoesNotExist:
            return {"status": "error", "message": "Project not found"}
        except Exception as e:
            logger.exception(f"Error getting project state: {e}")
            return {"status": "error", "message": str(e)}

    def _tool_get_latest_render(self, project_id: str) -> Dict:
        """Tool implementation: Get latest render"""
        try:
            project = VideoProject.objects.get(id=project_id)
            latest_render = (
                RenderVideo.objects.filter(video_project=project)
                .order_by("-created_at")
                .first()
            )

            if not latest_render:
                return {
                    "status": "info",
                    "message": "No renders found for this project",
                }

            return {
                "status": "success",
                "render_id": str(latest_render.id),
                "render_status": latest_render.status,
                "url": latest_render.video_url if latest_render.video_url else None,
                "thumbnail_url": latest_render.thumbnail_url
                if latest_render.thumbnail_url
                else None,
                "created_at": latest_render.created_at.isoformat(),
            }
        except VideoProject.DoesNotExist:
            return {"status": "error", "message": "Project not found"}
        except Exception as e:
            logger.exception(f"Error getting latest render: {e}")
            return {"status": "error", "message": str(e)}

    def _tool_show_render_preview(self, project_id: str) -> Dict:
        """Tool implementation: Show render preview - returns a specialized response with thumbnail"""
        try:
            project = VideoProject.objects.get(id=project_id)
            latest_render = (
                RenderVideo.objects.filter(
                    video_project=project, status=RenderVideo.Status.GENERATED
                )
                .order_by("-created_at")
                .first()
            )

            if not latest_render:
                return {
                    "status": "info",
                    "message": "No generated renders available for preview",
                    "show_preview": False,
                }

            return {
                "status": "success",
                "message": "Render preview available",
                "show_preview": True,
                "render_id": str(latest_render.id),
                "thumbnail_url": latest_render.thumbnail_url,
                "player_url": f"/video-player/{latest_render.id}",
            }
        except VideoProject.DoesNotExist:
            return {"status": "error", "message": "Project not found"}
        except Exception as e:
            logger.exception(f"Error getting render preview: {e}")
            return {"status": "error", "message": str(e)}

    # def _tool_start_new_render(
    #     self, project_id: str, quality: str, notes: str = None
    # ) -> Dict:
    #     """Tool implementation: Start a new render"""
    #     try:
    #         project = VideoProject.objects.get(id=project_id)

    #         # Validate project has state data required for rendering
    #         if not project.state:
    #             return {
    #                 "status": "error",
    #                 "message": "Project doesn't have any state data required for rendering",
    #             }

    #         # Map quality to render settings
    #         quality_settings = {
    #             "draft": {"width": 640, "height": 360, "fps": 24, "bitrate": "1M"},
    #             "preview": {"width": 1280, "height": 720, "fps": 30, "bitrate": "5M"},
    #             "final": {"width": 1920, "height": 1080, "fps": 30, "bitrate": "8M"},
    #         }

    #         settings = quality_settings.get(quality, quality_settings["preview"])

    #         # Create render job
    #         render_service = RenderService()
    #         render_video = render_service.create_render_job(
    #             video_project=project,
    #             render_settings={
    #                 "width": settings["width"],
    #                 "height": settings["height"],
    #                 "fps": settings["fps"],
    #                 "bitrate": settings["bitrate"],
    #                 "format": "mp4",
    #             },
    #             notes=notes or f"Render initiated by AI assistant ({quality} quality)",
    #         )

    #         # Start the rendering process (this would typically be async)
    #         render_service.start_render_job(render_video.id)

    #         return {
    #             "status": "success",
    #             "message": f"New render job created with {quality} quality",
    #             "render_id": str(render_video.id),
    #         }

    #     except VideoProject.DoesNotExist:
    #         return {"status": "error", "message": "Project not found"}
    #     except Exception as e:
    #         logger.exception(f"Error starting new render: {e}")
    #         return {"status": "error", "message": str(e)}

    def process_message(self, project: VideoProject, user_message: str) -> ChatMessage:
        """Process a user message and return the agent's response"""
        try:
            # Remove the basic term-based matching - let the agent decide
            # when to use the show_render_preview tool based on context

            # Get chat history for context (last 10 messages)
            chat_messages = project.chat_messages or []
            recent_messages = (
                chat_messages[-10:] if len(chat_messages) > 10 else chat_messages
            )

            # Convert to OpenAI format
            messages = []
            for msg in recent_messages:
                role = "user" if msg.get("sender") == "user" else "assistant"
                messages.append({"role": role, "content": msg.get("message", "")})

            # Add system message
            system_message = {
                "role": "system",
                "content": f"You are an AI assistant helping with video project '{project.name}' with ID: {project.id}. Use the ID to access the project and its renders/exports. Video Renders, Exports, Renders are all the same thing. "
                f"You have access to tools to get and update the project state and access renders. "
                f"Current project status: {project.status}. "
                f"Be helpful, concise, and use tools when appropriate."
                f"This is very important, If the user asks for any project edits,  Please reply saying, I have taken a note of your request, and will update the project accordingly. Also, you should use the update_project_name tool to set project status as changes_requested. If the project is already in 'complete' state, let the user know that no changes can be done on this project, create a new one, or clone this project. "
                f"When a user asks to see a render, preview, or video, use the show_render_preview tool. This will display the video thumbnail in the chat. The thumbnail should be hyperlinked to the video player. thumbnail_url property should be used to create the <img> tag, not placeholder.com . The video can be viewed at /video-player/render.id",
            }
            messages.insert(0, system_message)

            # Add current user message
            messages.append({"role": "user", "content": user_message})

            # Call OpenAI API with tools
            response = self.client.chat.completions.create(
                model="gpt-4-turbo",  # Use appropriate model with tool calling
                messages=messages,
                tools=self._get_tool_definitions(),
                tool_choice="auto",
            )

            response_message = response.choices[0].message

            # Process tool calls if any
            if hasattr(response_message, "tool_calls") and response_message.tool_calls:
                # Execute tools and collect results
                tool_results = []
                for tool_call in response_message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)

                    # Find and execute the tool
                    for tool in self.tools:
                        if tool.name == tool_name:
                            result = tool.func(**tool_args)
                            tool_results.append({"tool": tool_name, "result": result})

                # Special handling for show_render_preview tool
                for result in tool_results:
                    if result["tool"] == "show_render_preview" and result["result"].get(
                        "show_preview"
                    ):
                        # Return a media message with the thumbnail
                        logger.info("returning latest render", result)
                        return ChatMessage(
                            sender="system",
                            message="Here's the latest render for your project:",
                            media={
                                "type": "video",
                                "id": result["result"]["render_id"],
                                "thumbnail_url": result["result"]["thumbnail_url"],
                            },
                            timestamp=datetime.utcnow().isoformat(),
                        )

                # Send follow-up to get final response with tool results
                messages.append(
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": response_message.tool_calls,
                    }
                )

                # Add tool results
                for idx, tool_call in enumerate(response_message.tool_calls):
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(tool_results[idx]["result"]),
                        }
                    )

                # Get final response
                final_response = self.client.chat.completions.create(
                    model="gpt-4-turbo", messages=messages
                )

                # Build agent message
                return ChatMessage(
                    sender="assistant",
                    message=final_response.choices[0].message.content,
                    timestamp=datetime.utcnow().isoformat(),
                    metadata={"used_tools": [t["tool"] for t in tool_results]},
                )

            # Return simple response if no tools were used
            return ChatMessage(
                sender="assistant",
                message=response_message.content,
                timestamp=datetime.utcnow().isoformat(),
            )

        except Exception as e:
            logger.exception(f"Error processing message with agent: {e}")
            return ChatMessage(
                sender="assistant",
                message="I apologize, but I encountered an error processing your request. Please try again.",
                timestamp=datetime.utcnow().isoformat(),
            )

