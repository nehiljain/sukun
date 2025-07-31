import { useState, useCallback } from "react";
import { Overlay, OverlayType, CaptionStyles, CaptionOverlay } from "../types";
import { defaultCaptionStyles } from "../components/overlays/captions/caption-settings";

/**
 * Hook to manage overlay elements in the editor
 * Overlays can be text, videos, or sounds that are positioned on the timeline
 * @returns Object containing overlay state and management functions
 */
export const useOverlays = () => {
  // Initialize with default overlays directly
  const [overlays, setOverlays] = useState<Overlay[]>([
    {
      id: 4,
      type: OverlayType.SOUND,
      content: "Upbeat Corporate",
      src: "https://rwxrdxvxndclnqvznxfj.supabase.co/storage/v1/object/public/sounds/sound-1.mp3?t=2024-11-04T03%3A52%3A06.297Z",
      from: 0,
      row: 4,
      left: 0,
      top: 0,
      width: 1920,
      height: 100,
      rotation: 0,
      isDragging: false,
      durationInFrames: 353,
      styles: {
        opacity: 1,
      },
    },
    {
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
      durationInFrames: 88,
      from: 0,
      id: 5,
      rotation: 0,
      row: 3,
      isDragging: false,
      type: OverlayType.VIDEO,
      content:
        "https://images.pexels.com/videos/7660624/pexels-photo-7660624.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
      src: "https://videos.pexels.com/video-files/7660624/7660624-uhd_2560_1440_25fps.mp4",
      videoStartTime: 0,
      styles: {
        opacity: 1,
        zIndex: 100,
        transform: "none",
        objectFit: "cover",
      },
    },
    {
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
      durationInFrames: 68,
      from: 84,
      id: 7,
      rotation: 0,
      row: 2,
      isDragging: false,
      type: OverlayType.VIDEO,
      content:
        "https://images.pexels.com/videos/5803095/cycling-dirt-bike-drone-engine-5803095.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
      src: "https://videos.pexels.com/video-files/5803095/5803095-uhd_2560_1440_25fps.mp4",
      videoStartTime: 0,
      styles: {
        opacity: 1,
        zIndex: 100,
        transform: "none",
        objectFit: "cover",
      },
    },
    {
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
      durationInFrames: 128,
      from: 137,
      id: 11,
      rotation: 0,
      row: 3,
      isDragging: false,
      type: OverlayType.VIDEO,
      content:
        "https://images.pexels.com/videos/2040076/free-video-2040076.jpg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
      src: "https://videos.pexels.com/video-files/2040076/2040076-hd_1920_1080_24fps.mp4",
      videoStartTime: 132,
      styles: {
        opacity: 1,
        zIndex: 100,
        transform: "none",
        objectFit: "cover",
      },
    },
    {
      left: 82,
      top: 37,
      width: 1068,
      height: 266,
      durationInFrames: 98,
      from: 148,
      id: 12,
      row: 1,
      rotation: 0,
      isDragging: false,
      type: OverlayType.TEXT,
      content: "GREAT",
      styles: {
        fontSize: "3rem",
        fontWeight: "900",
        color: "#FFFFFF",
        backgroundColor: "transparent",
        fontFamily: "font-sans",
        fontStyle: "normal",
        textDecoration: "none",
        lineHeight: "1",
        textAlign: "center",
        letterSpacing: "0.02em",
        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.2)",
        opacity: 1,
        zIndex: 1,
        transform: "none",
        animation: {
          enter: "fade",
          exit: "fade",
        },
      },
    },
    {
      left: 228,
      top: 261,
      width: 763,
      height: 156,
      durationInFrames: 86,
      from: 161,
      id: 13,
      row: 2,
      rotation: 0,
      isDragging: false,
      type: OverlayType.TEXT,
      content: "PRODUCTS",
      styles: {
        fontSize: "3rem",
        fontWeight: "900",
        color: "#FFFFFF",
        backgroundColor: "transparent",
        fontFamily: "font-sans",
        fontStyle: "normal",
        textDecoration: "none",
        lineHeight: "1",
        textAlign: "center",
        letterSpacing: "0.02em",
        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.2)",
        opacity: 1,
        zIndex: 1,
        transform: "none",
        animation: {
          enter: "fade",
          exit: "fade",
        },
      },
    },
    {
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
      durationInFrames: 61,
      from: 253,
      id: 14,
      rotation: 0,
      row: 2,
      isDragging: false,
      type: OverlayType.IMAGE,
      src: "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg",
      styles: {
        objectFit: "cover",
        animation: {
          enter: "fadeIn",
          exit: "fadeOut",
        },
      },
    },
    {
      left: 100,
      top: 166,
      width: 1131,
      height: 330,
      durationInFrames: 61,
      from: 255,
      id: 15,
      row: 1,
      rotation: 0,
      isDragging: false,
      type: OverlayType.TEXT,
      content: "With RVE",
      styles: {
        fontSize: "3rem",
        fontWeight: "900",
        color: "#FFFFFF",
        backgroundColor: "transparent",
        fontFamily: "font-sans",
        fontStyle: "normal",
        textDecoration: "none",
        lineHeight: "1",
        textAlign: "center",
        letterSpacing: "0.02em",
        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.2)",
        opacity: 1,
        zIndex: 1,
        transform: "none",
        animation: {
          enter: "fade",
          exit: "fade",
        },
      },
    },
    {
      left: 91,
      top: 142,
      width: 1176,
      height: 399,
      durationInFrames: 140,
      from: 7,
      id: 16,
      row: 1,
      rotation: 0,
      isDragging: false,
      type: OverlayType.TEXT,
      content: "BUILD.",
      styles: {
        fontSize: "3rem",
        fontWeight: "900",
        color: "#FFFFFF",
        backgroundColor: "transparent",
        fontFamily: "font-sans",
        fontStyle: "normal",
        textDecoration: "none",
        lineHeight: "1",
        textAlign: "center",
        letterSpacing: "0.02em",
        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.2)",
        opacity: 1,
        zIndex: 1,
        transform: "none",
        animation: {
          enter: "fade",
          exit: "fade",
        },
      },
    },
    {
      id: 17,
      type: OverlayType.CAPTION,
      from: 146,
      durationInFrames: 200,
      captions: [
        {
          text: "Time to build great products with react video editor",
          startMs: 0,
          endMs: 3375,
          timestampMs: null,
          confidence: 0.99,
          words: [
            {
              word: "Time",
              startMs: 0,
              endMs: 375,
              confidence: 0.99,
            },
            {
              word: "to",
              startMs: 375,
              endMs: 750,
              confidence: 0.99,
            },
            {
              word: "build",
              startMs: 750,
              endMs: 1125,
              confidence: 0.99,
            },
            {
              word: "great",
              startMs: 1125,
              endMs: 1500,
              confidence: 0.99,
            },
            {
              word: "products",
              startMs: 1500,
              endMs: 1875,
              confidence: 0.99,
            },
            {
              word: "with",
              startMs: 1875,
              endMs: 2250,
              confidence: 0.99,
            },
            {
              word: "react",
              startMs: 2250,
              endMs: 2625,
              confidence: 0.99,
            },
            {
              word: "video",
              startMs: 2625,
              endMs: 3000,
              confidence: 0.99,
            },
            {
              word: "editor",
              startMs: 3000,
              endMs: 3375,
              confidence: 0.99,
            },
          ],
        },
        {
          text: "The perfect template for creating video editing apps",
          startMs: 3875,
          endMs: 6875,
          timestampMs: null,
          confidence: 0.99,
          words: [
            {
              word: "The",
              startMs: 3875,
              endMs: 4250,
              confidence: 0.99,
            },
            {
              word: "perfect",
              startMs: 4250,
              endMs: 4625,
              confidence: 0.99,
            },
            {
              word: "template",
              startMs: 4625,
              endMs: 5000,
              confidence: 0.99,
            },
            {
              word: "for",
              startMs: 5000,
              endMs: 5375,
              confidence: 0.99,
            },
            {
              word: "creating",
              startMs: 5375,
              endMs: 5750,
              confidence: 0.99,
            },
            {
              word: "video",
              startMs: 5750,
              endMs: 6125,
              confidence: 0.99,
            },
            {
              word: "editing",
              startMs: 6125,
              endMs: 6500,
              confidence: 0.99,
            },
            {
              word: "apps",
              startMs: 6500,
              endMs: 6875,
              confidence: 0.99,
            },
          ],
        },
      ],
      left: 240,
      top: 454,
      width: 746,
      height: 188,
      rotation: 0,
      isDragging: false,
      row: 0,
      template: "classic",
      styles: {
        fontFamily: "Inter, sans-serif",
        fontSize: "2.2rem",
        lineHeight: 1.4,
        textAlign: "center",
        color: "#FFFFFF",
        textShadow: "2px 2px 4px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)",
        padding: "12px",
        fontWeight: 500,
        letterSpacing: "0.01em",
        highlightStyle: {
          backgroundColor: "rgba(59, 130, 246, 0.92)",
          color: "#FFFFFF",
          scale: 1.06,
          fontWeight: 600,
          textShadow: "2px 2px 4px rgba(0,0,0,0.4)",
          borderRadius: "6px",
          padding: "2px 8px",
        },
      },
    },
  ]);

  // Tracks which overlay is currently selected for editing
  const [selectedOverlayId, setSelectedOverlayId] = useState<number | null>(
    null,
  );

  /**
   * Updates properties of a specific overlay
   * Supports both direct property updates and functional updates
   * @example
   * // Direct update
   * changeOverlay(1, { width: 100 })
   * // Functional update
   * changeOverlay(1, (overlay) => ({ ...overlay, width: overlay.width + 10 }))
   */
  const changeOverlay = useCallback(
    (
      overlayId: number,
      updater: Partial<Overlay> | ((overlay: Overlay) => Overlay),
    ) => {
      setOverlays((prevOverlays) =>
        prevOverlays.map((overlay) => {
          if (overlay.id !== overlayId) return overlay;
          return typeof updater === "function"
            ? updater(overlay)
            : ({ ...overlay, ...updater } as Overlay);
        }),
      );
    },
    [],
  );

  /**
   * Adds a new overlay to the editor
   * Automatically generates a new unique ID and appends it to the overlays array
   * Deselects any currently selected overlay
   */
  const addOverlay = useCallback((newOverlay: Omit<Overlay, "id">) => {
    let newId: number;
    setOverlays((prevOverlays) => {
      newId =
        prevOverlays.length > 0
          ? Math.max(...prevOverlays.map((o) => o.id)) + 1
          : 0;
      const overlayWithNewId = { ...newOverlay, id: newId } as Overlay;
      return [...prevOverlays, overlayWithNewId];
    });
    setSelectedOverlayId(newId!);
  }, []);

  /**
   * Removes an overlay by its ID and clears the selection
   */
  const deleteOverlay = useCallback((id: number) => {
    setOverlays((prevOverlays) =>
      prevOverlays.filter((overlay) => overlay.id !== id),
    );
    setSelectedOverlayId(null);
  }, []);

  /**
   * Removes all overlays on a specified row
   * @param row The row number to clear
   */
  const deleteOverlaysByRow = useCallback((row: number) => {
    setOverlays((prevOverlays) =>
      prevOverlays.filter((overlay) => overlay.row !== row),
    );
    setSelectedOverlayId(null);
  }, []);

  /**
   * Creates a copy of an existing overlay
   * The duplicated overlay is positioned immediately after the original in the timeline
   */
  const duplicateOverlay = useCallback((id: number) => {
    setOverlays((prevOverlays) => {
      const overlayToDuplicate = prevOverlays.find(
        (overlay) => overlay.id === id,
      );
      if (!overlayToDuplicate) return prevOverlays;

      const newId = Math.max(...prevOverlays.map((o) => o.id)) + 1;
      const duplicatedOverlay: Overlay = {
        ...overlayToDuplicate,
        id: newId,
        from: overlayToDuplicate.from + overlayToDuplicate.durationInFrames,
      };

      return [...prevOverlays, duplicatedOverlay];
    });
  }, []);

  /**
   * Splits an overlay into two separate overlays at a specified frame
   * Useful for creating cuts or transitions in video/audio content
   * @example
   * // Split an overlay at frame 100
   * splitOverlay(1, 100)
   */
  const splitOverlay = useCallback((id: number, splitFrame: number) => {
    const fps = 30; // Make this configurable
    const msPerFrame = 1000 / fps;

    console.log("=== Starting Caption Split Operation ===");
    console.log(
      `Split requested at frame ${splitFrame} (${splitFrame * msPerFrame}ms)`,
    );

    setOverlays((prevOverlays) => {
      const overlayToSplit = prevOverlays.find((overlay) => overlay.id === id);
      if (!overlayToSplit) {
        console.log("Overlay not found:", id);
        return prevOverlays;
      }

      // Validate split point
      if (
        splitFrame <= overlayToSplit.from ||
        splitFrame >= overlayToSplit.from + overlayToSplit.durationInFrames
      ) {
        console.warn("Invalid split point");
        return prevOverlays;
      }

      const firstPartDuration = splitFrame - overlayToSplit.from;
      const secondPartDuration =
        overlayToSplit.durationInFrames - firstPartDuration;
      const newId = Math.max(...prevOverlays.map((o) => o.id)) + 1;

      // Calculate start times for media overlays
      const secondHalfStartTime = calculateSecondHalfStartTime(
        overlayToSplit,
        firstPartDuration,
      );

      // Create split overlays
      const [firstHalf, secondHalf] = createSplitOverlays(
        overlayToSplit,
        newId,
        splitFrame,
        firstPartDuration,
        secondPartDuration,
        secondHalfStartTime,
      );

      return prevOverlays
        .map((overlay) => (overlay.id === id ? firstHalf : overlay))
        .concat(secondHalf);
    });
  }, []);

  const updateOverlayStyles = useCallback(
    (overlayId: number, styles: Partial<CaptionStyles>) => {
      changeOverlay(overlayId, (overlay) => {
        if (overlay.type !== OverlayType.CAPTION) return overlay;
        return {
          ...overlay,
          styles: {
            ...(overlay.styles || defaultCaptionStyles),
            ...styles,
          },
        };
      });
    },
    [changeOverlay],
  );

  const resetOverlays = useCallback(() => {
    setOverlays([
      {
        id: 0,
        type: OverlayType.CAPTION,
        from: 0,
        durationInFrames: 504,
        captions: [
          {
            text: "The man went surfing, riding the waves under the sun",
            startMs: 0,
            endMs: 3750,
            timestampMs: null,
            confidence: 0.99,
            words: [
              {
                word: "The",
                startMs: 0,
                endMs: 375,
                confidence: 0.99,
              },
              {
                word: "man",
                startMs: 375,
                endMs: 750,
                confidence: 0.99,
              },
              {
                word: "went",
                startMs: 750,
                endMs: 1125,
                confidence: 0.99,
              },
              {
                word: "surfing,",
                startMs: 1125,
                endMs: 1500,
                confidence: 0.99,
              },
              {
                word: "riding",
                startMs: 1500,
                endMs: 1875,
                confidence: 0.99,
              },
              {
                word: "the",
                startMs: 1875,
                endMs: 2250,
                confidence: 0.99,
              },
              {
                word: "waves",
                startMs: 2250,
                endMs: 2625,
                confidence: 0.99,
              },
              {
                word: "under",
                startMs: 2625,
                endMs: 3000,
                confidence: 0.99,
              },
              {
                word: "the",
                startMs: 3000,
                endMs: 3375,
                confidence: 0.99,
              },
              {
                word: "sun",
                startMs: 3375,
                endMs: 3750,
                confidence: 0.99,
              },
            ],
          },
          {
            text: "The boy played football, dribbling past defenders and scoring",
            startMs: 4250,
            endMs: 7625,
            timestampMs: null,
            confidence: 0.99,
            words: [
              {
                word: "The",
                startMs: 4250,
                endMs: 4625,
                confidence: 0.99,
              },
              {
                word: "boy",
                startMs: 4625,
                endMs: 5000,
                confidence: 0.99,
              },
              {
                word: "played",
                startMs: 5000,
                endMs: 5375,
                confidence: 0.99,
              },
              {
                word: "football,",
                startMs: 5375,
                endMs: 5750,
                confidence: 0.99,
              },
              {
                word: "dribbling",
                startMs: 5750,
                endMs: 6125,
                confidence: 0.99,
              },
              {
                word: "past",
                startMs: 6125,
                endMs: 6500,
                confidence: 0.99,
              },
              {
                word: "defenders",
                startMs: 6500,
                endMs: 6875,
                confidence: 0.99,
              },
              {
                word: "and",
                startMs: 6875,
                endMs: 7250,
                confidence: 0.99,
              },
              {
                word: "scoring",
                startMs: 7250,
                endMs: 7625,
                confidence: 0.99,
              },
            ],
          },
          {
            text: "A cyclist raced down the road, wind rushing past",
            startMs: 8125,
            endMs: 11500,
            timestampMs: null,
            confidence: 0.99,
            words: [
              {
                word: "A",
                startMs: 8125,
                endMs: 8500,
                confidence: 0.99,
              },
              {
                word: "cyclist",
                startMs: 8500,
                endMs: 8875,
                confidence: 0.99,
              },
              {
                word: "raced",
                startMs: 8875,
                endMs: 9250,
                confidence: 0.99,
              },
              {
                word: "down",
                startMs: 9250,
                endMs: 9625,
                confidence: 0.99,
              },
              {
                word: "the",
                startMs: 9625,
                endMs: 10000,
                confidence: 0.99,
              },
              {
                word: "road,",
                startMs: 10000,
                endMs: 10375,
                confidence: 0.99,
              },
              {
                word: "wind",
                startMs: 10375,
                endMs: 10750,
                confidence: 0.99,
              },
              {
                word: "rushing",
                startMs: 10750,
                endMs: 11125,
                confidence: 0.99,
              },
              {
                word: "past",
                startMs: 11125,
                endMs: 11500,
                confidence: 0.99,
              },
            ],
          },
          {
            text: "A player leaped for a slam dunk, the ball swishing through the net",
            startMs: 12000,
            endMs: 16875,
            timestampMs: null,
            confidence: 0.99,
            words: [
              {
                word: "A",
                startMs: 12000,
                endMs: 12375,
                confidence: 0.99,
              },
              {
                word: "player",
                startMs: 12375,
                endMs: 12750,
                confidence: 0.99,
              },
              {
                word: "leaped",
                startMs: 12750,
                endMs: 13125,
                confidence: 0.99,
              },
              {
                word: "for",
                startMs: 13125,
                endMs: 13500,
                confidence: 0.99,
              },
              {
                word: "a",
                startMs: 13500,
                endMs: 13875,
                confidence: 0.99,
              },
              {
                word: "slam",
                startMs: 13875,
                endMs: 14250,
                confidence: 0.99,
              },
              {
                word: "dunk,",
                startMs: 14250,
                endMs: 14625,
                confidence: 0.99,
              },
              {
                word: "the",
                startMs: 14625,
                endMs: 15000,
                confidence: 0.99,
              },
              {
                word: "ball",
                startMs: 15000,
                endMs: 15375,
                confidence: 0.99,
              },
              {
                word: "swishing",
                startMs: 15375,
                endMs: 15750,
                confidence: 0.99,
              },
              {
                word: "through",
                startMs: 15750,
                endMs: 16125,
                confidence: 0.99,
              },
              {
                word: "the",
                startMs: 16125,
                endMs: 16500,
                confidence: 0.99,
              },
              {
                word: "net",
                startMs: 16500,
                endMs: 16875,
                confidence: 0.99,
              },
            ],
          },
          {
            text: "The swimmer dived in, gliding through the water",
            startMs: 17375,
            endMs: 20375,
            timestampMs: null,
            confidence: 0.99,
            words: [
              {
                word: "The",
                startMs: 17375,
                endMs: 17750,
                confidence: 0.99,
              },
              {
                word: "swimmer",
                startMs: 17750,
                endMs: 18125,
                confidence: 0.99,
              },
              {
                word: "dived",
                startMs: 18125,
                endMs: 18500,
                confidence: 0.99,
              },
              {
                word: "in,",
                startMs: 18500,
                endMs: 18875,
                confidence: 0.99,
              },
              {
                word: "gliding",
                startMs: 18875,
                endMs: 19250,
                confidence: 0.99,
              },
              {
                word: "through",
                startMs: 19250,
                endMs: 19625,
                confidence: 0.99,
              },
              {
                word: "the",
                startMs: 19625,
                endMs: 20000,
                confidence: 0.99,
              },
              {
                word: "water",
                startMs: 20000,
                endMs: 20375,
                confidence: 0.99,
              },
            ],
          },
          {
            text: "The man jumped out of a plane, parachute opening as he soared",
            startMs: 20875,
            endMs: 25375,
            timestampMs: null,
            confidence: 0.99,
            words: [
              {
                word: "The",
                startMs: 20875,
                endMs: 21250,
                confidence: 0.99,
              },
              {
                word: "man",
                startMs: 21250,
                endMs: 21625,
                confidence: 0.99,
              },
              {
                word: "jumped",
                startMs: 21625,
                endMs: 22000,
                confidence: 0.99,
              },
              {
                word: "out",
                startMs: 22000,
                endMs: 22375,
                confidence: 0.99,
              },
              {
                word: "of",
                startMs: 22375,
                endMs: 22750,
                confidence: 0.99,
              },
              {
                word: "a",
                startMs: 22750,
                endMs: 23125,
                confidence: 0.99,
              },
              {
                word: "plane,",
                startMs: 23125,
                endMs: 23500,
                confidence: 0.99,
              },
              {
                word: "parachute",
                startMs: 23500,
                endMs: 23875,
                confidence: 0.99,
              },
              {
                word: "opening",
                startMs: 23875,
                endMs: 24250,
                confidence: 0.99,
              },
              {
                word: "as",
                startMs: 24250,
                endMs: 24625,
                confidence: 0.99,
              },
              {
                word: "he",
                startMs: 24625,
                endMs: 25000,
                confidence: 0.99,
              },
              {
                word: "soared",
                startMs: 25000,
                endMs: 25375,
                confidence: 0.99,
              },
            ],
          },
          {
            text: "The runner crossed the finish line, arms raised in victory",
            startMs: 25875,
            endMs: 29625,
            timestampMs: null,
            confidence: 0.99,
            words: [
              {
                word: "The",
                startMs: 25875,
                endMs: 26250,
                confidence: 0.99,
              },
              {
                word: "runner",
                startMs: 26250,
                endMs: 26625,
                confidence: 0.99,
              },
              {
                word: "crossed",
                startMs: 26625,
                endMs: 27000,
                confidence: 0.99,
              },
              {
                word: "the",
                startMs: 27000,
                endMs: 27375,
                confidence: 0.99,
              },
              {
                word: "finish",
                startMs: 27375,
                endMs: 27750,
                confidence: 0.99,
              },
              {
                word: "line,",
                startMs: 27750,
                endMs: 28125,
                confidence: 0.99,
              },
              {
                word: "arms",
                startMs: 28125,
                endMs: 28500,
                confidence: 0.99,
              },
              {
                word: "raised",
                startMs: 28500,
                endMs: 28875,
                confidence: 0.99,
              },
              {
                word: "in",
                startMs: 28875,
                endMs: 29250,
                confidence: 0.99,
              },
              {
                word: "victory",
                startMs: 29250,
                endMs: 29625,
                confidence: 0.99,
              },
            ],
          },
        ],
        left: 230,
        top: 414,
        width: 833,
        height: 269,
        rotation: 0,
        isDragging: false,
        row: 0,
      },
      {
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
        durationInFrames: 115,
        from: 0,
        id: 1,
        rotation: 0,
        row: 1,
        isDragging: false,
        type: OverlayType.VIDEO,
        content:
          "https://images.pexels.com/videos/1093664/free-video-1093664.jpg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
        src: "https://videos.pexels.com/video-files/1093664/1093664-hd_1920_1080_30fps.mp4",
        videoStartTime: 0,
        styles: {
          opacity: 1,
          zIndex: 100,
          transform: "none",
          objectFit: "cover",
        },
      },
      {
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
        durationInFrames: 119,
        from: 111,
        id: 2,
        rotation: 0,
        row: 2,
        isDragging: false,
        type: OverlayType.VIDEO,
        content:
          "https://images.pexels.com/videos/4440937/pexels-photo-4440937.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
        src: "https://videos.pexels.com/video-files/4440937/4440937-hd_1920_1080_25fps.mp4",
        videoStartTime: 0,
        styles: {
          opacity: 1,
          zIndex: 100,
          transform: "none",
          objectFit: "cover",
        },
      },
      {
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
        durationInFrames: 126,
        from: 225,
        id: 3,
        rotation: 0,
        row: 3,
        isDragging: false,
        type: OverlayType.VIDEO,
        content:
          "https://images.pexels.com/videos/5790072/aerial-photography-asphalt-athletes-bicycle-5790072.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
        src: "https://videos.pexels.com/video-files/5790072/5790072-hd_1280_720_30fps.mp4",
        videoStartTime: 0,
        styles: {
          opacity: 1,
          zIndex: 100,
          transform: "none",
          objectFit: "cover",
        },
      },
      {
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
        durationInFrames: 156,
        from: 348,
        id: 4,
        rotation: 0,
        row: 4,
        isDragging: false,
        type: OverlayType.VIDEO,
        content:
          "https://images.pexels.com/videos/5192077/ball-basketball-guy-jump-5192077.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
        src: "https://videos.pexels.com/video-files/5192077/5192077-hd_1280_720_30fps.mp4",
        videoStartTime: 0,
        styles: {
          opacity: 1,
          zIndex: 100,
          transform: "none",
          objectFit: "cover",
        },
      },
    ]);
    setSelectedOverlayId(null);
  }, []);

  return {
    overlays,
    selectedOverlayId,
    setSelectedOverlayId,
    setOverlays,
    changeOverlay,
    addOverlay,
    deleteOverlay,
    deleteOverlaysByRow,
    duplicateOverlay,
    splitOverlay,
    updateOverlayStyles,
    resetOverlays,
  };
};

/**
 * Calculates the starting time for the second half of a split media overlay
 * For clips and sounds, we need to adjust their internal start times
 * to maintain continuity after the split
 */
const calculateSecondHalfStartTime = (
  overlay: Overlay,
  firstPartDuration: number,
): number => {
  if (overlay.type === OverlayType.VIDEO) {
    return (overlay.videoStartTime || 0) + firstPartDuration;
  }
  if (overlay.type === OverlayType.SOUND) {
    return (overlay.startFromSound || 0) + firstPartDuration;
  }
  return 0;
};

/**
 * Creates two new overlay objects from an original overlay when splitting
 * The first half maintains the original ID and timing
 * The second half gets a new ID and adjusted timing properties
 * Preserves all other properties from the original overlay
 */
const createSplitOverlays = (
  original: Overlay,
  newId: number,
  splitFrame: number,
  firstPartDuration: number,
  secondPartDuration: number,
  secondHalfStartTime: number,
): [Overlay, Overlay] => {
  const fps = 30;
  const msPerFrame = 1000 / fps;
  const splitTimeMs = splitFrame * msPerFrame;

  if (original.type === OverlayType.CAPTION) {
    // Calculate absolute time ranges for both splits
    const originalStartMs = original.from * msPerFrame;
    const splitOffsetMs = splitTimeMs - originalStartMs; // Time relative to overlay start

    console.log("🎯 Split Timing Calculations:", {
      originalStartMs,
      splitTimeMs,
      splitOffsetMs,
      originalCaptions: original.captions.map((c) => ({
        text: c.text,
        startMs: c.startMs,
        endMs: c.endMs,
      })),
    });

    // Split captions at word level, keeping timestamps relative to their overlay
    const firstHalfCaptions = original.captions
      .filter((caption) => caption.startMs < splitOffsetMs)
      .map((caption) => ({
        ...caption,
        endMs: Math.min(caption.endMs, splitOffsetMs),
        words: caption.words
          .filter((word) => word.startMs < splitOffsetMs)
          .map((word) => ({
            ...word,
            endMs: Math.min(word.endMs, splitOffsetMs),
          })),
      }))
      .filter((caption) => caption.words.length > 0)
      .map((caption) => ({
        ...caption,
        text: caption.words.map((w) => w.word).join(" "),
      }));

    const secondHalfCaptions = original.captions
      .filter((caption) => caption.endMs > splitOffsetMs)
      .map((caption) => ({
        ...caption,
        startMs: Math.max(0, caption.startMs - splitOffsetMs),
        endMs: caption.endMs - splitOffsetMs,
        words: caption.words
          .filter((word) => word.endMs > splitOffsetMs)
          .map((word) => ({
            ...word,
            startMs: Math.max(0, word.startMs - splitOffsetMs),
            endMs: word.endMs - splitOffsetMs,
          })),
      }))
      .filter((caption) => caption.words.length > 0)
      .map((caption) => ({
        ...caption,
        text: caption.words.map((w) => w.word).join(" "),
      }));

    console.log("📑 Split Results:", {
      firstHalf: {
        captionCount: firstHalfCaptions.length,
        captions: firstHalfCaptions.map((c) => ({
          text: c.text,
          startMs: c.startMs,
          endMs: c.endMs,
          wordCount: c.words.length,
        })),
      },
      secondHalf: {
        captionCount: secondHalfCaptions.length,
        captions: secondHalfCaptions.map((c) => ({
          text: c.text,
          startMs: c.startMs,
          endMs: c.endMs,
          wordCount: c.words.length,
        })),
      },
    });

    // Create the split overlays with adjusted captions
    const firstHalf: CaptionOverlay = {
      ...original,
      durationInFrames: firstPartDuration,
      captions: firstHalfCaptions,
    };

    const secondHalf: CaptionOverlay = {
      ...original,
      id: newId,
      from: splitFrame,
      durationInFrames: secondPartDuration,
      captions: secondHalfCaptions,
    };

    return [firstHalf, secondHalf];
  }

  const firstHalf: Overlay = {
    ...original,
    durationInFrames: firstPartDuration,
  };

  const secondHalf: Overlay = {
    ...original,
    id: newId,
    from: splitFrame,
    durationInFrames: secondPartDuration,
    ...(original.type === OverlayType.VIDEO && {
      videoStartTime: secondHalfStartTime,
    }),
    ...(original.type === OverlayType.SOUND && {
      startFromSound: secondHalfStartTime,
    }),
  };

  return [firstHalf, secondHalf];
};
