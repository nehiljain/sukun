import React, { useState, useEffect } from 'react';
import { GmailConnect } from '@/components/gmail/GmailConnect';
import { GmailMessages } from '@/components/gmail/GmailMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function GmailDashboard() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('is:inbox');
  const { toast } = useToast();

  // Check if Gmail is connected
  useEffect(() => {
    checkGmailConnection();
  }, []);

  const checkGmailConnection = async () => {
    try {
      // This would be an API call to check if user has Gmail connected
      // For now, we'll assume it's not connected
      setIsConnected(false);
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    }
  };

  const handleConnectGmail = () => {
    window.location.href = '/auth/gmail';
  };

  const fetchMessages = async (query: string = searchQuery) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gmail/messages?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Gmail messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (messageId: string) => {
    try {
      const response = await fetch(`/api/gmail/messages/${messageId}/archive`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to archive message');
      }
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, is_archived: true }
            : msg
        )
      );
      
      toast({
        title: "Success",
        description: "Message archived successfully",
      });
    } catch (error) {
      console.error('Error archiving message:', error);
      toast({
        title: "Error",
        description: "Failed to archive message",
        variant: "destructive",
      });
    }
  };

  const handleMarkImportant = async (messageId: string, important: boolean) => {
    try {
      const response = await fetch(`/api/gmail/messages/${messageId}/important`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ important }),
      });
      if (!response.ok) {
        throw new Error('Failed to update message importance');
      }
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, is_important: important }
            : msg
        )
      );
      
      toast({
        title: "Success",
        description: `Message ${important ? 'marked as' : 'unmarked as'} important`,
      });
    } catch (error) {
      console.error('Error updating message importance:', error);
      toast({
        title: "Error",
        description: "Failed to update message importance",
        variant: "destructive",
      });
    }
  };

  const handleCreateDraft = async (messageId: string) => {
    try {
      // Find the message to get sender info
      const message = messages.find(msg => msg.message_id === messageId);
      if (!message) return;

      const response = await fetch('/api/gmail/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: message.sender,
          subject: `Re: ${message.subject}`,
          body: 'Draft reply...',
          thread_id: message.thread_id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create draft');
      }
      
      toast({
        title: "Success",
        description: "Draft created successfully",
      });
    } catch (error) {
      console.error('Error creating draft:', error);
      toast({
        title: "Error",
        description: "Failed to create draft",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(searchQuery);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <GmailConnect 
            isConnected={isConnected}
            onConnect={handleConnectGmail}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gmail Dashboard</CardTitle>
            <CardDescription>
              Manage your Gmail messages with AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search messages (e.g., is:inbox, from:example@gmail.com)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fetchMessages()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </form>
          </CardContent>
        </Card>

        <GmailMessages
          messages={messages}
          onArchive={handleArchive}
          onMarkImportant={handleMarkImportant}
          onCreateDraft={handleCreateDraft}
          loading={loading}
        />
      </div>
    </div>
  );
}
