from django.urls import path
from . import views

urlpatterns = [
    # Gmail OAuth
    path('auth/gmail', views.GmailAuthView.as_view(), name='gmail_auth'),
    path('auth/gmail/callback', views.gmail_callback, name='gmail_callback'),
    
    # Gmail API endpoints
    path('api/gmail/messages', views.GmailMessagesView.as_view(), name='gmail_messages'),
    path('api/gmail/messages/<str:message_id>/archive', views.GmailArchiveView.as_view(), name='gmail_archive'),
    path('api/gmail/drafts', views.GmailDraftView.as_view(), name='gmail_draft'),
    path('api/gmail/messages/<str:message_id>/important', views.GmailImportantView.as_view(), name='gmail_important'),
]
