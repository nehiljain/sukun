import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchPropertyImages } from "./api";
import { PropertyImage, ImageItem } from "./types";
import { toast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface ZillowUrlInputProps {
  onImagesLoaded: (images: ImageItem[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

interface QuickSearchProperty {
  address: string;
  url: string;
}

export function ZillowUrlInput({
  onImagesLoaded,
  onLoadingChange,
}: ZillowUrlInputProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();
  const quickSearchProperties: QuickSearchProperty[] = [
    {
      address: "399 Camino Al Lago",
      url: "https://www.realtor.com/realestateandhomes-detail/399-Camino-Al-Lago_Menlo-Park_CA_94027_M20013-64924",
    },
    {
      address: "720 Vine St",
      url: "https://www.realtor.com/realestateandhomes-detail/720-Vine-St_Menlo-Park_CA_94025_M97545-23701",
    },
  ];

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setError("");
  };

  const validateUrl = (url: string) => {
    // Basic validation for realtor.com URLs
    return (
      url.trim().startsWith("https://www.realtor.com/") ||
      url.trim().startsWith("http://www.realtor.com/") ||
      url.trim().startsWith("www.realtor.com/") ||
      url.trim().startsWith("realtor.com/")
    );
  };

  const handleQuickSearch = (propertyUrl: string) => {
    setUrl(propertyUrl);
    handleFetchImagesWithUrl(propertyUrl);
  };

  const handleFetchImagesWithUrl = async (urlToFetch: string) => {
    // Basic validation
    if (!urlToFetch.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!validateUrl(urlToFetch)) {
      setError("Please enter a valid realtor.com URL");
      return;
    }

    try {
      setIsLoading(true);
      onLoadingChange(true);

      const response = await fetchPropertyImages(urlToFetch);

      if (!response || response.length === 0) {
        toast({
          title: "No images found",
          description: "We couldn't find any images at that URL",
          variant: "destructive",
        });
        return;
      }

      // Convert API response to ImageItem format
      const propertyImages: ImageItem[] = response.map((img: PropertyImage) => {
        // Create an empty file to match the ImageItem interface
        const emptyFile = new File([], img.alt_text || "property-image.jpg", {
          type: "image/jpeg",
        });

        return {
          id: img.id,
          propertyImageId: img.id, // Store the property image ID
          src: img.image_url,
          file: emptyFile,
          isValid: true,
          cloudUrl: img.image_url,
          metadata: {
            // These would ideally be fetched from the API
            width: 1000, // Default values
            height: 750,
            propertyType: "property",
            roomType: img.is_primary ? "exterior" : "interior",
            propertyImageId: img.id, // Also store in metadata for backend reference
          },
        };
      });

      // pick 5 images from the propertyImages array, they should equally spaced in the array. The max should be 5 for unauthenticated users, and 10 for authenticated users.
      const maxImages = isAuthenticated ? 10 : 5;
      const selectedImages = [];

      if (propertyImages.length <= maxImages) {
        // If we have fewer images than the max, use all of them
        selectedImages.push(...propertyImages);
      } else {
        // Calculate the step size to get equally spaced images
        const step = propertyImages.length / maxImages;

        // Select equally spaced images
        for (let i = 0; i < maxImages; i++) {
          const index = Math.min(
            Math.floor(i * step),
            propertyImages.length - 1,
          );
          selectedImages.push(propertyImages[index]);
        }
      }

      onImagesLoaded(selectedImages);

      toast({
        title: "Property Images Loaded",
        description: `${selectedImages.length} images loaded from realtor.com`,
      });

      // Reset the input
      setUrl("");
    } catch (error) {
      console.error("Error fetching property images:", error);
      toast({
        title: "Error",
        description: "Failed to fetch images from the URL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      onLoadingChange(false);
    }
  };

  const handleFetchImages = async () => {
    await handleFetchImagesWithUrl(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        <p className="text-xs text-slate-400 w-full mb-1">Quick search:</p>
        {quickSearchProperties.map((property, index) => (
          <Badge
            key={index}
            variant="outline"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            onClick={() => handleQuickSearch(property.url)}
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" && handleQuickSearch(property.url)
            }
            aria-label={`Quick search for ${property.address}`}
          >
            {property.address}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col space-y-2">
        <label
          htmlFor="property-url"
          className="text-sm font-medium text-slate-200"
        >
          Import from realtor.com (Beta)
        </label>
        <div className="flex gap-2">
          <Input
            id="property-url"
            placeholder="https://www.realtor.com/realestateandhomes-detail/..."
            value={url}
            onChange={handleUrlChange}
            className="flex-grow bg-slate-800 border-slate-700 text-white"
            disabled={isLoading}
          />
          <Button
            onClick={handleFetchImages}
            disabled={isLoading}
            className="bg-slate-700 hover:bg-slate-600"
          >
            {isLoading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin inline-block" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <p className="text-xs text-slate-400">
        Make sure you have rights, before sharing on social.
      </p>
    </div>
  );
}
