import { Easing, interpolate } from "remotion";
import { EasingPreset } from "../types";

// Map easing presets to Remotion easing functions
export const getEasingFunction = (preset: EasingPreset = "linear") => {
  switch (preset) {
    case "linear":
      return Easing.linear;
    case "easeIn":
      return Easing.in(Easing.cubic);
    case "easeOut":
      return Easing.out(Easing.cubic);
    case "easeInOut":
      return Easing.inOut(Easing.cubic);
    default:
      return Easing.linear;
  }
};

// Apply easing to a normalized value (0-1)
export const applyEasing = (value: number, preset: EasingPreset = "linear") => {
  const easingFn = getEasingFunction(preset);
  return easingFn(value);
};

// Enhanced interpolate function with easing support
export const interpolateWithEasing = (
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  easing: EasingPreset = "linear",
  options?: { extrapolateLeft?: string; extrapolateRight?: string },
) => {
  // Get easing function
  const easingFn = getEasingFunction(easing);

  // First, normalize the frame to 0-1 range
  const normalizedFrame = Math.max(
    0,
    Math.min(1, (frame - inputRange[0]) / (inputRange[1] - inputRange[0])),
  );

  // Apply easing
  const easedFrame = easingFn(normalizedFrame);

  // Map back to output range
  const result =
    outputRange[0] + (outputRange[1] - outputRange[0]) * easedFrame;

  // Handle extrapolation
  if (frame < inputRange[0] && options?.extrapolateLeft === "clamp") {
    return outputRange[0];
  }
  if (frame > inputRange[1] && options?.extrapolateRight === "clamp") {
    return outputRange[1];
  }

  return result;
};
