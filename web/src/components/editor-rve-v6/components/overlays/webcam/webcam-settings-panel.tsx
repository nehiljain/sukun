/**
 * WebcamSettingsPanel Component
 *
 * A component that provides settings for webcam recording, including
 * device selection and playback options.
 *
 * @component
 */

import React from "react";
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

interface WebcamSettingsPanelProps {
  mutePlayerDuringRecording: boolean;
  setMutePlayerDuringRecording: (mute: boolean) => void;
  continuePlayingDuringRecording: boolean;
  setContinuePlayingDuringRecording: (continuePlaying: boolean) => void;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  selectedVideoDevice: string;
  setSelectedVideoDevice: (deviceId: string) => void;
  selectedAudioDevice: string;
  setSelectedAudioDevice: (deviceId: string) => void;
  isRecording: boolean;
}

export const WebcamSettingsPanel: React.FC<WebcamSettingsPanelProps> = ({
  mutePlayerDuringRecording,
  setMutePlayerDuringRecording,
  continuePlayingDuringRecording,
  setContinuePlayingDuringRecording,
  videoDevices,
  audioDevices,
  selectedVideoDevice,
  setSelectedVideoDevice,
  selectedAudioDevice,
  setSelectedAudioDevice,
  isRecording,
}) => {
  return (
    <div className="space-y-4">
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
                  {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
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
    </div>
  );
};
