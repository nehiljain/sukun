import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { PlusCircle, Trash2 } from "lucide-react";

type ZoomConfig = {
  startFrame: number;
  endFrame: number;
  startX: number;
  startY: number;
  startScale: number;
  holdX: number;
  holdY: number;
  holdScale: number;
  endX: number;
  endY: number;
  endScale: number;
  easingConfig: {
    p1x: number;
    p1y: number;
    p2x: number;
    p2y: number;
  };
};

interface ZoomConfigEditorProps {
  value: ZoomConfig[];
  onChange: (newValue: ZoomConfig[]) => void;
  containerWidth: number;
  containerHeight: number;
}

export const ZoomConfigEditor: React.FC<ZoomConfigEditorProps> = ({
  value,
  onChange,
  containerWidth,
  containerHeight,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddConfig = () => {
    const defaultConfig: ZoomConfig = {
      startFrame: 30,
      endFrame: 90,
      startX: containerWidth / 2,
      startY: containerHeight / 2,
      startScale: 1,
      holdX: containerWidth / 2,
      holdY: containerHeight / 2,
      holdScale: 1.5,
      endX: containerWidth / 2,
      endY: containerHeight / 2,
      endScale: 1,
      easingConfig: {
        p1x: 0.42,
        p1y: 0,
        p2x: 0.58,
        p2y: 1,
      },
    };

    onChange([...value, defaultConfig]);

    // Expand the newly added config
    setExpandedId(`zoom-${value.length}`);
  };

  const handleUpdateConfig = (
    index: number,
    field: keyof ZoomConfig,
    newValue: any,
  ) => {
    const updatedConfigs = [...value];

    if (field === "easingConfig") {
      updatedConfigs[index].easingConfig = {
        ...updatedConfigs[index].easingConfig,
        ...newValue,
      };
    } else {
      updatedConfigs[index][field] = newValue;
    }

    onChange(updatedConfigs);
  };

  const handleDeleteConfig = (index: number) => {
    const updatedConfigs = value.filter((_, i) => i !== index);
    onChange(updatedConfigs);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-foreground">
          Zoom Configurations
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddConfig}
          className="flex items-center gap-1"
          aria-label="Add zoom configuration"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add</span>
        </Button>
      </div>

      {value.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
          No zoom configurations added yet. Click "Add" to create one.
        </div>
      )}

      <Accordion
        type="single"
        value={expandedId || ""}
        onValueChange={setExpandedId}
        className="space-y-2"
      >
        {value.map((config, index) => (
          <AccordionItem
            key={index}
            value={`zoom-${index}`}
            className="border rounded-md overflow-hidden bg-card"
          >
            <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/50">
              <div className="flex justify-between items-center w-full">
                <span className="text-sm text-card-foreground">
                  Zoom {index + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  Frames: {config.startFrame} → {config.endFrame}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-primary px-3 py-2 space-y-4 bg-card">
              {/* Frame Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1 text-card-foreground">
                    Start Frame
                  </label>
                  <Input
                    type="number"
                    value={config.startFrame}
                    onChange={(e) =>
                      handleUpdateConfig(
                        index,
                        "startFrame",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    min={0}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1 text-card-foreground">
                    End Frame
                  </label>
                  <Input
                    type="number"
                    value={config.endFrame}
                    onChange={(e) =>
                      handleUpdateConfig(
                        index,
                        "endFrame",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    min={0}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Start Position */}
              <div>
                <h4 className="text-xs font-medium mb-2 text-card-foreground">
                  Start Position
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      X
                    </label>
                    <Input
                      type="number"
                      value={config.startX}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "startX",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      Y
                    </label>
                    <Input
                      type="number"
                      value={config.startY}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "startY",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      Scale
                    </label>
                    <Input
                      type="number"
                      value={config.startScale}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "startScale",
                          parseFloat(e.target.value) || 1,
                        )
                      }
                      step={0.1}
                      min={0.1}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Hold Position */}
              <div>
                <h4 className="text-xs font-medium mb-2 text-card-foreground">
                  Hold Position
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      X
                    </label>
                    <Input
                      type="number"
                      value={config.holdX}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "holdX",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      Y
                    </label>
                    <Input
                      type="number"
                      value={config.holdY}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "holdY",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      Scale
                    </label>
                    <Input
                      type="number"
                      value={config.holdScale}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "holdScale",
                          parseFloat(e.target.value) || 1,
                        )
                      }
                      step={0.1}
                      min={0.1}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* End Position */}
              <div>
                <h4 className="text-xs font-medium mb-2 text-card-foreground">
                  End Position
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      X
                    </label>
                    <Input
                      type="number"
                      value={config.endX}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "endX",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      Y
                    </label>
                    <Input
                      type="number"
                      value={config.endY}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "endY",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      Scale
                    </label>
                    <Input
                      type="number"
                      value={config.endScale}
                      onChange={(e) =>
                        handleUpdateConfig(
                          index,
                          "endScale",
                          parseFloat(e.target.value) || 1,
                        )
                      }
                      step={0.1}
                      min={0.1}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Easing Configuration */}
              <div>
                <h4 className="text-xs font-medium mb-2 text-card-foreground">
                  Easing Configuration
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      P1X ({config.easingConfig.p1x.toFixed(2)})
                    </label>
                    <Slider
                      value={[config.easingConfig.p1x]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(value) =>
                        handleUpdateConfig(index, "easingConfig", {
                          p1x: value[0],
                        })
                      }
                      className="accent-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      P1Y ({config.easingConfig.p1y.toFixed(2)})
                    </label>
                    <Slider
                      value={[config.easingConfig.p1y]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(value) =>
                        handleUpdateConfig(index, "easingConfig", {
                          p1y: value[0],
                        })
                      }
                      className="accent-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      P2X ({config.easingConfig.p2x.toFixed(2)})
                    </label>
                    <Slider
                      value={[config.easingConfig.p2x]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(value) =>
                        handleUpdateConfig(index, "easingConfig", {
                          p2x: value[0],
                        })
                      }
                      className="accent-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1 text-card-foreground">
                      P2Y ({config.easingConfig.p2y.toFixed(2)})
                    </label>
                    <Slider
                      value={[config.easingConfig.p2y]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(value) =>
                        handleUpdateConfig(index, "easingConfig", {
                          p2y: value[0],
                        })
                      }
                      className="accent-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Delete button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteConfig(index)}
                className="w-full mt-2"
                aria-label="Delete zoom configuration"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete this zoom
              </Button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
