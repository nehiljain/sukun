// First, let's define the proper types
interface AnimationStyles {
  enter?: boolean;
  exit?: boolean;
  enterDuration?: number;
  exitDuration?: number;
}

interface Overlay {
  styles: {
    animation?: AnimationStyles;
  };
  durationInFrames: number;
}

interface AnimationIndicatorsProps {
  overlay?: Overlay;
}

const AnimationIndicators = ({ overlay }: AnimationIndicatorsProps) => {
  if (!overlay?.styles?.animation) return null;

  const enterDuration = overlay.styles.animation.enterDuration || 15;
  const exitDuration = overlay.styles.animation.exitDuration || 15;

  return (
    <>
      {overlay.styles.animation.enter && (
        <div
          className="absolute h-1 bg-blue-500 opacity-100 rounded-sm"
          style={{
            left: 0,
            bottom: 0,
            width: `${(enterDuration / overlay.durationInFrames) * 100}%`,
          }}
          title={`Enter: ${enterDuration} frames`}
        />
      )}

      {overlay.styles.animation.exit && (
        <div
          className="absolute h-1 bg-red-500 opacity-100 rounded-sm"
          style={{
            right: 0,
            bottom: 0,
            width: `${(exitDuration / overlay.durationInFrames) * 100}%`,
          }}
          title={`Exit: ${exitDuration} frames`}
        />
      )}
    </>
  );
};

export default AnimationIndicators;
