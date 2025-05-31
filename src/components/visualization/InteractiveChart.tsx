"use client";

import * as React from "react";
import { BaseChart, ChartDataPoint, ChartConfig } from "./BaseChart";
import {
  ChartControls,
  ChartViewMode,
  TimeRange,
  SeriesVisibility,
  useChartControls,
} from "./ChartControls";
import { ChartTooltip, BacterialSimulationTooltip } from "./ChartTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Maximize2, Minimize2, RefreshCw, Pause, Play } from "lucide-react";

// Interactive chart configuration
export interface InteractiveChartConfig extends ChartConfig {
  // Chart type for data transformation
  chartType?: "population" | "resistance" | "growth" | "mutation" | "custom";

  // Interactive features
  enableZoom?: boolean;
  enableBrush?: boolean;
  enableControls?: boolean;
  enableTooltips?: boolean;
  enableFullscreen?: boolean;
  enableExport?: boolean;

  // Update behavior
  autoUpdate?: boolean;
  updateInterval?: number;
  maxDataPoints?: number;

  // View options
  allowViewModeToggle?: boolean;
  allowTimeRangeSelection?: boolean;
  allowSeriesToggle?: boolean;

  // Animation
  enableAnimation?: boolean;
  animationDuration?: number;
}

// Interactive chart props
export interface InteractiveChartProps {
  data: ChartDataPoint[];
  config?: InteractiveChartConfig;
  title?: string;
  description?: string;
  loading?: boolean;
  error?: string;
  className?: string;

  // Chart content (children)
  children: (props: {
    data: ChartDataPoint[];
    viewMode: ChartViewMode;
    timeRange?: TimeRange;
    zoom: number;
    seriesVisibility: SeriesVisibility;
    isPlaying: boolean;
    width?: number;
    height?: number;
  }) => React.ReactNode;

  // Event handlers
  onDataUpdate?: (data: ChartDataPoint[]) => void;
  onViewModeChange?: (mode: ChartViewMode) => void;
  onTimeRangeChange?: (range: TimeRange) => void;
  onExport?: (format: string, data: ChartDataPoint[]) => void;
  onFullscreenToggle?: (isFullscreen: boolean) => void;

  // Simulation-specific data for enhanced tooltips
  simulationData?: {
    generation: number;
    totalPopulation: number;
    resistantPopulation: number;
    mutationRate: number;
    environmentalStress: number;
    diversityIndex?: number;
  };
}

// Default configuration
const defaultInteractiveConfig: InteractiveChartConfig = {
  chartType: "population",
  enableZoom: true,
  enableBrush: true,
  enableControls: true,
  enableTooltips: true,
  enableFullscreen: true,
  enableExport: true,
  autoUpdate: true,
  updateInterval: 1000,
  maxDataPoints: 1000,
  allowViewModeToggle: true,
  allowTimeRangeSelection: true,
  allowSeriesToggle: true,
  enableAnimation: true,
  animationDuration: 300,
  responsive: true,
  height: 400,
};

// Data transformation hook
const useDataTransformation = (
  data: ChartDataPoint[],
  viewMode: ChartViewMode,
  timeRange?: TimeRange
) => {
  return React.useMemo(() => {
    let transformedData = [...data];

    // Apply view mode transformations directly to the already-processed chart data
    switch (viewMode) {
      case "percentage":
        transformedData = transformedData.map(point => {
          const newPoint = { ...point };
          Object.keys(newPoint).forEach(key => {
            if (
              typeof newPoint[key] === "number" &&
              key !== "generation" &&
              key !== "time"
            ) {
              newPoint[key] = (newPoint[key] as number) / 100;
            }
          });
          return newPoint;
        });
        break;
      case "logarithmic":
        transformedData = transformedData.map(point => {
          const newPoint = { ...point };
          Object.keys(newPoint).forEach(key => {
            if (
              typeof newPoint[key] === "number" &&
              newPoint[key] > 0 &&
              key !== "generation" &&
              key !== "time"
            ) {
              newPoint[key] = Math.log10(newPoint[key] as number);
            }
          });
          return newPoint;
        });
        break;
      case "normalized":
        // Normalize each series to 0-1 range
        const seriesKeys = Object.keys(transformedData[0] || {}).filter(
          key =>
            key !== "generation" &&
            key !== "time" &&
            typeof transformedData[0][key] === "number"
        );

        seriesKeys.forEach(key => {
          const values = transformedData
            .map(point => point[key] as number)
            .filter(v => v !== null && v !== undefined);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;

          if (range > 0) {
            transformedData = transformedData.map(point => ({
              ...point,
              [key]: ((point[key] as number) - min) / range,
            }));
          }
        });
        break;
      case "rate-of-change":
        // Calculate rate of change for each series
        transformedData = transformedData.map((point, index) => {
          if (index === 0) return point;

          const prevPoint = transformedData[index - 1];
          const newPoint = { ...point };

          Object.keys(newPoint).forEach(key => {
            if (
              typeof newPoint[key] === "number" &&
              key !== "generation" &&
              key !== "time"
            ) {
              const current = newPoint[key] as number;
              const previous = prevPoint[key] as number;
              newPoint[key] =
                previous !== 0 ? ((current - previous) / previous) * 100 : 0;
            }
          });

          return newPoint;
        });
        break;
    }

    // Apply time range filtering
    if (timeRange) {
      const { start, end } = timeRange;
      transformedData = transformedData.filter((point, index) => {
        if (start >= 0 && end >= 0) {
          // Absolute range
          return index >= start && index <= end;
        } else if (start < 0 || end < 0) {
          // Relative range from end
          const dataLength = transformedData.length;
          const actualStart = start < 0 ? dataLength + start : start;
          const actualEnd = end < 0 ? dataLength + end : end;
          return index >= actualStart && index <= actualEnd;
        }
        return true;
      });
    }

    return transformedData;
  }, [data, viewMode, timeRange]);
};

// Auto-update hook
const useAutoUpdate = (
  enabled: boolean,
  interval: number,
  onUpdate: () => void
) => {
  React.useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(onUpdate, interval);
    return () => clearInterval(timer);
  }, [enabled, interval, onUpdate]);
};

// Fullscreen hook
const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
    containerRef,
  };
};

// Interactive Chart Component
export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  config = {},
  title,
  description,
  loading = false,
  error,
  className = "",
  children,
  onDataUpdate,
  onViewModeChange,
  onTimeRangeChange,
  onExport,
  onFullscreenToggle,
}) => {
  const mergedConfig = { ...defaultInteractiveConfig, ...config };
  const { isFullscreen, toggleFullscreen, containerRef } = useFullscreen();

  // Chart controls state
  const {
    viewMode,
    timeRange,
    zoom,
    seriesVisibility,
    isPlaying,
    isLiveUpdates,
    setViewMode,
    setTimeRange,
    setZoom,
    setSeriesVisibility,
    setIsLiveUpdates,
    initializeSeriesVisibility,
    resetControls,
    togglePlayback,
    exportChart,
  } = useChartControls();

  // Initialize series visibility when data changes
  React.useEffect(() => {
    if (data.length > 0) {
      const seriesKeys = Object.keys(data[0]).filter(
        key =>
          key !== "generation" &&
          key !== "time" &&
          typeof data[0][key] === "number"
      );
      initializeSeriesVisibility(seriesKeys);
    }
  }, [data, initializeSeriesVisibility]);

  // Transform data based on current settings
  const transformedData = useDataTransformation(data, viewMode, timeRange);

  // Auto-update functionality
  useAutoUpdate(
    Boolean(mergedConfig.autoUpdate) && isLiveUpdates && !isPlaying,
    mergedConfig.updateInterval || 1000,
    React.useCallback(() => {
      onDataUpdate?.(transformedData);
    }, [transformedData, onDataUpdate])
  );

  // Handle view mode changes
  const handleViewModeChange = React.useCallback(
    (mode: ChartViewMode) => {
      setViewMode(mode);
      onViewModeChange?.(mode);
    },
    [setViewMode, onViewModeChange]
  );

  // Handle time range changes
  const handleTimeRangeChange = React.useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      onTimeRangeChange?.(range);
    },
    [setTimeRange, onTimeRangeChange]
  );

  // Handle export
  const handleExport = React.useCallback(
    (format: string) => {
      onExport?.(format, transformedData);
      exportChart(format);
    },
    [onExport, transformedData, exportChart]
  );

  // Handle fullscreen toggle
  const handleFullscreenToggle = React.useCallback(() => {
    toggleFullscreen();
    onFullscreenToggle?.(!isFullscreen);
  }, [toggleFullscreen, onFullscreenToggle, isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`interactive-chart-container ${
        isFullscreen ? "fixed inset-0 z-50 bg-white" : ""
      } ${className}`}
    >
      <div className={`flex ${isFullscreen ? "h-full" : "h-auto"} gap-4`}>
        {/* Main Chart Area */}
        <div className="flex-1 space-y-4">
          {/* Chart Header */}
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Status indicators */}
              {isLiveUpdates && (
                <Badge variant="default" className="text-xs">
                  Live
                </Badge>
              )}
              {isPlaying && (
                <Badge variant="secondary" className="text-xs">
                  Playing
                </Badge>
              )}

              {/* Quick action buttons */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsLiveUpdates(!isLiveUpdates)}
                className="h-8"
              >
                {isLiveUpdates ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={resetControls}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>

              {mergedConfig.enableFullscreen && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFullscreenToggle}
                  className="h-8"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Chart */}
          <BaseChart
            data={transformedData}
            config={{
              ...mergedConfig,
              height: isFullscreen
                ? window.innerHeight - 200
                : mergedConfig.height,
            }}
            loading={loading}
            error={error}
            className="chart-main"
          >
            {children({
              data: transformedData,
              viewMode,
              timeRange,
              zoom,
              seriesVisibility,
              isPlaying,
              width: isFullscreen ? window.innerWidth - 300 : undefined,
              height: isFullscreen
                ? window.innerHeight - 200
                : mergedConfig.height,
            })}
          </BaseChart>
        </div>

        {/* Controls Panel */}
        {mergedConfig.enableControls && (
          <div className={`${isFullscreen ? "w-80" : "w-64"} space-y-4`}>
            <ChartControls
              config={{
                allowViewModeToggle: mergedConfig.allowViewModeToggle,
                allowTimeRangeSelection: mergedConfig.allowTimeRangeSelection,
                allowSeriesToggle: mergedConfig.allowSeriesToggle,
                allowZoom: mergedConfig.enableZoom,
                allowExport: mergedConfig.enableExport,
                allowLiveUpdates: true,
                availableViewModes: [
                  "absolute",
                  "percentage",
                  "logarithmic",
                  "normalized",
                  "rate-of-change",
                ],
              }}
              currentViewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              currentTimeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
              currentZoom={zoom}
              onZoomChange={setZoom}
              seriesVisibility={seriesVisibility}
              onSeriesVisibilityChange={setSeriesVisibility}
              isPlaying={isPlaying}
              onPlayPause={togglePlayback}
              onReset={resetControls}
              onExport={handleExport}
              isLiveUpdates={isLiveUpdates}
              onLiveUpdatesToggle={() => setIsLiveUpdates(!isLiveUpdates)}
            />

            {/* Chart Stats */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h4 className="text-sm font-medium">Chart Statistics</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Data Points:</span>
                    <span>{transformedData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoom Level:</span>
                    <span>{(zoom * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>View Mode:</span>
                    <span className="capitalize">
                      {viewMode.replace("-", " ")}
                    </span>
                  </div>
                  {timeRange && (
                    <div className="flex justify-between">
                      <span>Range:</span>
                      <span className="text-xs">{timeRange.label}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Tooltip wrapper for interactive charts
export const InteractiveChartTooltip: React.FC<{
  simulationData?: InteractiveChartProps["simulationData"];
  preset?: "population" | "resistance" | "mutation" | "compact";
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string | number;
}> = ({ simulationData, preset = "population", active, payload, label }) => {
  const presetConfig = {
    population: { showTrends: true, showDescription: true, compactMode: false },
    resistance: { showTrends: true, showDescription: true, compactMode: false },
    mutation: { showTrends: false, showDescription: true, compactMode: true },
    compact: { showTrends: false, showDescription: false, compactMode: true },
  }[preset];

  if (simulationData) {
    return (
      <BacterialSimulationTooltip
        active={active}
        payload={payload}
        label={label}
        simulationData={simulationData}
        {...presetConfig}
      />
    );
  }

  return (
    <ChartTooltip
      active={active}
      payload={payload}
      label={label}
      {...presetConfig}
    />
  );
};

InteractiveChartTooltip.displayName = "InteractiveChartTooltip";

// Export utility for creating interactive chart instances
export const createInteractiveChart = (
  chartType: InteractiveChartConfig["chartType"],
  config?: Partial<InteractiveChartConfig>
) => {
  const mergedConfig: InteractiveChartConfig = {
    ...defaultInteractiveConfig,
    chartType,
    ...config,
  };

  const InteractiveChartInstance = (
    props: Omit<InteractiveChartProps, "config">
  ) => <InteractiveChart {...props} config={mergedConfig} />;

  InteractiveChartInstance.displayName = `InteractiveChart_${chartType}`;
  return InteractiveChartInstance;
};
