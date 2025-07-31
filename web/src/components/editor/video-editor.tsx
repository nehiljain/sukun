import React, { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { Button } from "@/components/ui/button";

// Import components
import { TopToolbar } from "./components/TopToolbar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Timeline } from "./components/Timeline";
import { CommentPanel } from "./components/CommentPanel";
import { CursorOverlay } from "./components/CursorOverlay";
import { VideoPreview } from "./components/VideoPreview";
import { Main } from "./components/Main";

// Import hooks
import { useTracks } from "./hooks/use-tracks";
import { useVideoPlayer } from "./hooks/use-video-player";
import { useComments } from "./hooks/use-comments";
import { useWebcamRecording } from "../editor-rve-v6/hooks/use-webcam-recording";
import { useSaveState } from "./hooks/use-save-state";
import { useRendering } from "./hooks/use-rendering";

// Import contexts
import { EditorProvider } from "./contexts/editor-context";
import { CommentProvider } from "./contexts/comment-context";

// Import types
import { VideoAsset } from "./types";
import { Track } from "./types"; // Import Track type or define it here

export interface VideoEditorProps {
  videoProjectId: string;
  videoAsset: VideoAsset | null;
  videoAssetId: string;
  initialTracks?: Track[];
  onSaveComplete?: () => void;
}

// Main VideoEditor component
const VideoEditor: React.FC<VideoEditorProps> = ({
  videoProjectId,
  videoAsset,
  videoAssetId,
  initialTracks = [],
  onSaveComplete,
}) => {
  const fps = 30;

  // Use our custom hooks
  const {
    tracks,
    setTracks,
    selectedItem,
    setSelectedItem,
    durationInFrames,
    handleAddItem: addItem,
    handleUpdateItem,
    handleDeleteItem,
  } = useTracks();

  const {
    currentFrame,
    playerRef,
    cursorPosition,
    playerDimensions,
    playerContainerRef,
    handleMouseMove,
    handleMouseLeave,
  } = useVideoPlayer(fps);

  const {
    comments,
    setComments,
    isCommentPanelOpen,
    setIsCommentPanelOpen,
    handleAddNewComment,
    handleTakeAction,
  } = useComments(currentFrame, videoAssetId);

  const { isSaving, handleSave } = useSaveState(
    videoProjectId,
    tracks,
    durationInFrames,
    fps,
  );

  const { isRendering, handleRenderVideo } = useRendering(
    videoAssetId,
    tracks,
    durationInFrames,
    fps,
    handleSave,
  );

  const {
    isRecording,
    startRecording,
    stopRecording,
    cleanupAudio,
    attachVideoPreview,
  } = useWebcamRecording(videoAssetId, currentFrame, setTracks);

  // Create a wrapper for handleAddItem to match expected interface
  const handleAddItem = (type: string) => {
    addItem(type, currentFrame);
  };

  // Initialize with provided tracks or default to video URL if available
  useEffect(() => {
    if (initialTracks && initialTracks.length > 0) {
      setTracks(initialTracks);
    } else if (videoAsset?.video_url) {
      setTracks((prev) => {
        const newTracks = [...prev];
        newTracks[0] = {
          ...newTracks[0],
          items: [
            {
              id: "main-video",
              from: 0,
              durationInFrames: 300, // 10 seconds at 30fps
              type: "video",
              src: videoAsset.video_url,
            },
          ],
        };
        return newTracks;
      });
    }
  }, [videoAsset, initialTracks, setTracks]);

  // Clean up audio resources on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Create the editor context value
  const editorContextValue = {
    videoAsset,
    tracks,
    setTracks,
    selectedItem,
    setSelectedItem,
    durationInFrames,
    currentFrame,
    fps,
    playerRef,
    cursorPosition,
    playerDimensions,
    playerContainerRef,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
    handleMouseMove,
    handleMouseLeave,
    handleSave,
    handleRenderVideo,
    isRendering,
    isSaving,
    isRecording,
    startRecording,
    stopRecording,
  };

  // Create the comment context value
  const commentContextValue = {
    comments,
    setComments,
    isCommentPanelOpen,
    setIsCommentPanelOpen,
    handleAddNewComment,
    handleTakeAction,
  };

  // Create inputProps for the Player component
  const inputProps = { tracks };

  // If onSaveComplete is provided, update useSaveState to include it
  useEffect(() => {
    if (onSaveComplete) {
      // This is a side effect to handle the onSaveComplete callback
      // The actual implementation would depend on how useSaveState is structured
      console.log("Save complete callback registered");
    }
  }, [onSaveComplete]);

  // Add a console log when the attachVideoPreview is called
  useEffect(() => {
    console.log("VideoEditor: isRecording state changed:", isRecording);
  }, [isRecording]);

  // Add a state for testing
  const [showTestPreview, setShowTestPreview] = useState(false);

  return (
    <EditorProvider value={editorContextValue}>
      <CommentProvider value={commentContextValue}>
        <div className="flex flex-col h-full bg-background">
          <TopToolbar
            onAddItem={handleAddItem}
            onTakeAction={handleTakeAction}
            onAddComment={() => setIsCommentPanelOpen(true)}
            onRenderVideo={handleRenderVideo}
            onSave={handleSave}
            isSaving={isSaving}
            commentCount={comments.length}
            status={videoAsset?.status}
            isRendering={isRendering}
            renderedVideoUrl={videoAsset?.video_url}
            name={videoAsset?.id}
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col">
              <div
                className="flex-1 bg-black relative"
                ref={playerContainerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <Player
                  ref={playerRef}
                  component={Main}
                  inputProps={inputProps}
                  durationInFrames={durationInFrames}
                  fps={fps}
                  compositionWidth={1280}
                  compositionHeight={720}
                  style={{ width: "100%", height: "100%" }}
                  controls
                  autoPlay
                  loop
                />
                <CursorOverlay
                  position={cursorPosition}
                  dimensions={playerDimensions}
                />
              </div>

              <Timeline
                tracks={tracks}
                setTracks={setTracks}
                currentFrame={currentFrame}
                fps={fps}
                durationInFrames={durationInFrames}
                selectedItem={selectedItem}
                onSelectItem={setSelectedItem}
                comments={comments}
              />
            </div>

            <PropertiesPanel
              selectedItem={selectedItem}
              onUpdateItem={handleUpdateItem}
              onClose={() => setSelectedItem(null)}
              onDeleteItem={handleDeleteItem}
              fps={fps}
            />
          </div>

          <CommentPanel
            isOpen={isCommentPanelOpen}
            onClose={() => setIsCommentPanelOpen(false)}
            currentFrame={currentFrame}
            fps={fps}
            comments={comments}
            onAddComment={handleAddNewComment}
          />

          <VideoPreview
            onAttach={attachVideoPreview}
            isRecording={isRecording || showTestPreview}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTestPreview(!showTestPreview)}
            className="absolute top-3 left-3 z-20"
          >
            {showTestPreview ? "Hide Test Preview" : "Show Test Preview"}
          </Button>
        </div>
      </CommentProvider>
    </EditorProvider>
  );
};

export default VideoEditor;
