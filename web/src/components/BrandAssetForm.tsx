import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandAsset } from "@/types/brand";
import {
  useCreateBrandAsset,
  useUpdateBrandAsset,
} from "@/hooks/use-brand-assets";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChromePicker } from "react-color";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface BrandAssetFormProps {
  asset?: BrandAsset | null;
  onClose: () => void;
}

export function BrandAssetForm({ asset, onClose }: BrandAssetFormProps) {
  const [formData, setFormData] = useState({
    name: asset?.name || "",
    colors: asset?.colors || ["#FFFFFF"],
    logo: asset?.logo || { url: "", darkVersion: "" },
    font: asset?.font || {
      family: "",
      size: "",
    },
    voiceover: asset?.voiceover || {
      voice: "",
      language: "",
    },
    cover: asset?.cover || { url: "", type: "image" },
    introVideo: asset?.introVideo || { url: "", duration: 0 },
    outroVideo: asset?.outroVideo || { url: "", duration: 0 },
  });

  const [openColorPicker, setOpenColorPicker] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = useCreateBrandAsset();
  const updateMutation = useUpdateBrandAsset();

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || "",
        colors: asset.colors || ["#FFFFFF"],
        logo: asset.logo || { url: "", darkVersion: "" },
        font: asset.font || {
          family: "",
          size: "",
        },
        voiceover: asset.voiceover || {
          voice: "",
          language: "",
        },
        cover: asset.cover || { url: "", type: "image" },
        introVideo: asset.introVideo || { url: "", duration: 0 },
        outroVideo: asset.outroVideo || { url: "", duration: 0 },
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (asset) {
      await updateMutation.mutateAsync({ id: asset.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    toast.success("Brand asset created successfully");
    onClose();
  };

  return (
    <Card className="w-full">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Colors</label>
            <div className="flex gap-2 flex-wrap items-center">
              {formData.colors.map((color, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1 relative"
                >
                  <div
                    className="w-10 h-10 rounded cursor-pointer border"
                    style={{ backgroundColor: color }}
                    onClick={() => setOpenColorPicker(index)}
                  />
                  {openColorPicker === index && (
                    <div className="absolute z-10 top-12">
                      <div
                        className="fixed inset-0"
                        onClick={() => setOpenColorPicker(null)}
                      />
                      <ChromePicker
                        color={color}
                        onChange={(color) => {
                          const newColors = [...formData.colors];
                          newColors[index] = color.hex;
                          setFormData({ ...formData, colors: newColors });
                        }}
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => {
                      const newColors = formData.colors.filter(
                        (_, i) => i !== index,
                      );
                      setFormData({
                        ...formData,
                        colors: newColors.length ? newColors : ["#000000"],
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData({
                    ...formData,
                    colors: [...formData.colors, "#000000"],
                  })
                }
              >
                Add Color
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Logo</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Logo URL
                </label>
                <Input
                  value={formData.logo.url}
                  placeholder="https://example.com/logo.png"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      logo: { ...formData.logo, url: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Dark Version URL
                </label>
                <Input
                  value={formData.logo.darkVersion}
                  placeholder="https://example.com/logo-dark.png"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      logo: { ...formData.logo, darkVersion: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Font Settings</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Font Family
                </label>
                <Select
                  value={formData.font.family}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      font: { ...formData.font, family: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Times New Roman">
                      Times New Roman
                    </SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Open Sans">Open Sans</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground flex items-center gap-2 w-full justify-start px-0"
              aria-expanded={showAdvanced}
              aria-controls="advanced-options"
            >
              {showAdvanced ? <ChevronDown /> : <ChevronRight />} Advanced
              Options
            </Button>

            {showAdvanced && (
              <div id="advanced-options" className="mt-4 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Voiceover Settings
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Voice
                      </label>
                      <Select
                        value={formData.voiceover.voice}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            voiceover: { ...formData.voiceover, voice: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male1">Male 1</SelectItem>
                          <SelectItem value="male2">Male 2</SelectItem>
                          <SelectItem value="female1">Female 1</SelectItem>
                          <SelectItem value="female2">Female 2</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Language
                      </label>
                      <Select
                        value={formData.voiceover.language}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            voiceover: {
                              ...formData.voiceover,
                              language: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="en-GB">English (UK)</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="it">Italian</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Cover</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Cover URL
                      </label>
                      <Input
                        value={formData.cover.url}
                        placeholder="https://example.com/cover.jpg"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cover: { ...formData.cover, url: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Cover Type
                      </label>
                      <Select
                        value={formData.cover.type}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            cover: { ...formData.cover, type: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Intro Video URL
                  </label>
                  <Input
                    value={formData.introVideo.url}
                    placeholder="https://example.com/intro.mp4"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        introVideo: {
                          ...formData.introVideo,
                          url: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Outro Video URL
                  </label>
                  <Input
                    value={formData.outroVideo.url}
                    placeholder="https://example.com/outro.mp4"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        outroVideo: {
                          ...formData.outroVideo,
                          url: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="submit" variant="primary">
              {asset ? "Update" : "Create"} Brand Asset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
