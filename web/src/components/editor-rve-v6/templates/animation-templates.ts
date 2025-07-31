import { interpolate } from "remotion";
import { EasingPreset } from "../types";
import { interpolateWithEasing } from "../utils/easing-functions";

export type AnimationTemplate = {
  name: string;
  preview: string;
  isPro?: boolean;
  enter: (
    frame: number,
    durationInFrames: number,
    animationDuration?: number,
    easing?: EasingPreset,
  ) => {
    transform?: string;
    opacity?: number;
    filter?: string;
  };
  exit: (
    frame: number,
    durationInFrames: number,
    animationDuration?: number,
    easing?: EasingPreset,
  ) => {
    transform?: string;
    opacity?: number;
    filter?: string;
  };
  isWordByWord?: boolean;
  recommendedMinDuration?: number;
  recommendedMaxDuration?: number;
  component?: React.FC<any>;
  defaultProps?: any;
};

export const animationTemplates: Record<string, AnimationTemplate> = {
  fade: {
    name: "Fade",
    preview: "Simple fade in/out",
    recommendedMinDuration: 5,
    recommendedMaxDuration: 45,
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      opacity: interpolateWithEasing(
        frame,
        [0, animationDuration],
        [0, 1],
        easing,
        { extrapolateRight: "clamp" },
      ),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      opacity: interpolateWithEasing(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        easing,
        { extrapolateLeft: "clamp" },
      ),
    }),
  },
  fadeWords: {
    name: "Fade Words",
    preview: "Words fade in/out sequentially",
    recommendedMinDuration: 3,
    recommendedMaxDuration: 15,
    enter: (
      frame,
      totalDuration,
      animationDuration = 6,
      easing = "easeOut",
    ) => ({
      opacity: interpolateWithEasing(
        frame,
        [0, animationDuration],
        [0, 1],
        easing,
        { extrapolateRight: "clamp" },
      ),
    }),
    exit: (frame, totalDuration, animationDuration = 6, easing = "easeIn") => ({
      opacity: interpolateWithEasing(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        easing,
        { extrapolateLeft: "clamp" },
      ),
    }),
    isWordByWord: true,
  },
  slideRight: {
    name: "Slide",
    preview: "Slide in from left",
    isPro: true,
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `translateX(${interpolate(
        frame,
        [0, animationDuration],
        [-100, 0],
        {
          extrapolateRight: "clamp",
        },
      )}%)`,
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `translateX(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, 100],
        { extrapolateLeft: "clamp" },
      )}%)`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  scale: {
    name: "Scale",
    preview: "Scale in/out",
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `scale(${interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      })})`,
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `scale(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        { extrapolateLeft: "clamp" },
      )})`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  rectangleDraw: {
    name: "Draw",
    preview: "Draw rectangle outline",
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  bounce: {
    name: "Bounce",
    preview: "Bouncy entrance and exit",
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `translateY(${interpolate(
        frame,
        [
          0,
          (animationDuration * 2) / 3,
          animationDuration * 0.87,
          animationDuration,
        ],
        [100, -20, 10, 0],
        {
          extrapolateRight: "clamp",
        },
      )}%) scale(${interpolate(
        frame,
        [
          0,
          (animationDuration * 2) / 3,
          animationDuration * 0.87,
          animationDuration,
        ],
        [0.8, 1.1, 0.95, 1],
        {
          extrapolateRight: "clamp",
        },
      )})`,
      opacity: interpolate(frame, [0, animationDuration * 0.53], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `translateY(${interpolate(
        frame,
        [
          totalDuration - animationDuration,
          totalDuration - animationDuration * 0.87,
          totalDuration - (animationDuration * 2) / 3,
          totalDuration,
        ],
        [0, -10, 20, 100],
        { extrapolateLeft: "clamp" },
      )}%) scale(${interpolate(
        frame,
        [
          totalDuration - animationDuration,
          totalDuration - animationDuration * 0.87,
          totalDuration - (animationDuration * 2) / 3,
          totalDuration,
        ],
        [1, 0.95, 1.1, 0.8],
        { extrapolateLeft: "clamp" },
      )})`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration * 0.53, totalDuration],
        [1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  flipIn: {
    name: "Flip",
    preview: "3D flip entrance and exit",
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `perspective(1000px) rotateY(${interpolate(
        frame,
        [0, animationDuration],
        [90, 0],
        {
          extrapolateRight: "clamp",
        },
      )}deg)`,
      opacity: interpolate(
        frame,
        [0, animationDuration * 0.33, animationDuration],
        [0, 0.5, 1],
        {
          extrapolateRight: "clamp",
        },
      ),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `perspective(1000px) rotateY(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, -90],
        { extrapolateLeft: "clamp" },
      )}deg)`,
      opacity: interpolate(
        frame,
        [
          totalDuration - animationDuration,
          totalDuration - animationDuration * 0.33,
          totalDuration,
        ],
        [1, 0.5, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  slideUp: {
    name: "Slide Up",
    preview: "Slide in from bottom",
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `translateY(${interpolate(
        frame,
        [0, animationDuration],
        [100, 0],
        {
          extrapolateRight: "clamp",
        },
      )}%)`,
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `translateY(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, -100],
        { extrapolateLeft: "clamp" },
      )}%)`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  elastic: {
    name: "Elastic",
    preview: "Elastic bouncy effect",
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `scale(${interpolate(
        frame,
        [
          0,
          animationDuration * 0.53,
          animationDuration * 0.8,
          animationDuration,
        ],
        [0, 1.2, 0.9, 1],
        {
          extrapolateRight: "clamp",
        },
      )})`,
      opacity: interpolate(frame, [0, animationDuration * 0.53], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `scale(${interpolate(
        frame,
        [
          totalDuration - animationDuration,
          totalDuration - animationDuration * 0.8,
          totalDuration - animationDuration * 0.53,
          totalDuration,
        ],
        [1, 0.9, 1.2, 0],
        { extrapolateLeft: "clamp" },
      )})`,
      opacity: interpolate(
        frame,
        [
          totalDuration - animationDuration,
          totalDuration - animationDuration * 0.53,
          totalDuration,
        ],
        [1, 1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  rotateIn: {
    name: "Rotate",
    preview: "Rotate in and out",
    isPro: true,
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `rotate(${interpolate(
        frame,
        [0, animationDuration],
        [180, 0],
        {
          extrapolateRight: "clamp",
        },
      )}deg) scale(${interpolate(frame, [0, animationDuration], [0.5, 1], {
        extrapolateRight: "clamp",
      })})`,
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `rotate(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, -180],
        { extrapolateLeft: "clamp" },
      )}deg) scale(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0.5],
        {
          extrapolateLeft: "clamp",
        },
      )})`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  blurFade: {
    name: "Blur Fade",
    preview: "Fade with blur effect",
    isPro: true,
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      filter: `blur(${interpolate(frame, [0, animationDuration], [20, 0], {
        extrapolateRight: "clamp",
      })}px)`,
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      filter: `blur(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, 20],
        {
          extrapolateLeft: "clamp",
        },
      )}px)`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        {
          extrapolateLeft: "clamp",
        },
      ),
    }),
  },
  blurToTheLeft: {
    name: "Blur Left",
    preview: "Blur and slide to the left",
    isPro: true,
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `translateX(${interpolate(
        frame,
        [0, animationDuration],
        [100, 0],
        {
          extrapolateRight: "clamp",
        },
      )}%)`,
      filter: `blur(${interpolate(frame, [0, animationDuration], [15, 0], {
        extrapolateRight: "clamp",
      })}px)`,
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `translateX(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, -100],
        { extrapolateLeft: "clamp" },
      )}%)`,
      filter: `blur(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, 15],
        { extrapolateLeft: "clamp" },
      )}px)`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        { extrapolateLeft: "clamp" },
      ),
    }),
  },
  blurToTheRight: {
    name: "Blur Right",
    preview: "Blur and slide to the right",
    isPro: true,
    enter: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeOut",
    ) => ({
      transform: `translateX(${interpolate(
        frame,
        [0, animationDuration],
        [-100, 0],
        {
          extrapolateRight: "clamp",
        },
      )}%)`,
      filter: `blur(${interpolate(frame, [0, animationDuration], [15, 0], {
        extrapolateRight: "clamp",
      })}px)`,
      opacity: interpolate(frame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      }),
    }),
    exit: (
      frame,
      totalDuration,
      animationDuration = 15,
      easing = "easeIn",
    ) => ({
      transform: `translateX(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, 100],
        { extrapolateLeft: "clamp" },
      )}%)`,
      filter: `blur(${interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [0, 15],
        { extrapolateLeft: "clamp" },
      )}px)`,
      opacity: interpolate(
        frame,
        [totalDuration - animationDuration, totalDuration],
        [1, 0],
        { extrapolateLeft: "clamp" },
      ),
    }),
  },
};
