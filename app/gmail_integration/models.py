from django.db import models
from user_org.models import AppUser


class GmailToken(models.Model):
    """Store Gmail-specific OAuth tokens for each user"""
    user = models.OneToOneField(AppUser, on_delete=models.CASCADE, related_name='gmail_token')
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True, null=True)
    token_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gmail_tokens'


class GmailMessage(models.Model):
    """Cache Gmail messages for faster access"""
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='gmail_messages')
    message_id = models.CharField(max_length=255, unique=True)
    thread_id = models.CharField(max_length=255)
    subject = models.TextField(blank=True)
    sender = models.EmailField()
    snippet = models.TextField(blank=True)
    is_important = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    labels = models.JSONField(default=list)
    received_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gmail_messages'
        indexes = [
            models.Index(fields=['user', 'is_important']),
            models.Index(fields=['user', 'is_archived']),
            models.Index(fields=['received_at']),
        ]
