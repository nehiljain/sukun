import React, { createContext, useContext, useState, useEffect } from "react";
import { BrandAsset, CreateBrandAssetDTO } from "@/types/brand";

interface BrandContextType {
  brandAssets: BrandAsset[];
  selectedAsset: BrandAsset | null;
  isLoading: boolean;
  error: string | null;
  createBrandAsset: (asset: CreateBrandAssetDTO) => Promise<void>;
  updateBrandAsset: (id: string, asset: Partial<BrandAsset>) => Promise<void>;
  deleteBrandAsset: (id: string) => Promise<void>;
  selectAsset: (asset: BrandAsset | null) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBrandAssets();
  }, []);

  const fetchBrandAssets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/brand-assets/", {
        credentials: "include",
      });
      const data = await response.json();
      setBrandAssets(data);
    } catch (err) {
      setError("Failed to fetch brand assets");
    } finally {
      setIsLoading(false);
    }
  };

  const createBrandAsset = async (asset: CreateBrandAssetDTO) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/brand-assets/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(asset),
      });
      const newAsset = await response.json();
      setBrandAssets([...brandAssets, newAsset]);
    } catch (err) {
      setError("Failed to create brand asset");
    } finally {
      setIsLoading(false);
    }
  };

  const updateBrandAsset = async (id: string, asset: Partial<BrandAsset>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/brand-assets/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(asset),
      });
      const updatedAsset = await response.json();
      setBrandAssets(brandAssets.map((a) => (a.id === id ? updatedAsset : a)));
    } catch (err) {
      setError("Failed to update brand asset");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBrandAsset = async (id: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/brand-assets/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      setBrandAssets(brandAssets.filter((a) => a.id !== id));
      if (selectedAsset?.id === id) setSelectedAsset(null);
    } catch (err) {
      setError("Failed to delete brand asset");
    } finally {
      setIsLoading(false);
    }
  };

  const selectAsset = (asset: BrandAsset | null) => {
    setSelectedAsset(asset);
  };

  return (
    <BrandContext.Provider
      value={{
        brandAssets,
        selectedAsset,
        isLoading,
        error,
        createBrandAsset,
        updateBrandAsset,
        deleteBrandAsset,
        selectAsset,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
};
