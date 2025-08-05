export interface BrandAsset {
  id: string;
  name: string;
  colors: string[];
  logo: {
    url: string;
    darkVersion?: string;
  };
  font: {
    family: string;
    size: string;
    weight: string;
  };
  voiceover: {
    voice: string;
    language: string;
    pitch: number;
    speed: number;
  };
  cover: {
    url: string;
    type: "image" | "video";
  };
  introVideo: {
    url: string;
    duration: number;
  };
  outroVideo: {
    url: string;
    duration: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CreateBrandAssetDTO = Omit<
  BrandAsset,
  "id" | "createdAt" | "updatedAt"
>;
