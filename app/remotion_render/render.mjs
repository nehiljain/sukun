#!/usr/bin/env node
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import process from "process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
// import { OverlayType } from "@/components/editor-rve-v6/types";
const OverlayType = {
  TEXT: "text",
  VIDEO: "video",
  SOUND: "sound",
  CAPTION: "caption",
  IMAGE: "image",
  RECTANGLE: "rectangle",
  WEBCAM: "webcam",
};

// Convert ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option("data", {
    describe: "Path to JSON file containing video data",
    type: "string",
    demandOption: true,
  })
  .option("output", {
    describe: "Output path for rendered video",
    type: "string",
    demandOption: true,
  })
  .option("videoAssetId", {
    describe: "ID of the video asset being rendered",
    type: "string",
    demandOption: true,
  })
  .option("renderToken", {
    describe: "Security token for updating render status",
    type: "string",
    demandOption: true,
  })
  .option("resolution", {
    describe: "Video resolution (720p, 1080p, 2160p)",
    type: "string",
    default: "720p",
  })
  .option("renderSpeed", {
    describe: "Render speed/quality (fast, medium, slow)",
    type: "string",
    default: "medium",
  })
  .parse();

async function main() {
  try {
    console.log("Starting Remotion render process");

    // Read the data file
    const rawData = fs.readFileSync(argv.data, "utf8");
    const data = JSON.parse(rawData);

    // Define composition ID
    const compositionId = "EditorVideoComposition";

    // Bundle the Remotion project
    console.log("Bundling Remotion project...");
    const bundleLocation = await bundle({
      entryPoint: path.resolve(
        __dirname,
        "../client/src/components/editor-render.tsx",
      ),
      webpackOverride: (config) => {
        // Add alias configuration for @ symbol
        config.resolve = {
          ...config.resolve,
          alias: {
            ...config.resolve?.alias,
            "@": path.resolve(__dirname, "../client/src"),
          },
        };
        return config;
      },
    });

    console.log("Bundle created at:", bundleLocation);

    // Get dimensions based on resolution
    const dimensions = getResolutionDimensions(argv.resolution);

    // Prepare input props from data
    const inputProps = {
      overlays: data.overlays || [],
      fps: data.fps || 30,
      durationInFrames: data.durationInFrames || 300,
      aspectRatio: data.aspectRatio || "16:9",
      ...getAspectRatioDimensions(data.aspectRatio || "16:9"),
    };

    // Validate tracks to ensure no unsupported types
    const unsupportedTypes = [];
    (inputProps.overlays || []).forEach((overlay, index) => {
      if (!Object.values(OverlayType).includes(overlay.type)) {
        unsupportedTypes.push(`Overlay ${index}: ${overlay.type}`);
      }
    });

    if (unsupportedTypes.length > 0) {
      console.warn(
        "Warning: Found potentially unsupported item types:",
        unsupportedTypes,
      );
    }

    // Get the composition
    console.log("Selecting composition...");
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    console.log("Composition selected:", composition.id);

    // Get codec settings based on render speed
    const codecSettings = getCodecSettings(argv.renderSpeed);

    // Render the video with resolution and codec settings
    console.log(
      `Starting render with resolution: ${argv.resolution}, render speed: ${argv.renderSpeed}`,
    );
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: codecSettings.codec,
      scale: dimensions.scale,
      x264Preset: codecSettings.preset,
      outputLocation: argv.output,
      inputProps,
    });

    console.log("Render complete! Video saved to:", argv.output);

    // Cleanup the temp data file
    // fs.unlinkSync(argv.data);

    // Write render completion info to a status file instead of making an API call
    writeRenderCompletionFile(argv.videoAssetId, argv.output, argv.renderToken);

    process.exit(0);
  } catch (error) {
    console.error("Error rendering video:", error);
    // Add more detailed error reporting
    if (error.message && error.message.includes("Unknown item type")) {
      console.error(
        "The error appears to be related to an unsupported item type.",
      );
      console.error(
        "Please ensure your Remotion components support all item types in your timeline.",
      );
    }

    // Write error information to status file
    writeRenderErrorFile(argv.videoAssetId, error.message, argv.renderToken);

    process.exit(1);
  }
}

function writeRenderCompletionFile(videoAssetId, outputPath, renderToken) {
  try {
    // Create a status file in a shared directory that Django can access
    const statusDir = path.resolve(process.cwd(), "media", "render_status");

    // Ensure the directory exists
    fs.mkdirSync(statusDir, { recursive: true });

    // Create a unique filename based on the video asset ID and render token
    const statusFilePath = path.join(
      statusDir,
      `render_complete_${videoAssetId}.json`,
    );

    // Write the completion data to the file
    const completionData = {
      videoAssetId,
      outputPath,
      renderToken,
      status: "complete",
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(statusFilePath, JSON.stringify(completionData, null, 2));
    console.log(`Render completion status written to: ${statusFilePath}`);
  } catch (error) {
    console.error("Failed to write render completion file:", error);
  }
}

function writeRenderErrorFile(videoAssetId, errorMessage, renderToken) {
  try {
    // Create a status file in a shared directory that Django can access
    const statusDir = path.resolve(process.cwd(), "media", "render_status");

    // Ensure the directory exists
    fs.mkdirSync(statusDir, { recursive: true });

    // Create a unique filename based on the video asset ID
    const statusFilePath = path.join(
      statusDir,
      `render_error_${videoAssetId}.json`,
    );

    // Write the error data to the file
    const errorData = {
      videoAssetId,
      renderToken,
      status: "error",
      errorMessage,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(statusFilePath, JSON.stringify(errorData, null, 2));
    console.log(`Render error status written to: ${statusFilePath}`);
  } catch (error) {
    console.error("Failed to write render error file:", error);
  }
}

// Helper function to determine dimensions based on resolution
function getResolutionDimensions(resolution, aspectRatio) {
  switch (resolution) {
    case "2160p":
      return { width: 3840, height: 2160, scale: 3 };
    case "1080p":
      return { width: 1920, height: 1080, scale: 1.5 };
    case "720p":
    default:
      return { width: 1280, height: 720, scale: 1 };
  }
}

function getAspectRatioDimensions(aspectRatio) {
  switch (aspectRatio) {
    case "9:16":
      return { width: 1080, height: 1920 }; // TikTok/Story
    case "4:5":
      return { width: 1080, height: 1350 }; // Instagram Post
    case "1:1":
      return { width: 1080, height: 1080 }; // Square Post
    case "16:9":
    default:
      return { width: 1280, height: 720 }; // Landscape (16:9)
  }
}

// Helper function to determine codec settings based on render speed
function getCodecSettings(renderSpeed) {
  switch (renderSpeed) {
    case "slow":
      return { codec: "h264", preset: "veryslow" };
    case "fast":
      return { codec: "h264", preset: "veryfast" };
    case "medium":
    default:
      return { codec: "h264", preset: "medium" };
  }
}

main();
