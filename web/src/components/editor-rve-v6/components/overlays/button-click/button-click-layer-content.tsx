import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate, spring } from "remotion";
import { ButtonClickOverlay } from "../../../types";
import {
  IconCaretUpFilled,
  IconHeart,
  IconStar,
  IconCheck,
  IconThumbUp,
  IconPlus,
  IconShoppingCart,
  IconHandFinger,
  IconHandClick,
} from "@tabler/icons-react";

interface ButtonClickLayerContentProps {
  overlay: ButtonClickOverlay;
}

export const ButtonClickLayerContent: React.FC<
  ButtonClickLayerContentProps
> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { buttonText, timing, cursor, styles } = overlay;

  const {
    buttonEntryDuration, // 15 frames = 0.5s
    cursorMovementDuration, // 15 frames = 0.5s (same as button entry)
    clickDuration, // 5 frames = 0.167s
    stateChangeDuration, // 10 frames = 0.333s
  } = timing;

  // Total duration of all phases (30 frames = 1s)
  const totalDuration =
    buttonEntryDuration + clickDuration + stateChangeDuration; // 15 + 5 + 10 = 30 frames

  // Determine which phase we're in
  const isInButtonEntryPhase = frame < buttonEntryDuration; // 0-14 frames
  const isInCursorMovementPhase = frame < buttonEntryDuration; // 0-14 frames (concurrent with button entry)
  const isInClickPhase =
    frame >= buttonEntryDuration && frame < buttonEntryDuration + clickDuration; // 15-19 frames
  const isInStateChangePhase = frame >= buttonEntryDuration + clickDuration; // 20-30 frames

  // Calculate button scale with spring physics for entry (0-14 frames)
  const buttonScale = isInButtonEntryPhase
    ? spring({
        frame,
        fps: 30,
        from: 0,
        to: 1,
        durationInFrames: buttonEntryDuration,
        config: {
          damping: 10, // Reduced damping for quicker movement
          stiffness: 250, // Increased stiffness for faster spring
          mass: 0.8, // Reduced mass for lighter feel
        },
      })
    : 1;

  // Calculate button pressed effect during click (15-19 frames)
  const buttonPressScale = isInClickPhase
    ? interpolate(
        frame - buttonEntryDuration,
        [0, clickDuration / 2, clickDuration], // [0, 2.5, 5] frames for press animation
        [1, 0.95, 1],
      )
    : 1;

  // Combine scales
  const finalButtonScale = buttonScale * buttonPressScale;

  // Convert percentage coordinates to actual pixels for cursor positioning
  const getPixelCoordinates = (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    console.log("Converting coordinates in button-click-layer-content.tsx:", {
      x,
      y,
      width,
      height,
    });
    const result = {
      x: (x / 100) * width,
      y: (y / 100) * height,
    };
    console.log(
      "Converted to pixels in button-click-layer-content.tsx:",
      result,
    );
    return result;
  };

  // During button entry phase
  console.log("Raw cursor settings in button-click-layer-content.tsx:", {
    startPosition: overlay.cursor.startPosition,
    endPosition: overlay.cursor.endPosition,
    overlayDimensions: { width: overlay.width, height: overlay.height },
  });

  const startPos = getPixelCoordinates(
    overlay.cursor.startPosition.x,
    overlay.cursor.startPosition.y,
    overlay.width,
    overlay.height,
  );

  // During cursor movement phase
  const endPos = getPixelCoordinates(
    overlay.cursor.endPosition.x,
    overlay.cursor.endPosition.y,
    overlay.width,
    overlay.height,
  );

  const easeOutQuad = (t: number) => t * (2 - t);

  // Calculate cursor movement progress
  const cursorProgress = isInCursorMovementPhase
    ? easeOutQuad(frame / buttonEntryDuration)
    : isInClickPhase || isInStateChangePhase
      ? 1
      : 0;

  console.log("Animation state in button-click-layer-content.tsx:", {
    frame,
    phase: isInButtonEntryPhase
      ? "entry"
      : isInCursorMovementPhase
        ? "movement"
        : isInClickPhase
          ? "click"
          : isInStateChangePhase
            ? "stateChange"
            : "unknown",
    progress: cursorProgress,
    startPos,
    endPos,
  });

  const cursorX = startPos.x + (endPos.x - startPos.x) * cursorProgress;
  const cursorY = startPos.y + (endPos.y - startPos.y) * cursorProgress;

  console.log("Current cursor position in button-click-layer-content.tsx:", {
    cursorX,
    cursorY,
  });

  // Determine button styles based on phase
  const isAfterClick = isInStateChangePhase;
  const currentText = isAfterClick ? buttonText.after : buttonText.before;
  const currentBgColor = isAfterClick
    ? styles.afterStyles.backgroundColor
    : styles.beforeStyles.backgroundColor;
  const currentTextColor = isAfterClick
    ? styles.afterStyles.textColor
    : styles.beforeStyles.textColor;

  // Calculate button dimensions based on overlay size
  // Base size for reference (assuming a 500x300 overlay as reference)
  const baseOverlayWidth = 500;
  const baseOverlayHeight = 300;

  // Calculate scale factors based on current dimensions
  // Check if overlay dimensions exist and are valid, otherwise use 1 as default scale
  const widthScale =
    overlay.width && overlay.width > 0 ? overlay.width / baseOverlayWidth : 1;
  const heightScale =
    overlay.height && overlay.height > 0
      ? overlay.height / baseOverlayHeight
      : 1;
  const overallScale = Math.min(widthScale, heightScale); // Use the smaller scale to maintain aspect ratio

  // Calculate dynamic font size based on text length
  const calculateDynamicFontSize = (text: string, baseSize: number) => {
    const textLength = text.length;
    if (textLength > 20) {
      // Reduce the font size less aggressively for longer text
      return Math.max(
        12,
        Math.round(baseSize * (30 / textLength) * overallScale),
      );
    }
    return Math.max(12, Math.round(baseSize * overallScale));
  };

  // Scale button dimensions
  const baseFontSize = parseInt(styles.beforeStyles.fontSize) || 16;
  const scaledFontSize = calculateDynamicFontSize(currentText, baseFontSize);

  const baseBorderRadius = styles.beforeStyles.borderRadius;
  const scaledBorderRadius = Math.round(baseBorderRadius * overallScale);

  // Parse padding to apply scaling
  const parsePadding = (paddingStr: string) => {
    // Handle different padding formats like "10px", "10px 20px", "10px 20px 10px 20px"
    const parts = paddingStr.split(" ").map((part) => {
      const value = parseInt(part);
      return isNaN(value) ? 8 : Math.round(value * overallScale) + "px";
    });
    return parts.join(" ");
  };

  const scaledPadding = parsePadding(styles.beforeStyles.padding);

  // Calculate icon size
  const baseIconSize = parseInt(styles.icon.size) || 16;
  const scaledIconSize = Math.max(10, Math.round(baseIconSize * overallScale)); // Minimum icon size of 10px

  // Parse margin for icon
  const baseIconMargin = parseInt(styles.icon.marginRight) || 8;
  const scaledIconMargin = Math.round(baseIconMargin * overallScale) + "px";

  // Function to render Tabler icons based on icon type
  const renderTablerIcon = (iconType: string, size: number, color: string) => {
    console.log(
      "Rendering icon with type:",
      iconType,
      "size:",
      size,
      "color:",
      color,
    );
    const iconProps = {
      size,
      color,
      stroke: 2.5,
      fill: color,
      fillOpacity: 0.2,
    };

    switch (iconType) {
      case "arrow-up":
        return <IconCaretUpFilled size={size * 1.5} color={color} />;
      case "heart":
        return <IconHeart {...iconProps} />;
      case "star":
        return <IconStar {...iconProps} />;
      case "check":
        return <IconCheck {...iconProps} />;
      case "thumb-up":
        return <IconThumbUp {...iconProps} />;
      case "plus":
        return <IconPlus {...iconProps} />;
      case "shopping-cart":
        return <IconShoppingCart {...iconProps} />;
      default:
        console.warn("Unknown icon type:", iconType);
        return <IconCaretUpFilled size={size} color={color} />; // Default to caret-up instead of arrow-up
    }
  };

  // Calculate button width based on text length
  const baseMinWidth = Math.max(
    styles.beforeStyles.minWidth ? parseInt(styles.beforeStyles.minWidth) : 120,
    Math.min(currentText.length * 10, 300), // Increase width based on text length, but cap at 300px
  );
  const scaledMinWidth = Math.round(baseMinWidth * overallScale) + "px";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Button */}
      <div
        style={{
          backgroundColor: currentBgColor,
          color: currentTextColor,
          fontFamily: styles.beforeStyles.fontFamily,
          padding: scaledPadding,
          borderRadius: scaledBorderRadius,
          fontSize: `${scaledFontSize}px`,
          fontWeight: styles.beforeStyles.fontWeight,
          borderWidth: styles.beforeStyles.borderWidth,
          borderColor: isAfterClick
            ? styles.afterStyles.borderColor || styles.beforeStyles.borderColor
            : styles.beforeStyles.borderColor,
          borderStyle: styles.beforeStyles.borderStyle,
          boxShadow: isAfterClick
            ? styles.afterStyles.boxShadow || styles.beforeStyles.boxShadow
            : styles.beforeStyles.boxShadow,
          minWidth: scaledMinWidth,
          maxWidth: "100%", // Changed from 80% to allow longer text
          width: "auto", // Allow button to grow based on content
          display: "inline-flex", // Changed to inline-flex for better text handling
          justifyContent: "center",
          alignItems: "center",
          textTransform: styles.beforeStyles.textTransform as
            | "none"
            | "capitalize"
            | "uppercase"
            | "lowercase"
            | undefined,
          letterSpacing: styles.beforeStyles.letterSpacing,
          transition: isInStateChangePhase
            ? styles.beforeStyles.transition
            : "none",
          transform: `scale(${finalButtonScale})`,
          position: "relative",
          gap: `${Math.round(8 * overallScale)}px`,
          userSelect: "none",
          whiteSpace: "nowrap",
          overflow: "visible", // Changed from hidden to show full text
          textOverflow: "clip", // Changed from ellipsis to show full text
        }}
      >
        {/* Icon - conditionally rendered based on position and visibility */}
        {styles.icon.show && styles.icon.position === "left" && (
          <div style={{ marginRight: scaledIconMargin, flexShrink: 0 }}>
            {renderTablerIcon(
              styles.icon.type,
              scaledIconSize,
              isAfterClick ? styles.icon.afterColor : styles.icon.color,
            )}
          </div>
        )}

        <span
          style={{
            display: "inline-block",
            overflow: "visible", // Changed from hidden to show full text
            textOverflow: "clip", // Changed from ellipsis to show full text
            whiteSpace: "nowrap",
          }}
        >
          {currentText}
        </span>

        {/* Right-positioned icon */}
        {styles.icon.show && styles.icon.position === "right" && (
          <div style={{ marginLeft: scaledIconMargin, flexShrink: 0 }}>
            {renderTablerIcon(
              styles.icon.type,
              scaledIconSize,
              isAfterClick ? styles.icon.afterColor : styles.icon.color,
            )}
          </div>
        )}
      </div>

      {/* Cursor */}
      {(isInCursorMovementPhase || isInClickPhase || isInStateChangePhase) && (
        <div
          style={{
            position: "absolute",
            left: `${cursorX}px`,
            top: `${cursorY}px`,
            transform: "translate(-50%, -50%)",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          {/* Hand cursor using Tabler icons */}
          {isInClickPhase ? (
            <IconHandClick
              size={Math.max(24, Math.round(32 * overallScale))}
              color="#0055dd"
              stroke={1.5}
              fill="#ffffff"
              style={{
                filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))",
                transform: "scale(0.95)",
                transition: "transform 0.1s ease, color 0.1s ease",
              }}
            />
          ) : (
            <IconHandFinger
              size={Math.max(24, Math.round(32 * overallScale))}
              color="#000000"
              stroke={2}
              fill="#ffffff"
              style={{
                filter: "none",
                transform: "scale(1)",
                transition: "transform 0.1s ease, color 0.1s ease",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
