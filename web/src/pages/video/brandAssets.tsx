import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RightTray } from "@/components/shared/RightTray";
import { BrandAssetForm } from "@/components/BrandAssetForm";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import Loader from "@/components/shared/loader";
import { BrandAsset } from "@/types/brand";

export default function BrandAssetsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const { data: assets, isLoading, error } = useBrandAssets();

  const handleCreate = () => {
    setSelectedAsset(null);
    setIsOpen(true);
  };

  const handleEdit = (asset: BrandAsset) => {
    setSelectedAsset(asset);
    setIsOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative flex">
      <div className="flex-1 container mx-auto py-10">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Brand Assets</CardTitle>
              <CardDescription>
                Manage your brand assets and styling
              </CardDescription>
            </div>
            <Button variant="primary" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Brand Asset
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader />
              </div>
            ) : error ? (
              <div>Error loading brand assets</div>
            ) : (
              <DataTable
                columns={[
                  {
                    accessorKey: "name",
                    header: "Name",
                  },
                  {
                    accessorKey: "colors",
                    header: "Colors",
                    cell: ({ row }) => (
                      <div className="flex gap-2">
                        {row.original.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    ),
                  },
                  {
                    accessorKey: "font.family",
                    header: "Font Family",
                  },
                  {
                    accessorKey: "voiceover.language",
                    header: "Language",
                  },
                  {
                    accessorKey: "created_at",
                    header: "Created At",
                    cell: ({ row }) => formatDate(row.original.created_at),
                  },
                  {
                    id: "actions",
                    cell: ({ row }) => (
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(row.original)}
                      >
                        Edit
                      </Button>
                    ),
                  },
                ]}
                data={assets || []}
                sortableColumns={["name", "created_at"]}
                filterableColumns={["name"]}
                initialSorting={[{ id: "created_at", desc: true }]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <RightTray
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          selectedAsset ? `Edit ${selectedAsset.name}` : "Create Brand Asset"
        }
        subtitle={"Manage your brand asset details"}
        // actions={[
        //   {
        //     label: "Create",
        //     onClick: handleCreate,
        //     variant: "primary",
        //   },
        // ]}
      >
        <BrandAssetForm
          asset={selectedAsset}
          onClose={() => setIsOpen(false)}
        />
      </RightTray>
    </div>
  );
}
