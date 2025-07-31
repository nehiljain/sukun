import React, { useState } from "react";
import { ClipOverlay, VideoEffectType, ZoomConfig } from "../../../types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";

/**
 * Props for the VideoZoomPanel component
 */
interface VideoZoomPanelProps {
  /** The current state of the video overlay */
  localOverlay: ClipOverlay;
  /** Callback function to update the video overlay state */
  setLocalOverlay: (overlay: ClipOverlay) => void;
}

/**
 * VideoZoomPanel component for configuring zoom reveal effects on video overlays
 * 
 * This component provides UI controls for:
 * - Enabling/disabling the zoom reveal effect
 * - Showing/hiding the zoom indicator (for debugging)
 * - Adding/removing zoom configurations
 * - Configuring zoom parameters (start/end frames, positions, scales, etc.)
 * - Visual editor for setting zoom points directly on the video
 * 
 * @param props.localOverlay - Current video overlay state
 * @param props.setLocalOverlay - Function to update overlay state
 */
export const VideoZoomPanel: React.FC<VideoZoomPanelProps> = ({
  localOverlay,
  setLocalOverlay,
}) => {
  // Get current zoom configs or initialize empty array
  const zoomConfigs = localOverlay.videoEffect?.config?.zoomConfigs || [];
  const showZoomIndicator = localOverlay.videoEffect?.config?.showZoomIndicator || false;
  
  // State to track which zoom config is being edited in the visual editor
  const [activeConfigIndex, setActiveConfigIndex] = useState<number>(0);
  const [activePoint, setActivePoint] = useState<'start' | 'hold' | 'end'>('hold');

  // Toggle zoom effect on/off
  const toggleZoomEffect = () => {
    if (localOverlay.videoEffect?.type === VideoEffectType.ZOOM_REVEAL) {
      // Turn off zoom effect
      setLocalOverlay({
        ...localOverlay,
        videoEffect: {
          type: VideoEffectType.NONE,
          config: null,
        },
      });
    } else {
      // Turn on zoom effect with default config
      setLocalOverlay({
        ...localOverlay,
        videoEffect: {
          type: VideoEffectType.ZOOM_REVEAL,
          config: {
            zoomConfigs: [
              {
                startFrame: 0,
                endFrame: 90, // 1.5 seconds at 60fps
                startX: localOverlay.width / 2,
                startY: localOverlay.height / 2,
                startScale: 1,
                holdX: localOverlay.width / 2,
                holdY: localOverlay.height / 2,
                holdScale: 1.5,
                endX: localOverlay.width / 2,
                endY: localOverlay.height / 2,
                endScale: 1,
                easingConfig: {
                  p1x: 0.42,
                  p1y: 0,
                  p2x: 0.58,
                  p2y: 1,
                },
              },
            ],
            showZoomIndicator: false,
          },
        },
      });
      setActiveConfigIndex(0);
    }
  };

  // Toggle zoom indicator visibility
  const toggleZoomIndicator = () => {
    if (!localOverlay.videoEffect?.config) return;
    
    setLocalOverlay({
      ...localOverlay,
      videoEffect: {
        ...localOverlay.videoEffect,
        config: {
          ...localOverlay.videoEffect.config,
          showZoomIndicator: !showZoomIndicator,
        },
      },
    });
  };

  // Add a new zoom config
  const addZoomConfig = () => {
    if (!localOverlay.videoEffect?.config) return;
    
    const lastConfig = zoomConfigs[zoomConfigs.length - 1];
    const newConfig: ZoomConfig = {
      startFrame: lastConfig ? lastConfig.endFrame + 1 : 0,
      endFrame: lastConfig ? lastConfig.endFrame + 91 : 90, // Add 1.5 seconds
      startX: localOverlay.width / 2,
      startY: localOverlay.height / 2,
      startScale: 1,
      holdX: localOverlay.width / 2,
      holdY: localOverlay.height / 2,
      holdScale: 1.5,
      endX: localOverlay.width / 2,
      endY: localOverlay.height / 2,
      endScale: 1,
      easingConfig: {
        p1x: 0.42,
        p1y: 0,
        p2x: 0.58,
        p2y: 1,
      },
    };
    
    setLocalOverlay({
      ...localOverlay,
      videoEffect: {
        ...localOverlay.videoEffect,
        config: {
          ...localOverlay.videoEffect.config,
          zoomConfigs: [...zoomConfigs, newConfig],
        },
      },
    });
    
    // Set the new config as active
    setActiveConfigIndex(zoomConfigs.length);
  };

  // Update a specific zoom config
  const updateZoomConfig = (index: number, updates: Partial<ZoomConfig>) => {
    if (!localOverlay.videoEffect?.config) return;
    
    const updatedConfigs = [...zoomConfigs];
    updatedConfigs[index] = { ...updatedConfigs[index], ...updates };
    
    setLocalOverlay({
      ...localOverlay,
      videoEffect: {
        ...localOverlay.videoEffect,
        config: {
          ...localOverlay.videoEffect.config,
          zoomConfigs: updatedConfigs,
        },
      },
    });
  };

  // Remove a zoom config
  const removeZoomConfig = (index: number) => {
    if (!localOverlay.videoEffect?.config) return;
    
    const updatedConfigs = zoomConfigs.filter((_, i) => i !== index);
    
    setLocalOverlay({
      ...localOverlay,
      videoEffect: {
        ...localOverlay.videoEffect,
        config: {
          ...localOverlay.videoEffect.config,
          zoomConfigs: updatedConfigs,
        },
      },
    });
    
    // Update active index if needed
    if (activeConfigIndex >= updatedConfigs.length) {
      setActiveConfigIndex(Math.max(0, updatedConfigs.length - 1));
    }
  };

  // Handle point drag in the visual editor
  const handlePointDrag = (e: React.MouseEvent<HTMLDivElement>, point: 'start' | 'hold' | 'end') => {
    if (!localOverlay.videoEffect?.config || zoomConfigs.length === 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(localOverlay.width, Math.round(
      (e.clientX - rect.left) * (localOverlay.width / rect.width)
    )));
    const y = Math.max(0, Math.min(localOverlay.height, Math.round(
      (e.clientY - rect.top) * (localOverlay.height / rect.height)
    )));
    
    const updates: Partial<ZoomConfig> = {};
    
    if (point === 'start') {
      updates.startX = x;
      updates.startY = y;
    } else if (point === 'hold') {
      updates.holdX = x;
      updates.holdY = y;
    } else {
      updates.endX = x;
      updates.endY = y;
    }
    
    updateZoomConfig(activeConfigIndex, updates);
  };

  // Get the active zoom config
  const activeConfig = zoomConfigs[activeConfigIndex] || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="enable-zoom">Enable Zoom Reveal Effect</Label>
        <Switch
          id="enable-zoom"
          checked={localOverlay.videoEffect?.type === VideoEffectType.ZOOM_REVEAL}
          onCheckedChange={toggleZoomEffect}
        />
      </div>
      
      {localOverlay.videoEffect?.type === VideoEffectType.ZOOM_REVEAL && (
        <>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-indicator">Show Zoom Indicator (Debug)</Label>
            <Switch
              id="show-indicator"
              checked={showZoomIndicator}
              onCheckedChange={toggleZoomIndicator}
            />
          </div>
          
          {/* Visual Zoom Editor */}
          {activeConfig && (
            <div className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Zoom Visual Editor</h3>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={activePoint === 'start' ? 'default' : 'outline'}
                    onClick={() => setActivePoint('start')}
                    className="h-7 text-xs px-2"
                  >
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant={activePoint === 'hold' ? 'default' : 'outline'}
                    onClick={() => setActivePoint('hold')}
                    className="h-7 text-xs px-2"
                  >
                    Hold
                  </Button>
                  <Button
                    size="sm"
                    variant={activePoint === 'end' ? 'default' : 'outline'}
                    onClick={() => setActivePoint('end')}
                    className="h-7 text-xs px-2"
                  >
                    End
                  </Button>
                </div>
              </div>
              
              <div 
                className="relative aspect-video w-full overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100/40 dark:bg-gray-800/40"
                style={{
                  backgroundImage: `url(${localOverlay.content})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onClick={(e) => handlePointDrag(e, activePoint)}
              >
                {/* Start point (green) */}
                <div
                  className="absolute w-6 h-6 rounded-full bg-green-500/50 border-2 border-green-500 cursor-move flex items-center justify-center"
                  style={{
                    left: `${(activeConfig.startX / localOverlay.width) * 100}%`,
                    top: `${(activeConfig.startY / localOverlay.height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: activePoint === 'start' ? 3 : 1,
                  }}
                  onMouseDown={() => setActivePoint('start')}
                >
                  <div className="text-[8px] font-bold text-white">S</div>
                </div>
                
                {/* Hold point (blue) */}
                <div
                  className="absolute w-6 h-6 rounded-full bg-blue-500/50 border-2 border-blue-500 cursor-move flex items-center justify-center"
                  style={{
                    left: `${(activeConfig.holdX / localOverlay.width) * 100}%`,
                    top: `${(activeConfig.holdY / localOverlay.height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: activePoint === 'hold' ? 3 : 1,
                  }}
                  onMouseDown={() => setActivePoint('hold')}
                >
                  <div className="text-[8px] font-bold text-white">H</div>
                </div>
                
                {/* End point (red) */}
                <div
                  className="absolute w-6 h-6 rounded-full bg-red-500/50 border-2 border-red-500 cursor-move flex items-center justify-center"
                  style={{
                    left: `${(activeConfig.endX / localOverlay.width) * 100}%`,
                    top: `${(activeConfig.endY / localOverlay.height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: activePoint === 'end' ? 3 : 1,
                  }}
                  onMouseDown={() => setActivePoint('end')}
                >
                  <div className="text-[8px] font-bold text-white">E</div>
                </div>
                
                {/* Path lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 0 }}
                >
                  <path
                    d={`M${(activeConfig.startX / localOverlay.width) * 100}% ${(activeConfig.startY / localOverlay.height) * 100}% 
                        L${(activeConfig.holdX / localOverlay.width) * 100}% ${(activeConfig.holdY / localOverlay.height) * 100}% 
                        L${(activeConfig.endX / localOverlay.width) * 100}% ${(activeConfig.endY / localOverlay.height) * 100}%`}
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    fill="none"
                  />
                </svg>
              </div>
              
              {/* Zoom Level Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Start Zoom: {activeConfig.startScale.toFixed(1)}x</Label>
                    <ZoomOut className="w-3 h-3 text-gray-500" />
                  </div>
                  <Slider
                    value={[activeConfig.startScale * 10]}
                    min={5}
                    max={30}
                    step={1}
                    onValueChange={(value) => updateZoomConfig(activeConfigIndex, { startScale: value[0] / 10 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Hold Zoom: {activeConfig.holdScale.toFixed(1)}x</Label>
                    <ZoomIn className="w-3 h-3 text-gray-500" />
                  </div>
                  <Slider
                    value={[activeConfig.holdScale * 10]}
                    min={5}
                    max={30}
                    step={1}
                    onValueChange={(value) => updateZoomConfig(activeConfigIndex, { holdScale: value[0] / 10 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">End Zoom: {activeConfig.endScale.toFixed(1)}x</Label>
                    <ZoomOut className="w-3 h-3 text-gray-500" />
                  </div>
                  <Slider
                    value={[activeConfig.endScale * 10]}
                    min={5}
                    max={30}
                    step={1}
                    onValueChange={(value) => updateZoomConfig(activeConfigIndex, { endScale: value[0] / 10 })}
                  />
                </div>
              </div>
              
              {/* Timing Controls */}
              <div className="space-y-2">
                <Label className="text-xs">Timing</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`start-frame-${activeConfigIndex}`} className="text-xs">Start Frame</Label>
                    <Input
                      id={`start-frame-${activeConfigIndex}`}
                      type="number"
                      value={activeConfig.startFrame}
                      onChange={(e) => updateZoomConfig(activeConfigIndex, { startFrame: parseInt(e.target.value) })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`end-frame-${activeConfigIndex}`} className="text-xs">End Frame</Label>
                    <Input
                      id={`end-frame-${activeConfigIndex}`}
                      type="number"
                      value={activeConfig.endFrame}
                      onChange={(e) => updateZoomConfig(activeConfigIndex, { endFrame: parseInt(e.target.value) })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Zoom Configurations List */}
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Zoom Configurations</h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={addZoomConfig}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            
            <div className="space-y-2">
              {zoomConfigs.map((config, index) => (
                <div 
                  key={index} 
                  className={`p-2 border rounded-md flex justify-between items-center cursor-pointer ${
                    index === activeConfigIndex ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setActiveConfigIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${index === activeConfigIndex ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs font-medium">Zoom {index + 1}</span>
                    <span className="text-xs text-gray-500">
                      ({config.startFrame} - {config.endFrame})
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeZoomConfig(index);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Advanced Settings (Collapsible) */}
          {activeConfig && (
            <div className="mt-4">
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">Advanced Settings</summary>
                <div className="mt-2 p-3 border rounded-md space-y-3">
                  <div className="grid grid-cols-4 gap-1">
                    <div>
                      <Label htmlFor={`p1x-${activeConfigIndex}`} className="text-xs">P1 X</Label>
                      <Input
                        id={`p1x-${activeConfigIndex}`}
                        type="number"
                        step="0.01"
                        value={activeConfig.easingConfig.p1x}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { 
                          easingConfig: { 
                            ...activeConfig.easingConfig, 
                            p1x: parseFloat(e.target.value) 
                          } 
                        })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`p1y-${activeConfigIndex}`} className="text-xs">P1 Y</Label>
                      <Input
                        id={`p1y-${activeConfigIndex}`}
                        type="number"
                        step="0.01"
                        value={activeConfig.easingConfig.p1y}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { 
                          easingConfig: { 
                            ...activeConfig.easingConfig, 
                            p1y: parseFloat(e.target.value) 
                          } 
                        })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`p2x-${activeConfigIndex}`} className="text-xs">P2 X</Label>
                      <Input
                        id={`p2x-${activeConfigIndex}`}
                        type="number"
                        step="0.01"
                        value={activeConfig.easingConfig.p2x}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { 
                          easingConfig: { 
                            ...activeConfig.easingConfig, 
                            p2x: parseFloat(e.target.value) 
                          } 
                        })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`p2y-${activeConfigIndex}`} className="text-xs">P2 Y</Label>
                      <Input
                        id={`p2y-${activeConfigIndex}`}
                        type="number"
                        step="0.01"
                        value={activeConfig.easingConfig.p2y}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { 
                          easingConfig: { 
                            ...activeConfig.easingConfig, 
                            p2y: parseFloat(e.target.value) 
                          } 
                        })}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`start-x-${activeConfigIndex}`} className="text-xs">Start X</Label>
                      <Input
                        id={`start-x-${activeConfigIndex}`}
                        type="number"
                        value={activeConfig.startX}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { startX: parseInt(e.target.value) })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`start-y-${activeConfigIndex}`} className="text-xs">Start Y</Label>
                      <Input
                        id={`start-y-${activeConfigIndex}`}
                        type="number"
                        value={activeConfig.startY}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { startY: parseInt(e.target.value) })}
                        className="h-7 text-xs"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`hold-x-${activeConfigIndex}`} className="text-xs">Hold X</Label>
                      <Input
                        id={`hold-x-${activeConfigIndex}`}
                        type="number"
                        value={activeConfig.holdX}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { holdX: parseInt(e.target.value) })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`hold-y-${activeConfigIndex}`} className="text-xs">Hold Y</Label>
                      <Input
                        id={`hold-y-${activeConfigIndex}`}
                        type="number"
                        value={activeConfig.holdY}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { holdY: parseInt(e.target.value) })}
                        className="h-7 text-xs"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`end-x-${activeConfigIndex}`} className="text-xs">End X</Label>
                      <Input
                        id={`end-x-${activeConfigIndex}`}
                        type="number"
                        value={activeConfig.endX}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { endX: parseInt(e.target.value) })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`end-y-${activeConfigIndex}`} className="text-xs">End Y</Label>
                      <Input
                        id={`end-y-${activeConfigIndex}`}
                        type="number"
                        value={activeConfig.endY}
                        onChange={(e) => updateZoomConfig(activeConfigIndex, { endY: parseInt(e.target.value) })}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 