import { useState, useCallback, useEffect } from "react";
import { Track, Item } from "../types";
import { getAnimationById } from "@/remotion-src/components/animations/registry";

export const useTracks = (initialDuration = 600) => {
  const [tracks, setTracks] = useState<Track[]>([
    { name: "Track 1", items: [] },
    { name: "Track 2", items: [] },
  ]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [durationInFrames, setDurationInFrames] = useState(initialDuration);

  const handleAddItem = useCallback(
    (type: "solid" | "text" | "video" | string, currentFrame: number) => {
      // Check if this is a registered animation
      const registeredAnimation = getAnimationById(type);

      const newItem: Item = {
        id: `item-${Date.now()}`,
        from: currentFrame,
        durationInFrames: 30,
        type,
        ...(type === "solid" ? { color: "#9333ea" } : {}),
        ...(type === "text" ? { text: "New Text", color: "#ffffff" } : {}),
        ...(registeredAnimation ? { ...registeredAnimation.defaultProps } : {}),
      } as Item;

      setTracks((prev) => {
        const newTracks = [...prev];
        newTracks[0].items.push(newItem);
        return newTracks;
      });
      setSelectedItem(newItem);
    },
    [],
  );

  const handleUpdateItem = useCallback((updatedItem: Item) => {
    setTracks((prev) => {
      return prev.map((track) => ({
        ...track,
        items: track.items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item,
        ),
      }));
    });
    setSelectedItem(updatedItem);
  }, []);

  const handleDeleteItem = useCallback((itemId: string) => {
    setTracks((prev) => {
      return prev.map((track) => ({
        ...track,
        items: track.items.filter((item) => item.id !== itemId),
      }));
    });
    setSelectedItem(null);
  }, []);

  // Calculate total duration based on tracks
  const calculateTotalDuration = useCallback(
    (
      tracksToCalculate: Track[],
      minDuration: number = 600,
      paddingFrames: number = 90,
    ): number => {
      const maxEndFrame = tracksToCalculate.reduce((maxEnd, track) => {
        const trackMaxEnd = track.items.reduce((max, item) => {
          const itemEndFrame = item.from + item.durationInFrames;
          return Math.max(max, itemEndFrame);
        }, 0);
        return Math.max(maxEnd, trackMaxEnd);
      }, 0);

      return Math.max(minDuration, maxEndFrame + paddingFrames);
    },
    [],
  );

  // Update duration when tracks change
  useEffect(() => {
    const newDuration = calculateTotalDuration(tracks);
    setDurationInFrames(newDuration);
  }, [tracks, calculateTotalDuration]);

  return {
    tracks,
    setTracks,
    selectedItem,
    setSelectedItem,
    durationInFrames,
    setDurationInFrames,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
    calculateTotalDuration,
  };
};
