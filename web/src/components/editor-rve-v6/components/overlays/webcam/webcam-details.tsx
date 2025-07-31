/**
 * WebcamDetails Component
 *
 * A component that provides a user interface for configuring webcam recording settings.
 * It displays recording controls and options for customizing the recording experience.
 */

import React, { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface WebcamDetailsProps {
  /** Whether recording is currently in progress */
  isRecording: boolean;
  /** Callback to start recording */
  onStartRecording: () => void;
  /** Callback to stop recording */
  onStopRecording: () => void;
  /** Whether to mute the player during recording */
  mutePlayerDuringRecording: boolean;
  /** Callback to update mute setting */
  setMutePlayerDuringRecording: (mute: boolean) => void;
  /** Whether to continue playing the video during recording */
  continuePlayingDuringRecording: boolean;
  /** Callback to update continue playing setting */
  setContinuePlayingDuringRecording: (continuePlaying: boolean) => void;
  /** Reference to the video preview element */
  videoPreviewRef: React.RefObject<HTMLVideoElement>;
}

export const WebcamDetails: React.FC<WebcamDetailsProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  mutePlayerDuringRecording,
  setMutePlayerDuringRecording,
  continuePlayingDuringRecording,
  setContinuePlayingDuringRecording,
  videoPreviewRef,
}) => {
  // State for available devices
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  // Fetch available media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission to access devices first
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput",
        );
        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput",
        );

        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);

        // Set default selections if available
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }

        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    getDevices();
  }, []);

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Recording Controls</h4>

        <Button
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={`w-full ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
          }`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>

        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {showSettings && (
        <>
          <Separator />

          {/* Playback Options */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Playback Options</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="mute-player" className="text-xs">
                Mute player during recording
              </Label>
              <Switch
                id="mute-player"
                checked={mutePlayerDuringRecording}
                onCheckedChange={setMutePlayerDuringRecording}
                disabled={isRecording}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="continue-playing" className="text-xs">
                Continue playing during recording
              </Label>
              <Switch
                id="continue-playing"
                checked={continuePlayingDuringRecording}
                onCheckedChange={setContinuePlayingDuringRecording}
                disabled={isRecording}
              />
            </div>
          </div>

          <Separator />

          {/* Input Devices */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Input Devices</h4>

            <div className="space-y-2">
              <Label htmlFor="video-device" className="text-xs">
                Camera
              </Label>
              <Select
                value={selectedVideoDevice}
                onValueChange={setSelectedVideoDevice}
                disabled={isRecording || videoDevices.length === 0}
              >
                <SelectTrigger id="video-device" className="w-full text-xs">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-xs"
                    >
                      {device.label ||
                        `Camera ${videoDevices.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio-device" className="text-xs">
                Microphone
              </Label>
              <Select
                value={selectedAudioDevice}
                onValueChange={setSelectedAudioDevice}
                disabled={isRecording || audioDevices.length === 0}
              >
                <SelectTrigger id="audio-device" className="w-full text-xs">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-xs"
                    >
                      {device.label ||
                        `Microphone ${audioDevices.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
