import React from "react";
import { useCurrentFrame } from "remotion";
import { TextOverlay } from "../../../types";
import { useFonts } from "../../../hooks/use-fonts";
import { animationTemplates } from "../../../templates/animation-templates";
import { interpolateWithEasing } from "../../../utils/easing-functions";

interface TextLayerContentProps {
  overlay: TextOverlay;
}

export const TextLayerContent: React.FC<TextLayerContentProps> = ({
  overlay,
}) => {
  const frame = useCurrentFrame();
  const { getFontFamily } = useFonts();

  // Calculate if we're in the exit phase (last 30 frames)
  const isExitPhase = frame >= overlay.durationInFrames - 30;

  // Extract animation parameters with defaults
  const enterDuration = overlay.styles.animation?.enterDuration || 15;
  const exitDuration = overlay.styles.animation?.exitDuration || 15;
  const enterEasing = overlay.styles.animation?.enterEasing || "easeOut";
  const exitEasing = overlay.styles.animation?.exitEasing || "easeIn";

  // Calculate base font size - moved outside conditionals so it can be used in both branches
  const calculateFontSize = () => {
    const aspectRatio = overlay.width / overlay.height;
    const lines = overlay.content.split("\n");
    const numLines = lines.length;
    const maxLineLength = Math.max(...lines.map((line) => line.length));

    // Base size on container dimensions
    const areaBasedSize = Math.sqrt(
      (overlay.width * overlay.height) / (maxLineLength * numLines),
    );
    let fontSize = areaBasedSize * 1.2; // Scaling factor

    // Adjust for number of lines
    if (numLines > 1) {
      fontSize *= Math.max(0.5, 1 - numLines * 0.1);
    }

    // Adjust for line length
    if (maxLineLength > 20) {
      fontSize *= Math.max(0.6, 1 - (maxLineLength - 20) / 100);
    }

    // Adjust for extreme aspect ratios
    if (aspectRatio > 2 || aspectRatio < 0.5) {
      fontSize *= 0.8;
    }

    // Set minimum and maximum bounds
    return Math.max(12, Math.min(fontSize, (overlay.height / numLines) * 0.8));
  };

  // Check if enter and exit animations are word-by-word independently
  const enterTemplate = overlay.styles.animation?.enter
    ? animationTemplates[overlay.styles.animation.enter]
    : null;

  const exitTemplate = overlay.styles.animation?.exit
    ? animationTemplates[overlay.styles.animation.exit]
    : null;

  const isEnterWordByWord = enterTemplate?.isWordByWord || false;
  const isExitWordByWord = exitTemplate?.isWordByWord || false;

  // Apply standard animations if neither is word-by-word
  if (!isEnterWordByWord && !isExitWordByWord) {
    // Apply enter animation only during entry phase
    const enterAnimation =
      !isExitPhase && overlay.styles.animation?.enter
        ? enterTemplate?.enter(
            frame,
            overlay.durationInFrames,
            enterDuration,
            enterEasing,
          )
        : {};

    // Apply exit animation only during exit phase
    const exitAnimation =
      isExitPhase && overlay.styles.animation?.exit
        ? exitTemplate?.exit(
            frame,
            overlay.durationInFrames,
            exitDuration,
            exitEasing,
          )
        : {};

    const containerStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      textAlign: overlay.styles.textAlign,
      justifyContent:
        overlay.styles.textAlign === "center"
          ? "center"
          : overlay.styles.textAlign === "right"
            ? "flex-end"
            : "flex-start",
      overflow: "hidden",
      ...(isExitPhase ? exitAnimation : enterAnimation),
    };

    const { ...restStyles } = overlay.styles;
    const textStyle: React.CSSProperties = {
      ...restStyles,
      animation: undefined,
      fontSize: `${calculateFontSize()}px`,
      fontFamily: getFontFamily(overlay.styles.fontFamily),
      maxWidth: "100%",
      wordWrap: "break-word",
      whiteSpace: "pre-wrap",
      lineHeight: "1.2",
      padding: "0.1em",
    };

    return (
      <div style={containerStyle}>
        <div style={textStyle}>{overlay.content}</div>
      </div>
    );
  }

  // Word-by-word animation for at least one of the phases
  // Split content by newlines first to preserve line breaks
  const lines = overlay.content.split("\n");
  const wordsWithLineBreaks = lines.map((line) => {
    return line.split(/([\s\p{P}]+)/u).filter(Boolean);
  });
  const totalWords = wordsWithLineBreaks.flat().length;

  // For enter animation - calculate frames per word and gap
  const enterWordDelay = Math.floor(enterDuration / 3); // Gap between words

  // For exit animation - make it much faster
  const exitWordDelay = Math.floor(exitDuration / 3);

  // Base styles without animations
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    textAlign: overlay.styles.textAlign,
    justifyContent:
      overlay.styles.textAlign === "center"
        ? "center"
        : overlay.styles.textAlign === "right"
          ? "flex-end"
          : "flex-start",
    overflow: "hidden",
    // Only apply container animation if the current phase is NOT word-by-word
    ...(isExitPhase
      ? !isExitWordByWord && exitTemplate
        ? exitTemplate.exit(
            frame,
            overlay.durationInFrames,
            exitDuration,
            exitEasing,
          )
        : {}
      : !isEnterWordByWord && enterTemplate
        ? enterTemplate.enter(
            frame,
            overlay.durationInFrames,
            enterDuration,
            enterEasing,
          )
        : {}),
  };

  const { ...restStyles } = overlay.styles;
  const textStyle: React.CSSProperties = {
    ...restStyles,
    animation: undefined,
    fontSize: `${calculateFontSize()}px`,
    fontFamily: getFontFamily(overlay.styles.fontFamily),
    maxWidth: "100%",
    wordWrap: "break-word",
    whiteSpace: "pre-wrap",
    lineHeight: "1.2",
    padding: "0.1em",
  };

  return (
    <div style={containerStyle}>
      <div style={textStyle}>
        {wordsWithLineBreaks.map((lineWords, lineIndex) => (
          <React.Fragment key={`line-${lineIndex}`}>
            {lineWords.map((word, wordIndex) => {
              let wordOpacity = 1;

              // Get the global index of this word across all lines
              const globalWordIndex =
                wordsWithLineBreaks.slice(0, lineIndex).flat().length +
                wordIndex;

              if (!isExitPhase && isEnterWordByWord) {
                // Apply word-by-word enter animation
                const wordStartFrame = globalWordIndex * enterWordDelay;
                wordOpacity = interpolateWithEasing(
                  frame,
                  [wordStartFrame, wordStartFrame + enterDuration],
                  [0, 1],
                  enterEasing,
                  { extrapolateRight: "clamp" },
                );
              } else if (isExitPhase && isExitWordByWord) {
                // Apply word-by-word exit animation
                const remainingFrames = overlay.durationInFrames - frame;
                const reverseIndex = totalWords - 1 - globalWordIndex;
                const wordExitFrame = reverseIndex * exitWordDelay;

                wordOpacity = interpolateWithEasing(
                  remainingFrames,
                  [wordExitFrame, wordExitFrame + exitDuration],
                  [0, 1],
                  exitEasing,
                  { extrapolateRight: "clamp" },
                );
              }

              return (
                <span
                  key={`word-${lineIndex}-${wordIndex}`}
                  style={{
                    opacity: wordOpacity,
                    display: word.trim() === "" ? "inline-block" : "inline",
                  }}
                >
                  {word}
                </span>
              );
            })}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
