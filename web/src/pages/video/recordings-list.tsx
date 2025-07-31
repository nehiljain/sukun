import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ddApiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Eye, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Recording {
  id: string;
  name: string;
  daily_room_name: string;
  daily_room_url: string;
  status: string;
  recording_started_at: string | null;
  recording_ended_at: string | null;
  created_at: string;
  updated_at: string;
}

const RecordingsList = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        setIsLoading(true);
        const response = await ddApiClient.get(
          "/api/recordings/list_room_recordings/",
        );
        setRecordings(response.data);
      } catch (err) {
        console.error("Failed to fetch recordings:", err);
        setError("Failed to load recordings. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecordings();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
          >
            Active
          </Badge>
        );
      case "recording":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          >
            Recording
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
          >
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (startDate: string, endDate: string | null) => {
    if (!startDate || !endDate) return "N/A";

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();

    // Format duration as mm:ss
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleJoinStudio = () => {
    navigate("/studio/recording");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Recordings</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recordings</h1>
        <Button onClick={handleJoinStudio}>
          <Video className="mr-2 h-4 w-4" />
          Join Recording Studio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Recording Sessions</CardTitle>
          <CardDescription>
            View and manage your recording sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recordings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No recordings found. Start a new recording session.
              </p>
              <Button className="mt-4" onClick={handleJoinStudio}>
                <Video className="mr-2 h-4 w-4" />
                Join Recording Studio
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordings.map((recording) => (
                  <TableRow key={recording.id}>
                    <TableCell className="font-medium">
                      {recording.name}
                    </TableCell>
                    <TableCell>{getStatusBadge(recording.status)}</TableCell>
                    <TableCell>
                      {format(
                        new Date(recording.created_at),
                        "MMM d, yyyy h:mm a",
                      )}
                    </TableCell>
                    <TableCell>
                      {recording.recording_started_at &&
                      recording.recording_ended_at
                        ? formatDuration(
                            recording.recording_started_at,
                            recording.recording_ended_at,
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {recording.status === "active" ||
                      recording.status === "recording" ? (
                        <Button size="sm" variant="default" asChild>
                          <Link to={`/studio/recording/${recording.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Join
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Completed
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecordingsList;
