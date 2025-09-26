import hashlib
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

from celery import shared_task
from django.utils import timezone
from user_org.models import AppUser

from .services import GmailService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def search_and_export_emails(
    self,
    user_id: int,
    search_query: str,
    max_results: int = 100,
    export_id: Optional[str] = None,
) -> Dict:
    """
    Search Gmail emails and export each as individual JSON files.

    Args:
        user_id: ID of the user requesting the export
        search_query: Gmail search query (supports Gmail search syntax)
        max_results: Maximum number of emails to export (default 100)
        export_id: Optional export ID for tracking

    Returns:
        Dict with export results and file paths
    """
    try:
        # Get user
        try:
            app_user = AppUser.objects.get(id=user_id)
        except AppUser.DoesNotExist as e:
            raise ValueError(f"User with ID {user_id} not found") from e

        # Validate search query (basic validation)
        if not search_query or not search_query.strip():
            raise ValueError("Search query cannot be empty")

        # Add date restriction to prevent exports older than 1 week
        one_week_ago = (timezone.now() - timedelta(days=7)).strftime("%Y/%m/%d")
        enhanced_query = f"{search_query.strip()} after:{one_week_ago}"

        # Create export directory structure
        query_hash = hashlib.md5(search_query.encode()).hexdigest()[:8]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_dir = f"data/{user_id}/exports/{query_hash}_{timestamp}"
        os.makedirs(export_dir, exist_ok=True)

        logger.info(f"Starting email export for user {user_id}, query: {search_query}")

        # Initialize Gmail service
        gmail_service = GmailService(app_user)

        # Get messages from Gmail
        messages = gmail_service.get_messages(
            query=enhanced_query,
            max_results=min(max_results, 500),  # Respect Gmail API limits
        )

        if not messages:
            return {
                "success": True,
                "message": "No emails found matching the search criteria",
                "export_id": export_id,
                "export_dir": export_dir,
                "email_count": 0,
                "files": [],
            }

        # Export each email as individual JSON file
        exported_files = []
        total_emails = len(messages)

        for i, message in enumerate(messages):
            try:
                # Create filename from message ID and timestamp
                message_id = message.get("message_id", f"unknown_{i}")
                filename = f"{message_id}.json"
                filepath = os.path.join(export_dir, filename)

                # Prepare email data for export with full content
                email_data = {
                    "export_metadata": {
                        "export_id": export_id,
                        "exported_at": timezone.now().isoformat(),
                        "search_query": search_query,
                        "enhanced_query": enhanced_query,
                        "user_id": user_id,
                        "user_email": app_user.user.email,
                        "export_dir": export_dir,
                    },
                    "email_data": {
                        # Basic message info
                        "message_id": message.get("message_id"),
                        "thread_id": message.get("thread_id"),
                        "subject": message.get("subject", ""),
                        "snippet": message.get("snippet", ""),
                        "labels": message.get("labels", []),
                        "received_at": message.get("received_at").isoformat()
                        if message.get("received_at")
                        else None,
                        "is_important": message.get("is_important", False),
                        "is_archived": message.get("is_archived", False),
                        "size_estimate": message.get("size_estimate", 0),
                        "history_id": message.get("history_id", ""),
                        # Sender/Recipient info
                        "sender": message.get("sender", ""),
                        "sender_name": message.get("sender_name", ""),
                        "to": message.get("to", ""),
                        "cc": message.get("cc", ""),
                        "bcc": message.get("bcc", ""),
                        "reply_to": message.get("reply_to", ""),
                        # Message threading
                        "message_id_header": message.get("message_id_header", ""),
                        "references": message.get("references", ""),
                        "in_reply_to": message.get("in_reply_to", ""),
                        "date": message.get("date", ""),
                        # Full headers
                        "raw_headers": message.get("raw_headers", []),
                        # Complete message content
                        "full_content": message.get("full_content", {}),
                    },
                }

                # Write to JSON file
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(email_data, f, indent=2, ensure_ascii=False)

                exported_files.append(
                    {
                        "filename": filename,
                        "filepath": filepath,
                        "message_id": message_id,
                        "subject": message.get("subject", ""),
                        "sender": message.get("sender", ""),
                        "received_at": message.get("received_at").isoformat()
                        if message.get("received_at")
                        else None,
                    }
                )

                # Update progress
                progress = int((i + 1) / total_emails * 100)
                self.update_state(
                    state="PROGRESS",
                    meta={
                        "current": i + 1,
                        "total": total_emails,
                        "progress": progress,
                        "status": f"Exported {i + 1} of {total_emails} emails",
                    },
                )

                logger.info(f"Exported email {i + 1}/{total_emails}: {filename}")

            except Exception as e:
                logger.error(f"Error exporting email {i + 1}: {e}")
                continue

        # Create summary file
        summary_data = {
            "export_summary": {
                "export_id": export_id,
                "exported_at": timezone.now().isoformat(),
                "search_query": search_query,
                "enhanced_query": enhanced_query,
                "user_id": user_id,
                "user_email": app_user.user.email,
                "total_emails_found": total_emails,
                "total_emails_exported": len(exported_files),
                "export_dir": export_dir,
                "export_duration_seconds": None,  # Could be calculated if needed
            },
            "exported_files": exported_files,
        }

        summary_filepath = os.path.join(export_dir, "export_summary.json")
        with open(summary_filepath, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, indent=2, ensure_ascii=False)

        logger.info(
            f"Email export completed: {len(exported_files)} emails exported to {export_dir}"
        )

        return {
            "success": True,
            "message": f"Successfully exported {len(exported_files)} emails",
            "export_id": export_id,
            "export_dir": export_dir,
            "email_count": len(exported_files),
            "files": exported_files,
            "summary_file": summary_filepath,
        }

    except Exception as e:
        logger.error(f"Error in email export task: {e}")
        self.update_state(
            state="FAILURE", meta={"error": str(e), "status": "Export failed"}
        )
        raise
