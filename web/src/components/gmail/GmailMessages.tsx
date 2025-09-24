import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Archive, Star, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GmailMessage {
  id: number;
  message_id: string;
  thread_id: string;
  subject: string;
  sender: string;
  snippet: string;
  is_important: boolean;
  is_archived: boolean;
  labels: string[];
  received_at: string;
}

interface GmailMessagesProps {
  messages: GmailMessage[];
  onArchive: (messageId: string) => void;
  onMarkImportant: (messageId: string, important: boolean) => void;
  onCreateDraft: (messageId: string) => void;
  loading?: boolean;
}

export function GmailMessages({ 
  messages, 
  onArchive, 
  onMarkImportant, 
  onCreateDraft, 
  loading = false 
}: GmailMessagesProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading messages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
          <p className="mt-1 text-sm text-gray-500">
            No messages found in your inbox.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card key={message.id} className={`${message.is_important ? 'border-yellow-200 bg-yellow-50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {message.subject || '(No Subject)'}
                  </h3>
                  {message.is_important && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Star className="h-3 w-3 mr-1" />
                      Important
                    </Badge>
                  )}
                  {message.is_archived && (
                    <Badge variant="outline">
                      Archived
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-1">
                  From: {message.sender}
                </p>
                
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                  {message.snippet}
                </p>
                
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(message.received_at), { addSuffix: true })}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkImportant(message.message_id, !message.is_important)}
                >
                  <Star className={`h-4 w-4 ${message.is_important ? 'fill-yellow-400 text-yellow-600' : ''}`} />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateDraft(message.message_id)}
                >
                  <Reply className="h-4 w-4" />
                </Button>
                
                {!message.is_archived && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onArchive(message.message_id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
