import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMerriweather } from "@remotion/google-fonts/Merriweather";
import { loadFont as loadRobotoMono } from "@remotion/google-fonts/RobotoMono";
import { loadFont as loadVT323 } from "@remotion/google-fonts/VT323";
import { loadFont as loadOpenSans } from "@remotion/google-fonts/OpenSans";
import { loadFont as loadLato } from "@remotion/google-fonts/Lato";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSourceCodePro } from "@remotion/google-fonts/SourceCodePro";
import { loadFont as loadPermanentMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadDancingScript } from "@remotion/google-fonts/DancingScript";
import { loadFont as loadShadowsIntoLight } from "@remotion/google-fonts/ShadowsIntoLight";
import { loadFont as loadPacifico } from "@remotion/google-fonts/Pacifico";
import { loadFont as loadRubik } from "@remotion/google-fonts/Rubik";
import { loadFont as loadQuicksand } from "@remotion/google-fonts/Quicksand";

// Font definitions
const fontFamilies = [
  { value: "font-sans", label: "Sans Serif" },
  { value: "font-serif", label: "Serif" },
  { value: "font-mono", label: "Monospace" },
  { value: "font-retro", label: "Retro" },
  { value: "font-inter", label: "Inter" },
  { value: "font-merriweather", label: "Merriweather" },
  { value: "font-roboto-mono", label: "Roboto Mono" },
  { value: "font-vt323", label: "VT323" },
  { value: "font-open-sans", label: "Open Sans" },
  { value: "font-lato", label: "Lato" },
  { value: "font-montserrat", label: "Montserrat" },
  { value: "font-roboto", label: "Roboto" },
  { value: "font-oswald", label: "Oswald" },
  { value: "font-raleway", label: "Raleway" },
  { value: "font-poppins", label: "Poppins" },
  { value: "font-playfair", label: "Playfair Display" },
  { value: "font-source-code", label: "Source Code Pro" },
  { value: "font-permanent-marker", label: "Permanent Marker" },
  { value: "font-caveat", label: "Caveat" },
  { value: "font-dancing-script", label: "Dancing Script" },
  { value: "font-shadows-into-light", label: "Shadows Into Light" },
  { value: "font-pacifico", label: "Pacifico" },
  { value: "font-rubik", label: "Rubik" },
  { value: "font-quicksand", label: "Quicksand" },
];

// Create a cache to store loaded fonts
const loadedFonts: Record<string, string> = {};

// Lazy load the font modules
const fontLoaders: Record<string, () => Promise<{ fontFamily: string }>> = {
  "font-sans": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Inter");
    return loadFont();
  },
  "font-serif": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Merriweather");
    return loadFont();
  },
  "font-mono": async () => {
    const { loadFont } = await import("@remotion/google-fonts/RobotoMono");
    return loadFont();
  },
  "font-retro": async () => {
    const { loadFont } = await import("@remotion/google-fonts/VT323");
    return loadFont();
  },
  "font-inter": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Inter");
    return loadFont();
  },
  "font-merriweather": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Merriweather");
    return loadFont();
  },
  "font-roboto-mono": async () => {
    const { loadFont } = await import("@remotion/google-fonts/RobotoMono");
    return loadFont();
  },
  "font-vt323": async () => {
    const { loadFont } = await import("@remotion/google-fonts/VT323");
    return loadFont();
  },
  "font-open-sans": async () => {
    const { loadFont } = await import("@remotion/google-fonts/OpenSans");
    return loadFont();
  },
  "font-lato": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Lato");
    return loadFont();
  },
  "font-montserrat": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Montserrat");
    return loadFont();
  },
  "font-roboto": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Roboto");
    return loadFont();
  },
  "font-oswald": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Oswald");
    return loadFont();
  },
  "font-raleway": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Raleway");
    return loadFont();
  },
  "font-poppins": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Poppins");
    return loadFont();
  },
  "font-playfair": async () => {
    const { loadFont } = await import("@remotion/google-fonts/PlayfairDisplay");
    return loadFont();
  },
  "font-source-code": async () => {
    const { loadFont } = await import("@remotion/google-fonts/SourceCodePro");
    return loadFont();
  },
  "font-permanent-marker": async () => {
    const { loadFont } = await import("@remotion/google-fonts/PermanentMarker");
    return loadFont();
  },
  "font-caveat": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Caveat");
    return loadFont();
  },
  "font-dancing-script": async () => {
    const { loadFont } = await import("@remotion/google-fonts/DancingScript");
    return loadFont();
  },
  "font-shadows-into-light": async () => {
    const { loadFont } = await import(
      "@remotion/google-fonts/ShadowsIntoLight"
    );
    return loadFont();
  },
  "font-pacifico": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Pacifico");
    return loadFont();
  },
  "font-rubik": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Rubik");
    return loadFont();
  },
  "font-quicksand": async () => {
    const { loadFont } = await import("@remotion/google-fonts/Quicksand");
    return loadFont();
  },
};

// Function to load a font family
const loadFontFamily = async (fontClass: string): Promise<string> => {
  // Return from cache if already loaded
  if (loadedFonts[fontClass]) {
    return loadedFonts[fontClass];
  }

  try {
    // Get the appropriate loader or default to Inter
    const loader = fontLoaders[fontClass] || fontLoaders["font-inter"];
    const { fontFamily } = await loader();

    // Cache the result
    loadedFonts[fontClass] = fontFamily;
    return fontFamily;
  } catch (error) {
    console.error(`Failed to load font ${fontClass}:`, error);
    // Default to system sans-serif if loading fails
    return "sans-serif";
  }
};

// Maintain backwards compatibility by providing both sync and async interfaces
const getFontFamily = (fontClass: string = "font-sans"): string => {
  // If the font is already loaded, return it immediately
  if (loadedFonts[fontClass]) {
    return loadedFonts[fontClass];
  }

  // Otherwise, load it asynchronously but return a fallback immediately
  // This maintains backward compatibility with existing components
  loadFontFamily(fontClass).catch(console.error);

  // Return system fallback for immediate rendering
  return fontClass.includes("serif")
    ? "serif"
    : fontClass.includes("mono")
      ? "monospace"
      : "sans-serif";
};

const getFontFamilies = () => {
  return fontFamilies;
};

export const useFonts = () => {
  return {
    getFontFamily,
    getFontFamilies,
  };
};
