import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ExternalLink } from 'lucide-react';

interface GmailConnectProps {
  isConnected: boolean;
  onConnect: () => void;
}

export function GmailConnect({ isConnected, onConnect }: GmailConnectProps) {
  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            Gmail Connected
          </CardTitle>
          <CardDescription>
            Your Gmail account is connected and ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.href = '/api/gmail/messages'}>
            View Messages
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Connect Gmail
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to start managing your emails with AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onConnect} className="w-full">
          <Mail className="mr-2 h-4 w-4" />
          Connect Google
        </Button>
      </CardContent>
    </Card>
  );
}
