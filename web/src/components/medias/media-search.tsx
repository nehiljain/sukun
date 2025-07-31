import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Settings, Brain, Zap } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MediaSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Semantic search options
  useSemanticSearch?: boolean;
  onSemanticSearchChange?: (enabled: boolean) => void;
  similarityThreshold?: number;
  onSimilarityThresholdChange?: (threshold: number) => void;
  maxResults?: number;
  onMaxResultsChange?: (maxResults: number) => void;
  // Search metadata for feedback
  searchMetadata?: {
    semantic_search_used: boolean;
    similarity_threshold: number | null;
    query: string;
  } | null;
}

export const MediaSearch = ({
  value,
  onChange,
  placeholder = "Search media...",
  useSemanticSearch = true,
  onSemanticSearchChange,
  similarityThreshold = 0.7,
  onSimilarityThresholdChange,
  maxResults = 50,
  onMaxResultsChange,
  searchMetadata,
}: MediaSearchProps) => {
  const showSemanticControls = onSemanticSearchChange !== undefined;

  return (
    <div className="space-y-2">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9 text-muted-foreground"
          />
        </div>

        {showSemanticControls && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Search Settings
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Search Type</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="semantic-search"
                      checked={useSemanticSearch}
                      onCheckedChange={onSemanticSearchChange}
                    />
                    <Label
                      htmlFor="semantic-search"
                      className="flex items-center gap-2"
                    >
                      <Brain className="h-4 w-4" />
                      Semantic Search
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI-powered search that understands meaning and context
                  </p>
                </div>

                {useSemanticSearch && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Similarity Threshold: {similarityThreshold.toFixed(2)}
                      </Label>
                      <Slider
                        value={[similarityThreshold]}
                        onValueChange={(value) =>
                          onSimilarityThresholdChange?.(value[0])
                        }
                        max={1}
                        min={0.1}
                        step={0.05}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Broad (0.1)</span>
                        <span>Precise (1.0)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Max Results</Label>
                      <Select
                        value={maxResults.toString()}
                        onValueChange={(value) =>
                          onMaxResultsChange?.(parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 results</SelectItem>
                          <SelectItem value="25">25 results</SelectItem>
                          <SelectItem value="50">50 results</SelectItem>
                          <SelectItem value="100">100 results</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Search feedback */}
      {searchMetadata && value && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {searchMetadata.semantic_search_used ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Semantic Search
              {searchMetadata.similarity_threshold && (
                <span>
                  ({(searchMetadata.similarity_threshold * 100).toFixed(0)}%)
                </span>
              )}
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Text Search
            </Badge>
          )}
          <span>for "{searchMetadata.query}"</span>
        </div>
      )}
    </div>
  );
};
