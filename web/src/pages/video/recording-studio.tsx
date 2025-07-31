import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DailyIframe, { DailyCall, DailyEventObject } from "@daily-co/daily-js";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { ddApiClient } from "@/lib/api-client";

import {
  Copy,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  StopCircle,
  Share2,
  Check,
  Camera,
} from "lucide-react";

interface ParticipantInfo {
  id: string;
  name: string;
  isLocal: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

// Define a looser type for Daily participants
interface DailyParticipantLike {
  session_id?: string;
  user_name?: string;
  local?: boolean;
  video?: boolean;
  audio?: boolean;
}

interface RecordingData {
  id: string;
  name: string;
  daily_room_name: string;
  daily_room_url: string;
  status: string;
  daily_recording_id?: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  created_at: string;
  updated_at: string;
}

interface RoomData {
  id: string;
  name: string;
  daily_room_name: string;
  daily_room_url: string;
}

const RecordingStudio = () => {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const dailyCallRef = useRef<DailyCall | null>(null);
  const callFrameContainerRef = useRef<HTMLDivElement>(null);

  // Fetch recording or room data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        if (recordingId) {
          // Fetch specific recording
          const response = await ddApiClient.get(
            `/api/recordings/${recordingId}/`,
          );
          setRecording(response.data);
          setRoomData({
            id: response.data.room.id,
            name: response.data.room.name,
            daily_room_name: response.data.daily_room_name,
            daily_room_url: response.data.daily_room_url,
          });
        } else {
          // Fetch active room info
          const response = await ddApiClient.get("/api/rooms/active_room/");
          setRoomData(response.data.room);
          if (response.data.active_recording) {
            setRecording(response.data.active_recording);
          }
        }

        setError(null);
      } catch (err) {
        console.error("Failed to fetch recording info:", err);
        setError("Failed to load recording session information.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [recordingId]);

  // Initialize Daily call
  useEffect(() => {
    if (!roomData || !callFrameContainerRef.current) return;

    try {
      const callFrame = DailyIframe.createFrame(callFrameContainerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "8px",
        },
        showLeaveButton: false,
        showFullscreenButton: true,
      });

      callFrame
        .on("joined-meeting", handleJoinedMeeting)
        .on("participant-joined", handleParticipantUpdate)
        .on("participant-updated", handleParticipantUpdate)
        .on("participant-left", handleParticipantLeft)
        .on("recording-started", () => setIsRecording(true))
        .on("recording-stopped", () => setIsRecording(false))
        .on("error", (e: DailyEventObject) => {
          console.error("Daily error:", e);
          setError(`Daily error: ${e.errorMsg || "Unknown error"}`);
        });

      callFrame.join({ url: roomData.daily_room_url });
      dailyCallRef.current = callFrame;

      return () => {
        if (dailyCallRef.current) {
          dailyCallRef.current.destroy();
        }
      };
    } catch (err) {
      console.error("Failed to initialize Daily:", err);
      setError("Failed to initialize video call.");
    }
  }, [roomData]);

  const handleJoinedMeeting = useCallback((event: DailyEventObject) => {
    if (!event.participants) return;

    const participants = event.participants;
    const participantsInfo: ParticipantInfo[] = Object.values(participants).map(
      (participant: DailyParticipantLike) => ({
        id: participant.session_id || "",
        name: participant.user_name || "Guest",
        isLocal: !!participant.local,
        videoEnabled: !!participant.video,
        audioEnabled: !!participant.audio,
      }),
    );
    setParticipants(participantsInfo);
  }, []);

  const handleParticipantUpdate = useCallback((event: DailyEventObject) => {
    const participant = event.participant;
    setParticipants((prevParticipants) => {
      // Check if the participant already exists
      const exists = prevParticipants.some(
        (p) => p.id === participant.session_id,
      );
      if (exists) {
        // Update the existing participant
        return prevParticipants.map((p) =>
          p.id === participant.session_id
            ? {
                ...p,
                name: participant.user_name || "Guest",
                videoEnabled: participant.video,
                audioEnabled: participant.audio,
              }
            : p,
        );
      } else {
        // Add the new participant
        return [
          ...prevParticipants,
          {
            id: participant.session_id,
            name: participant.user_name || "Guest",
            isLocal: participant.local,
            videoEnabled: participant.video,
            audioEnabled: participant.audio,
          },
        ];
      }
    });
  }, []);

  const handleParticipantLeft = useCallback((event: DailyEventObject) => {
    const participant = event.participant;
    setParticipants((prevParticipants) =>
      prevParticipants.filter((p) => p.id !== participant.session_id),
    );
  }, []);

  const toggleVideo = useCallback(() => {
    if (!dailyCallRef.current) return;

    if (videoEnabled) {
      dailyCallRef.current.setLocalVideo(false);
    } else {
      dailyCallRef.current.setLocalVideo(true);
    }

    setVideoEnabled(!videoEnabled);
  }, [videoEnabled]);

  const toggleAudio = useCallback(() => {
    if (!dailyCallRef.current) return;

    if (audioEnabled) {
      dailyCallRef.current.setLocalAudio(false);
    } else {
      dailyCallRef.current.setLocalAudio(true);
    }

    setAudioEnabled(!audioEnabled);
  }, [audioEnabled]);

  const leaveCall = useCallback(() => {
    if (dailyCallRef.current) {
      dailyCallRef.current.leave();
      navigate("/dashboard");
    }
  }, [navigate]);

  const copyRoomLink = useCallback(() => {
    if (!roomData) return;

    navigator.clipboard.writeText(roomData.daily_room_url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [roomData]);

  const startRecording = useCallback(async () => {
    if (!dailyCallRef.current || (!recordingId && !roomData)) return;

    try {
      let recordingToUse = recording;

      // If no recording exists yet, create one
      if (!recordingToUse) {
        const timestamp = new Date().toLocaleString().replace(/[/,:]/g, "-");
        const createResponse = await ddApiClient.post("/api/recordings/", {
          name: `Recording Session ${timestamp}`,
        });
        recordingToUse = createResponse.data;
        setRecording(recordingToUse);
      }

      if (!recordingToUse) {
        throw new Error("Failed to create or retrieve recording");
      }

      // Start the recording
      await ddApiClient.post(
        `/api/recordings/${recordingToUse.id}/start_recording/`,
      );
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to start recording. Please try again.");
    }
  }, [recordingId, roomData, recording]);

  const stopRecording = useCallback(async () => {
    if (!dailyCallRef.current || !recording) return;

    try {
      await ddApiClient.post(`/api/recordings/${recording.id}/stop_recording/`);
      setIsRecording(false);
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setError("Failed to stop recording. Please try again.");
    }
  }, [recording]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-96 w-full mb-4" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>{recording?.name || "Recording Studio"}</CardTitle>
            <CardDescription>
              Room Link:
              <div className="flex items-center mt-1">
                <Input
                  value={roomData?.daily_room_url || ""}
                  readOnly
                  className="mr-2"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyRoomLink}
                      >
                        {isCopied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isCopied ? "Copied!" : "Copy room link"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={() =>
                          window.open(
                            `mailto:?subject=Join my recording session&body=Please join my recording session at: ${roomData?.daily_room_url}`,
                          )
                        }
                      >
                        <Share2 size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share via email</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={callFrameContainerRef}
              className="w-full rounded-md bg-black aspect-video"
            />
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="text-sm bg-muted p-2 rounded-md flex items-center gap-2"
                >
                  <span>{participant.name}</span>
                  {participant.isLocal && (
                    <span className="text-xs">(You)</span>
                  )}
                  {!participant.videoEnabled && <VideoOff size={16} />}
                  {!participant.audioEnabled && <MicOff size={16} />}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                className={!videoEnabled ? "bg-red-100 dark:bg-red-900" : ""}
              >
                {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleAudio}
                className={!audioEnabled ? "bg-red-100 dark:bg-red-900" : ""}
              >
                {audioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              </Button>
            </div>
            <div className="flex gap-2">
              {isRecording ? (
                <Button
                  variant="destructive"
                  onClick={stopRecording}
                  className="flex items-center"
                >
                  <StopCircle size={16} className="mr-2" />
                  Stop Recording
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={startRecording}
                  className="flex items-center"
                >
                  <Camera size={16} className="mr-2" />
                  Start Recording
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={leaveCall}
                className="flex items-center"
              >
                <PhoneOff size={16} className="mr-2" />
                Leave
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RecordingStudio;
