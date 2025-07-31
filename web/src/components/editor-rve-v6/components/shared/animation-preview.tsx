import React, { useState, useEffect, useRef } from "react";
import { AnimationTemplate } from "../../templates/animation-templates";
import { interpolate } from "remotion";
import { interpolateWithEasing } from "@/components/editor-rve-v6/utils/easing-functions";

/**
 * AnimationPreviewProps interface defines the required props for the AnimationPreview component
 */
interface AnimationPreviewProps {
  /** Unique identifier for the animation */
  animationKey: string;
  /** Animation template containing enter/exit animations and configuration */
  animation: AnimationTemplate;
  /** Whether this animation is currently selected */
  isSelected: boolean;
  /** Callback function triggered when the animation is clicked */
  onClick: () => void;
}

/**
 * AnimationPreview component displays an interactive preview of an animation effect.
 * It shows a visual element that demonstrates the animation effect with continuous looping
 * and supports special cases like word-by-word animations.
 *
 * @component
 * @param {AnimationTemplate} animation - The animation template to preview
 * @param {boolean} isSelected - Whether this animation is currently selected
 * @param {() => void} onClick - Callback function when the animation is selected
 *
 * @example
 * ```tsx
 * <AnimationPreview
 *   animationKey="fade"
 *   animation={fadeAnimation}
 *   isSelected={false}
 *   onClick={() => handleAnimationSelect('fade')}
 * />
 * ```
 */
export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  animationKey,
  animation,
  isSelected,
  onClick,
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<
    "enter" | "hold" | "exit"
  >("enter");
  const animationRef = useRef<number>();
  const totalFrames = 180; // 3 seconds at 60fps
  const enterDuration = 60; // 1 second for enter
  const holdDuration = 60; // 1 second for hold
  const exitDuration = 60; // 1 second for exit

  // Animate continuously
  useEffect(() => {
    const animate = () => {
      setCurrentFrame((prev) => {
        const newFrame = prev + 1;

        // Determine animation phase based on current frame
        if (newFrame <= enterDuration) {
          setAnimationPhase("enter");
        } else if (newFrame <= enterDuration + holdDuration) {
          setAnimationPhase("hold");
        } else if (newFrame <= totalFrames) {
          setAnimationPhase("exit");
        }

        // Reset animation loop when complete
        if (newFrame > totalFrames) {
          return 0;
        }

        return newFrame;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate animation styles for standard animations
  const getAnimationStyles = () => {
    if (animationPhase === "enter") {
      return animation.enter?.(currentFrame, totalFrames, enterDuration) || {};
    } else if (animationPhase === "exit") {
      const exitFrame = currentFrame - (enterDuration + holdDuration);
      return animation.exit?.(exitFrame, exitDuration, exitDuration) || {};
    } else {
      // For hold phase, use the final frame of enter animation
      return animation.enter?.(enterDuration, totalFrames, enterDuration) || {};
    }
  };

  // Render word-by-word animation preview
  const renderWordByWordPreview = () => {
    const sampleWords = ["Word", "by", "Word"];

    return (
      <div className="flex flex-wrap justify-center gap-1">
        {sampleWords.map((word, idx) => {
          let wordOpacity = 1;

          // Use the full animation duration for each word
          // with a small delay between words
          const wordDelay = Math.floor(enterDuration / 3); // 1/3 of animation duration as delay

          if (animationPhase === "enter") {
            // Enter animation - words fade in sequentially using full duration per word
            const wordStartFrame = idx * wordDelay;
            wordOpacity = Math.min(
              1,
              Math.max(
                0,
                interpolateWithEasing(
                  currentFrame,
                  [wordStartFrame, wordStartFrame + enterDuration / 2],
                  [0, 1],
                  "easeOut",
                ),
              ),
            );
          } else if (animationPhase === "exit") {
            // Exit animation - words fade out in reverse order using full duration per word
            const exitFrame = currentFrame - (enterDuration + holdDuration);
            const reverseIdx = sampleWords.length - 1 - idx;
            const wordExitFrame = reverseIdx * wordDelay;

            wordOpacity = Math.min(
              1,
              Math.max(
                0,
                interpolateWithEasing(
                  exitFrame,
                  [wordExitFrame, wordExitFrame + exitDuration / 2],
                  [1, 0],
                  "easeIn",
                ),
              ),
            );
          }

          return (
            <span
              key={idx}
              className="text-xs bg-blue-500 px-1 rounded text-white"
              style={{
                opacity: wordOpacity,
                transition: "opacity 0.1s ease",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`
        p-2 rounded-md cursor-pointer transition-all
        border ${isSelected ? "border-blue-500 bg-blue-900/20" : "border-gray-700"}
        hover:border-blue-600
        flex flex-col items-center relative
        h-32
      `}
      onClick={onClick}
    >
      <div className="text-xs font-medium mb-1 truncate w-full text-center">
        {animation.name}
      </div>

      {/* Animation demo area */}
      <div className="w-full h-16 flex items-center justify-center bg-gray-800 rounded-md overflow-hidden">
        {animation.isWordByWord ? (
          // Special handling for word-by-word animations
          renderWordByWordPreview()
        ) : (
          // Standard animation preview
          <div
            className="w-16 h-10 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs"
            style={{
              ...(getAnimationStyles() as React.CSSProperties),
              willChange: "transform, opacity, filter",
            }}
          >
            {animation.name}
          </div>
        )}
      </div>

      <div className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">
        {animation.preview}
      </div>

      {animation.isPro && (
        <div className="absolute top-1 right-1 text-[8px] bg-blue-600 text-white px-1 rounded-sm">
          PRO
        </div>
      )}
    </div>
  );
};
