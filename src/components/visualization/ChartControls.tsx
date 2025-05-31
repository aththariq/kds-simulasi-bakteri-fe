"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Settings,
  Eye,
  EyeOff,
  PlayCircle,
  PauseCircle,
  StepForward,
} from "lucide-react";

// Chart view modes for different data perspectives
export type ChartViewMode =
  | "absolute"
  | "percentage"
  | "logarithmic"
  | "normalized"
  | "rate-of-change";

// Time range selection options
export interface TimeRange {
  start: number;
  end: number;
  label: string;
}

// Data series visibility configuration
export interface SeriesVisibility {
  [key: string]: boolean;
}

// Chart controls configuration
export interface ChartControlsConfig {
  // View mode controls
  allowViewModeToggle?: boolean;
  availableViewModes?: ChartViewMode[];
  defaultViewMode?: ChartViewMode;

  // Zoom controls
  allowZoom?: boolean;
  zoomStep?: number;
  maxZoom?: number;
  minZoom?: number;

  // Time range controls
  allowTimeRangeSelection?: boolean;
  timeRanges?: TimeRange[];
  customTimeRange?: boolean;

  // Data series controls
  allowSeriesToggle?: boolean;
  seriesLabels?: Record<string, string>;

  // Playback controls (for animated charts)
  allowPlayback?: boolean;
  playbackSpeed?: number;

  // Export controls
  allowExport?: boolean;
  exportFormats?: Array<"png" | "svg" | "csv" | "json">;

  // Live updates
  allowLiveUpdates?: boolean;
  updateInterval?: number;
}

// Chart controls props
export interface ChartControlsProps {
  config?: ChartControlsConfig;
  currentViewMode?: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  currentTimeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  currentZoom?: number;
  onZoomChange?: (zoom: number) => void;
  seriesVisibility?: SeriesVisibility;
  onSeriesVisibilityChange?: (visibility: SeriesVisibility) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onStep?: () => void;
  onReset?: () => void;
  onExport?: (format: string) => void;
  isLiveUpdates?: boolean;
  onLiveUpdatesToggle?: () => void;
  className?: string;
}

// Default configuration
const defaultConfig: ChartControlsConfig = {
  allowViewModeToggle: true,
  availableViewModes: ["absolute", "percentage", "logarithmic", "normalized"],
  defaultViewMode: "absolute",
  allowZoom: true,
  zoomStep: 0.1,
  maxZoom: 5,
  minZoom: 0.1,
  allowTimeRangeSelection: true,
  customTimeRange: true,
  allowSeriesToggle: true,
  allowPlayback: false,
  allowExport: true,
  exportFormats: ["png", "svg", "csv"],
  allowLiveUpdates: true,
  updateInterval: 1000,
};

// Predefined time ranges
const defaultTimeRanges: TimeRange[] = [
  { start: 0, end: 100, label: "First 100 Generations" },
  { start: 0, end: 500, label: "First 500 Generations" },
  { start: 0, end: 1000, label: "First 1000 Generations" },
  { start: -100, end: 0, label: "Last 100 Generations" },
  { start: -500, end: 0, label: "Last 500 Generations" },
];

// View mode descriptions
const viewModeDescriptions: Record<ChartViewMode, string> = {
  absolute: "Show raw values",
  percentage: "Show as percentages",
  logarithmic: "Logarithmic scale",
  normalized: "Normalized values (0-1)",
  "rate-of-change": "Rate of change over time",
};

// Chart Controls Component
export const ChartControls: React.FC<ChartControlsProps> = ({
  config = {},
  currentViewMode = "absolute",
  onViewModeChange,
  currentTimeRange,
  onTimeRangeChange,
  currentZoom = 1,
  onZoomChange,
  seriesVisibility = {},
  onSeriesVisibilityChange,
  isPlaying = false,
  onPlayPause,
  onStep,
  onReset,
  onExport,
  isLiveUpdates = false,
  onLiveUpdatesToggle,
  className = "",
}) => {
  const mergedConfig = { ...defaultConfig, ...config };
  const timeRanges = mergedConfig.timeRanges || defaultTimeRanges;

  // Handle zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(
      currentZoom + mergedConfig.zoomStep!,
      mergedConfig.maxZoom!
    );
    onZoomChange?.(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(
      currentZoom - mergedConfig.zoomStep!,
      mergedConfig.minZoom!
    );
    onZoomChange?.(newZoom);
  };

  const handleZoomReset = () => {
    onZoomChange?.(1);
  };

  // Handle series visibility toggle
  const handleSeriesToggle = (seriesKey: string) => {
    const newVisibility = {
      ...seriesVisibility,
      [seriesKey]: !seriesVisibility[seriesKey],
    };
    onSeriesVisibilityChange?.(newVisibility);
  };

  return (
    <Card className={`chart-controls ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Chart Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Mode Controls */}
        {mergedConfig.allowViewModeToggle && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              View Mode
            </label>
            <Select value={currentViewMode} onValueChange={onViewModeChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mergedConfig.availableViewModes?.map(mode => (
                  <SelectItem key={mode} value={mode}>
                    <div className="flex flex-col">
                      <span className="capitalize">
                        {mode.replace("-", " ")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {viewModeDescriptions[mode]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Time Range Controls */}
        {mergedConfig.allowTimeRangeSelection && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Time Range
            </label>
            <Select
              value={currentTimeRange?.label || ""}
              onValueChange={label => {
                const range = timeRanges.find(r => r.label === label);
                if (range) onTimeRangeChange?.(range);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map(range => (
                  <SelectItem key={range.label} value={range.label}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Zoom Controls */}
        {mergedConfig.allowZoom && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Zoom Level ({(currentZoom * 100).toFixed(0)}%)
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                disabled={currentZoom <= mergedConfig.minZoom!}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Slider
                value={[currentZoom]}
                onValueChange={([value]) => onZoomChange?.(value)}
                min={mergedConfig.minZoom}
                max={mergedConfig.maxZoom}
                step={mergedConfig.zoomStep}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                disabled={currentZoom >= mergedConfig.maxZoom!}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomReset}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Data Series Visibility */}
        {mergedConfig.allowSeriesToggle &&
          Object.keys(seriesVisibility).length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Data Series
              </label>
              <div className="space-y-1">
                {Object.entries(seriesVisibility).map(([key, visible]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs">
                      {mergedConfig.seriesLabels?.[key] || key}
                    </span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={visible}
                        onCheckedChange={() => handleSeriesToggle(key)}
                      />
                      {visible ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Playback Controls */}
        {mergedConfig.allowPlayback && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Playback
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onPlayPause}
                className="h-8"
              >
                {isPlaying ? (
                  <PauseCircle className="h-3 w-3 mr-1" />
                ) : (
                  <PlayCircle className="h-3 w-3 mr-1" />
                )}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onStep}
                className="h-8"
              >
                <StepForward className="h-3 w-3 mr-1" />
                Step
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReset}
                className="h-8"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Live Updates Toggle */}
        {mergedConfig.allowLiveUpdates && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">
              Live Updates
            </label>
            <div className="flex items-center gap-2">
              <Switch
                checked={isLiveUpdates}
                onCheckedChange={onLiveUpdatesToggle}
              />
              <Badge
                variant={isLiveUpdates ? "default" : "secondary"}
                className="text-xs"
              >
                {isLiveUpdates ? "On" : "Off"}
              </Badge>
            </div>
          </div>
        )}

        {/* Export Controls */}
        {mergedConfig.allowExport && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Export</label>
            <div className="flex flex-wrap gap-1">
              {mergedConfig.exportFormats?.map(format => (
                <Button
                  key={format}
                  size="sm"
                  variant="outline"
                  onClick={() => onExport?.(format)}
                  className="h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Hook for managing chart controls state
export const useChartControls = () => {
  const [viewMode, setViewMode] = React.useState<ChartViewMode>("absolute");
  const [timeRange, setTimeRange] = React.useState<TimeRange | undefined>();
  const [zoom, setZoom] = React.useState(1);
  const [seriesVisibility, setSeriesVisibility] =
    React.useState<SeriesVisibility>({});
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLiveUpdates, setIsLiveUpdates] = React.useState(true);

  // Initialize series visibility when data changes
  const initializeSeriesVisibility = React.useCallback(
    (seriesKeys: string[]) => {
      const visibility: SeriesVisibility = {};
      seriesKeys.forEach(key => {
        visibility[key] = true;
      });
      setSeriesVisibility(visibility);
    },
    []
  );

  // Reset all controls to defaults
  const resetControls = React.useCallback(() => {
    setViewMode("absolute");
    setTimeRange(undefined);
    setZoom(1);
    setIsPlaying(false);
  }, []);

  // Toggle playback
  const togglePlayback = React.useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Step function for manual progression
  const step = React.useCallback(() => {
    // Implementation depends on parent component
    console.log("Step forward");
  }, []);

  // Export function
  const exportChart = React.useCallback((format: string) => {
    // Implementation depends on parent component
    console.log(`Export as ${format}`);
  }, []);

  return {
    // State
    viewMode,
    timeRange,
    zoom,
    seriesVisibility,
    isPlaying,
    isLiveUpdates,

    // Setters
    setViewMode,
    setTimeRange,
    setZoom,
    setSeriesVisibility,
    setIsLiveUpdates,

    // Actions
    initializeSeriesVisibility,
    resetControls,
    togglePlayback,
    step,
    exportChart,
  };
};
