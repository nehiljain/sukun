import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GmailStatus {
  connected: boolean;
  connected_at: string | null;
  expires_at: string | null;
}

interface GmailDashboardCardProps {
  className?: string;
}

export function GmailDashboardCard({ className }: GmailDashboardCardProps) {
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  // Check Gmail connection status
  const checkGmailStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gmail/status', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setGmailStatus(data);
      } else {
        console.error('Failed to check Gmail status');
        setGmailStatus({ connected: false, connected_at: null, expires_at: null });
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setGmailStatus({ connected: false, connected_at: null, expires_at: null });
    } finally {
      setLoading(false);
    }
  };

  // Connect to Gmail
  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      // Redirect to Gmail OAuth
      window.location.href = '/auth/gmail';
    } catch (error) {
      console.error('Error connecting to Gmail:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Gmail. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  // Handle successful Gmail connection
  const handleGmailSuccess = () => {
    toast({
      title: "Gmail Connected",
      description: "Your Gmail account has been successfully connected!",
    });
    checkGmailStatus();
  };

  // Check for Gmail connection success/error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_connected') === 'true') {
      handleGmailSuccess();
    } else if (urlParams.get('error') === 'gmail_auth_failed') {
      const message = urlParams.get('message') || 'Gmail authentication failed';
      toast({
        title: "Gmail Connection Failed",
        description: message,
        variant: "destructive",
      });
    }
    
    // Clean up URL parameters
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);

  // Check Gmail status on component mount
  useEffect(() => {
    checkGmailStatus();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Checking Gmail status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gmailStatus?.connected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Gmail Connected
          </CardTitle>
          <CardDescription>
            Your Gmail account is connected and ready to use.
            {gmailStatus.connected_at && (
              <span className="block text-xs text-muted-foreground mt-1">
                Connected on {new Date(gmailStatus.connected_at).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/gmail'}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Open Gmail Dashboard
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/api/gmail/messages'}
            className="w-full"
          >
            View Recent Messages
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Connect Gmail
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to start managing your emails with AI-powered features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleConnectGmail} 
          disabled={connecting}
          className="w-full"
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Connect Gmail
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          This will open Google's secure authentication page where you can grant permission to access your Gmail.
        </p>
      </CardContent>
    </Card>
  );
}
