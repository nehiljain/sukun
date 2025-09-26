import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ddApiClient } from '@/lib/api-client';

interface GmailExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportStatus {
  task_id: string;
  status: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';
  message: string;
  progress?: number;
  current?: number;
  total?: number;
  export_id?: string;
  export_dir?: string;
  email_count?: number;
  files?: Array<{
    filename: string;
    filepath: string;
    message_id: string;
    subject: string;
    sender: string;
    received_at: string;
  }>;
  summary_file?: string;
  error?: string;
}

export function GmailExportModal({ isOpen, onClose }: GmailExportModalProps) {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [maxResults, setMaxResults] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();


  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Poll for export status
  const pollExportStatus = async (taskId: string) => {
    try {
      const response = await ddApiClient.get(`/api/gmail/export/status/${taskId}/`);
      const status = response.data;
      setExportStatus(status);
      
      if (status.status === 'SUCCESS' || status.status === 'FAILURE') {
        setIsExporting(false);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        if (status.status === 'SUCCESS') {
          toast({
            title: "Export Completed",
            description: `Successfully exported ${status.email_count} emails`,
          });
        } else {
          toast({
            title: "Export Failed",
            description: status.error || "Unknown error occurred",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error polling export status:', error);
    }
  };

  // Start export
  const handleStartExport = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to export emails",
        variant: "destructive",
      });
      return;
    }

    if (!searchQuery.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter a search query to export emails",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportStatus(null);

    try {
      const response = await ddApiClient.post('/api/gmail/export', {
        search_query: searchQuery,
        max_results: maxResults,
      });

      const data = response.data;
      setExportStatus({
        task_id: data.task_id,
        status: 'PENDING',
        message: 'Export started successfully',
      });
      
      // Start polling for status
      const interval = setInterval(() => {
        pollExportStatus(data.task_id);
      }, 2000);
      setPollingInterval(interval);
      
      toast({
        title: "Export Started",
        description: "Email export has been started. You can close this modal and check back later.",
      });
    } catch (error: any) {
      console.error('Error starting export:', error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to start export";
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsExporting(false);
    }
  };

  // Download export files
  const handleDownloadExport = () => {
    if (exportStatus?.export_dir) {
      // For now, we'll show the export directory path
      // In a real implementation, you might want to create a zip file or provide direct download links
      toast({
        title: "Export Ready",
        description: `Files saved to: ${exportStatus.export_dir}`,
      });
    }
  };

  // Reset modal state
  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setSearchQuery('');
    setMaxResults(100);
    setIsExporting(false);
    setExportStatus(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Gmail Emails</DialogTitle>
          <DialogDescription>
            Search and export your Gmail emails as individual JSON files.
            Supports Gmail search syntax (e.g., "from:example.com is:unread after:2024/01/01").
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-query">Search Query</Label>
            <Input
              id="search-query"
              placeholder="e.g., is:inbox from:example.com"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isExporting}
            />
            <p className="text-xs text-muted-foreground">
              Use Gmail search syntax. Emails older than 1 week will be excluded.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-results">Maximum Results</Label>
            <Input
              id="max-results"
              type="number"
              min="1"
              max="500"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value) || 100)}
              disabled={isExporting}
            />
          </div>

          {/* Export Status */}
          {exportStatus && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {exportStatus.status === 'PENDING' && <Loader2 className="h-4 w-4 animate-spin" />}
                {exportStatus.status === 'PROGRESS' && <Loader2 className="h-4 w-4 animate-spin" />}
                {exportStatus.status === 'SUCCESS' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {exportStatus.status === 'FAILURE' && <AlertCircle className="h-4 w-4 text-red-600" />}
                <Badge variant={
                  exportStatus.status === 'SUCCESS' ? 'default' :
                  exportStatus.status === 'FAILURE' ? 'destructive' :
                  'secondary'
                }>
                  {exportStatus.status}
                </Badge>
                <span className="text-sm">{exportStatus.message}</span>
              </div>

              {exportStatus.status === 'PROGRESS' && exportStatus.progress !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{exportStatus.progress}%</span>
                  </div>
                  <Progress value={exportStatus.progress} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    {exportStatus.current} of {exportStatus.total} emails processed
                  </p>
                </div>
              )}

              {exportStatus.status === 'SUCCESS' && (
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>{exportStatus.email_count}</strong> emails exported successfully
                  </p>
                  <Button
                    onClick={handleDownloadExport}
                    size="sm"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Export
                  </Button>
                </div>
              )}

              {exportStatus.status === 'FAILURE' && (
                <p className="text-sm text-red-600">
                  Error: {exportStatus.error || 'Unknown error occurred'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExporting && exportStatus?.status === 'PROGRESS'}
          >
            {isExporting ? 'Close (Export Running)' : 'Cancel'}
          </Button>
          <Button
            onClick={handleStartExport}
            disabled={isExporting || !searchQuery.trim()}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              'Start Export'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
