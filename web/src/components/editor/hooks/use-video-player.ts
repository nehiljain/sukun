import { useState, useRef, useEffect, useCallback } from "react";

export const useVideoPlayer = (fps = 30) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);

  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [playerDimensions, setPlayerDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 1280,
    height: 720,
  });

  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Update current frame
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        setCurrentFrame(frame);
      }
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [fps]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (playerContainerRef.current) {
        const rect = playerContainerRef.current.getBoundingClientRect();
        setCursorPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });

        // Update player dimensions if needed
        if (
          rect.width !== playerDimensions.width ||
          rect.height !== playerDimensions.height
        ) {
          setPlayerDimensions({
            width: rect.width,
            height: rect.height,
          });
        }
      }
    },
    [playerDimensions],
  );

  const handleMouseLeave = useCallback(() => {
    setCursorPosition(null);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  return {
    currentFrame,
    setCurrentFrame,
    isPlaying,
    playerRef,
    cursorPosition,
    playerDimensions,
    playerContainerRef,
    handleMouseMove,
    handleMouseLeave,
    togglePlayPause,
  };
};
