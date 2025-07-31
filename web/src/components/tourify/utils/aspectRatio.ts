// Calculate the closest supported aspect ratio
export function getClosestAspectRatio(
  width: number,
  height: number,
): "16:9" | "9:16" | "1:1" {
  const ratio = width / height;

  // Define supported ratios and their numeric values
  const supportedRatios = {
    "16:9": 16 / 9, // ~1.77
    "1:1": 1, // 1.0
    "9:16": 9 / 16, // ~0.5625
  };

  // Find the closest ratio by calculating the difference
  let closestRatio: "16:9" | "9:16" | "1:1" = "16:9";
  let minDiff = Math.abs(ratio - supportedRatios["16:9"]);

  for (const [key, value] of Object.entries(supportedRatios)) {
    const diff = Math.abs(ratio - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestRatio = key as "16:9" | "9:16" | "1:1";
    }
  }

  return closestRatio;
}

// Check if all images have the same aspect ratio (within a small tolerance)
export function hasMixedAspectRatios(
  images: Array<{ metadata?: { width: number; height: number } }>,
): boolean {
  if (images.length <= 1) return false;

  const firstImage = images[0];
  if (!firstImage?.metadata?.width || !firstImage?.metadata?.height)
    return false;

  const firstRatio = getClosestAspectRatio(
    firstImage.metadata.width,
    firstImage.metadata.height,
  );

  return images.some((img) => {
    if (!img?.metadata?.width || !img?.metadata?.height) return false;
    const currentRatio = getClosestAspectRatio(
      img.metadata.width,
      img.metadata.height,
    );
    return currentRatio !== firstRatio;
  });
}
