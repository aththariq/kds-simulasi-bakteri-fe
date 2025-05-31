"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Activity,
  Maximize2,
  Minimize2,
  Settings,
} from "lucide-react";

import { BaseChart, ChartDataPoint, ChartConfig } from "./BaseChart";
import { useHighPerformanceChartData } from "./ChartPerformance";
import {
  AdvancedPerformanceOptimizer,
  AdvancedPerformanceConfig,
} from "./AdvancedPerformanceOptimizer";

// Chart types that support high performance rendering
export type HighPerformanceChartType =
  | "population"
  | "resistance"
  | "growth"
  | "mutation"
  | "base";

// High performance chart props
export interface HighPerformanceChartProps {
  // Data and basic config
  data: ChartDataPoint[];
  chartType: HighPerformanceChartType;
  chartConfig?: ChartConfig;

  // Performance configuration
  performanceConfig?: Partial<AdvancedPerformanceConfig>;
  enablePerformanceOptimization?: boolean;

  // Chart-specific props
  title?: string;
  description?: string;
  className?: string;

  // Performance monitoring
  showPerformanceMonitor?: boolean;
  showOptimizer?: boolean;
  autoOptimize?: boolean;

  // Layout and interaction
  allowFullscreen?: boolean;
  allowExport?: boolean;
  onExport?: (data: ChartDataPoint[], format: string) => void;

  // Chart component props (will be passed to specific chart types)
  chartProps?: Record<string, unknown>;
}

// Performance thresholds for automatic optimization triggers
const PERFORMANCE_THRESHOLDS = {
  criticalDataSize: 50000, // Auto-enable aggressive optimizations
  largeDataSize: 10000, // Enable standard optimizations
  mediumDataSize: 1000, // Enable basic optimizations
  maxRenderTime: 100, // ms - trigger render optimizations
  maxMemoryUsage: 200, // MB - trigger memory optimizations
  minSamplingRatio: 0.1, // Minimum acceptable sampling ratio
};

// Chart component mapping
const ChartComponentMap: Record<
  HighPerformanceChartType,
  React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any
> = {
  population: React.lazy(() =>
    import("./PopulationChart").then(m => ({ default: m.PopulationChart }))
  ),
  resistance: React.lazy(() =>
    import("./ResistanceEvolutionChart").then(m => ({
      default: m.ResistanceEvolutionChart,
    }))
  ),
  growth: React.lazy(() =>
    import("./PopulationGrowthChart").then(m => ({
      default: m.PopulationGrowthChart,
    }))
  ),
  mutation: React.lazy(() =>
    import("./MutationTrackingChart").then(m => ({
      default: m.MutationTrackingChart,
    }))
  ),
  base: BaseChart,
};

// Get optimized configuration based on data size and device capabilities
const getOptimizedConfig = (
  dataSize: number,
  currentConfig: Partial<AdvancedPerformanceConfig> = {}
): AdvancedPerformanceConfig => {
  const defaultConfig: AdvancedPerformanceConfig = {
    // Base performance config
    enableSampling: dataSize > PERFORMANCE_THRESHOLDS.mediumDataSize,
    maxDataPoints: Math.min(
      2000,
      Math.max(500, Math.floor(10000 / Math.sqrt(dataSize / 1000)))
    ),
    samplingStrategy:
      dataSize > PERFORMANCE_THRESHOLDS.largeDataSize ? "adaptive" : "uniform",
    enableProgressiveLoading: dataSize > PERFORMANCE_THRESHOLDS.largeDataSize,
    chunkSize: Math.min(200, Math.max(50, Math.floor(dataSize / 100))),
    loadingDelay: 16,
    enableWindowing: dataSize > PERFORMANCE_THRESHOLDS.criticalDataSize,
    windowSize: Math.min(1000, Math.max(300, Math.floor(dataSize / 50))),
    windowOverlap: 50,
    enableMemoization: true,
    memoizationThreshold: 100,
    enableVirtualization: dataSize > PERFORMANCE_THRESHOLDS.largeDataSize,
    renderThreshold: PERFORMANCE_THRESHOLDS.largeDataSize,
    debounceDelay: dataSize > PERFORMANCE_THRESHOLDS.largeDataSize ? 50 : 100,
    enableProfiling: false,
    logPerformanceMetrics: false,

    // Advanced configuration
    optimizationMode: "adaptive",
    autoOptimization: true,
    adaptiveThresholds: true,
    deviceAwareOptimization: true,
    memoryManagement: {
      enableGarbageCollection: dataSize > PERFORMANCE_THRESHOLDS.largeDataSize,
      gcThreshold:
        dataSize > PERFORMANCE_THRESHOLDS.criticalDataSize ? 50 : 100,
      preloadStrategy:
        dataSize > PERFORMANCE_THRESHOLDS.criticalDataSize
          ? "conservative"
          : "adaptive",
    },
    renderingOptimization: {
      enableRAF: true,
      batchUpdates: dataSize > PERFORMANCE_THRESHOLDS.mediumDataSize,
      throttleUpdates: dataSize > PERFORMANCE_THRESHOLDS.largeDataSize,
      updateInterval: dataSize > PERFORMANCE_THRESHOLDS.largeDataSize ? 33 : 16, // 30fps vs 60fps
    },
    dataOptimization: {
      intelligentSampling: dataSize > PERFORMANCE_THRESHOLDS.mediumDataSize,
      outlierPreservation: true,
      compressionLevel:
        dataSize > PERFORMANCE_THRESHOLDS.criticalDataSize
          ? "aggressive"
          : dataSize > PERFORMANCE_THRESHOLDS.largeDataSize
          ? "medium"
          : "light",
      cacheStrategy:
        dataSize > PERFORMANCE_THRESHOLDS.largeDataSize ? "hybrid" : "memory",
    },
  };

  return { ...defaultConfig, ...currentConfig };
};

// Export data in various formats
const exportData = (
  data: ChartDataPoint[],
  format: string,
  filename: string = "chart-data"
): void => {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format.toLowerCase()) {
    case "csv":
      const headers = Object.keys(data[0] || {}).join(",");
      const rows = data.map(row =>
        Object.values(row)
          .map(val =>
            typeof val === "string" && val.includes(",") ? `"${val}"` : val
          )
          .join(",")
      );
      content = [headers, ...rows].join("\n");
      mimeType = "text/csv";
      extension = "csv";
      break;

    case "json":
      content = JSON.stringify(data, null, 2);
      mimeType = "application/json";
      extension = "json";
      break;

    case "tsv":
      const tsvHeaders = Object.keys(data[0] || {}).join("\t");
      const tsvRows = data.map(row => Object.values(row).join("\t"));
      content = [tsvHeaders, ...tsvRows].join("\n");
      mimeType = "text/tab-separated-values";
      extension = "tsv";
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Simple performance monitor component
const PerformanceMonitor: React.FC<{
  metrics: { renderTime: number; memoryUsage: number; samplingRatio: number };
  config: AdvancedPerformanceConfig;
  className?: string;
}> = ({ metrics, className }) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle className="text-sm">Performance Monitor</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Render Time:</span>
          <span>{metrics.renderTime.toFixed(1)}ms</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Memory Usage:</span>
          <span>{metrics.memoryUsage.toFixed(1)}MB</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Sampling Ratio:</span>
          <span>{(metrics.samplingRatio * 100).toFixed(1)}%</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// High performance chart component
export const HighPerformanceChart: React.FC<HighPerformanceChartProps> = ({
  data,
  chartType,
  chartConfig,
  performanceConfig = {},
  enablePerformanceOptimization = true,
  title,
  description,
  className = "",
  showPerformanceMonitor = false,
  showOptimizer = false,
  autoOptimize = true,
  allowFullscreen = true,
  allowExport = true,
  onExport,
  chartProps = {},
}) => {
  // State management
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showMonitor, setShowMonitor] = React.useState(showPerformanceMonitor);
  const [showOptimizerPanel, setShowOptimizerPanel] =
    React.useState(showOptimizer);
  const [optimizedConfig, setOptimizedConfig] =
    React.useState<AdvancedPerformanceConfig>(() =>
      getOptimizedConfig(data.length, performanceConfig)
    );

  // Performance monitoring
  const {
    data: processedData,
    isLoading,
    loadProgress,
    currentWindow,
    totalWindows,
    nextWindow,
    prevWindow,
    metrics,
  } = useHighPerformanceChartData(data, optimizedConfig);

  // Auto-optimization based on performance metrics
  React.useEffect(() => {
    if (!autoOptimize || !enablePerformanceOptimization) return;

    const shouldOptimize =
      metrics.renderTime > PERFORMANCE_THRESHOLDS.maxRenderTime ||
      metrics.memoryUsage > PERFORMANCE_THRESHOLDS.maxMemoryUsage ||
      metrics.samplingRatio < PERFORMANCE_THRESHOLDS.minSamplingRatio;

    if (shouldOptimize) {
      const newConfig = getOptimizedConfig(data.length, {
        ...optimizedConfig,
        maxDataPoints: Math.max(
          100,
          Math.floor(optimizedConfig.maxDataPoints! * 0.7)
        ),
        samplingStrategy: "adaptive",
        enableVirtualization: true,
      });
      setOptimizedConfig(newConfig);
    }
  }, [
    metrics,
    autoOptimize,
    enablePerformanceOptimization,
    data.length,
    optimizedConfig,
  ]);

  // Update config when data size changes significantly
  React.useEffect(() => {
    const newConfig = getOptimizedConfig(data.length, performanceConfig);
    setOptimizedConfig(newConfig);
  }, [data.length, performanceConfig]);

  // Chart component with error boundary
  const ChartComponent = React.useMemo(() => {
    const Component = ChartComponentMap[chartType];

    if (!Component) {
      console.warn(
        `Unknown chart type: ${chartType}, falling back to BaseChart`
      );
      return ChartComponentMap.base;
    }

    return Component;
  }, [chartType]);

  // Handle export
  const handleExport = (format: string) => {
    if (onExport) {
      onExport(processedData, format);
    } else {
      const filename = `${chartType}-chart-${
        new Date().toISOString().split("T")[0]
      }`;
      exportData(processedData, format, filename);
    }
  };

  // Performance warning
  const showPerformanceWarning =
    data.length > PERFORMANCE_THRESHOLDS.criticalDataSize &&
    !enablePerformanceOptimization;

  return (
    <div
      className={`high-performance-chart ${
        isFullscreen ? "fixed inset-0 z-50 bg-white" : ""
      } ${className}`}
    >
      {/* Performance Warning */}
      {showPerformanceWarning && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Large dataset detected ({data.length.toLocaleString()} points).
            Consider enabling performance optimization for better
            responsiveness.
            <Button
              size="sm"
              variant="outline"
              className="ml-2 h-6"
              onClick={() =>
                setOptimizedConfig(getOptimizedConfig(data.length))
              }
            >
              Auto-Optimize
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Chart Container */}
      <Card className="chart-container">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Data Info */}
              <Badge variant="outline" className="text-xs">
                {processedData.length.toLocaleString()}/
                {data.length.toLocaleString()} pts
              </Badge>

              {/* Loading Progress */}
              {isLoading && (
                <div className="flex items-center gap-2">
                  <Progress value={loadProgress} className="w-20 h-2" />
                  <span className="text-xs text-gray-500">
                    {Math.round(loadProgress)}%
                  </span>
                </div>
              )}

              {/* Performance Monitor Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMonitor(!showMonitor)}
                className="h-7"
              >
                <Activity className="h-3 w-3" />
              </Button>

              {/* Optimizer Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOptimizerPanel(!showOptimizerPanel)}
                className="h-7"
              >
                <Settings className="h-3 w-3" />
              </Button>

              {/* Export */}
              {allowExport && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport("csv")}
                    className="h-7 text-xs"
                  >
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport("json")}
                    className="h-7 text-xs"
                  >
                    JSON
                  </Button>
                </div>
              )}

              {/* Fullscreen */}
              {allowFullscreen && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-7"
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

          {/* Windowing Controls */}
          {totalWindows > 1 && (
            <div className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={prevWindow}
                  disabled={currentWindow === 0}
                >
                  ←
                </Button>
                <span className="text-xs">
                  Window {currentWindow + 1} of {totalWindows}
                </span>
                <Button
                  size="sm"
                  onClick={nextWindow}
                  disabled={currentWindow >= totalWindows - 1}
                >
                  →
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                Showing {processedData.length.toLocaleString()} of{" "}
                {data.length.toLocaleString()} points
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Chart Component */}
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <ChartComponent
              data={processedData}
              config={chartConfig}
              loading={isLoading}
              className="w-full"
              {...chartProps}
            />
          </React.Suspense>
        </CardContent>
      </Card>

      {/* Side Panels */}
      <div className="flex gap-4 mt-4">
        {/* Performance Monitor */}
        {showMonitor && (
          <div className="flex-1">
            <PerformanceMonitor
              metrics={metrics}
              config={optimizedConfig}
              className="w-full"
            />
          </div>
        )}

        {/* Performance Optimizer */}
        {showOptimizerPanel && (
          <div className="flex-1">
            <AdvancedPerformanceOptimizer
              config={optimizedConfig}
              metrics={metrics}
              dataSize={data.length}
              onConfigChange={setOptimizedConfig}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Higher-order component for automatic performance optimization
export const withHighPerformance = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  chartType: HighPerformanceChartType
) => {
  const HighPerformanceWrapper = (
    props: P & { enableAutoOptimization?: boolean }
  ) => {
    const { enableAutoOptimization = true, ...otherProps } = props;

    if (!enableAutoOptimization) {
      return <WrappedComponent {...(otherProps as P)} />;
    }

    return (
      <HighPerformanceChart
        {...(otherProps as unknown as HighPerformanceChartProps)}
        chartType={chartType}
        enablePerformanceOptimization={true}
        autoOptimize={true}
      />
    );
  };

  return HighPerformanceWrapper;
};

// Performance-optimized chart variants
export const HighPerformancePopulationChart = withHighPerformance(
  React.lazy(() =>
    import("./PopulationChart").then(m => ({ default: m.PopulationChart }))
  ),
  "population"
);

export const HighPerformanceResistanceChart = withHighPerformance(
  React.lazy(() =>
    import("./ResistanceEvolutionChart").then(m => ({
      default: m.ResistanceEvolutionChart,
    }))
  ),
  "resistance"
);

export const HighPerformanceGrowthChart = withHighPerformance(
  React.lazy(() =>
    import("./PopulationGrowthChart").then(m => ({
      default: m.PopulationGrowthChart,
    }))
  ),
  "growth"
);

export const HighPerformanceMutationChart = withHighPerformance(
  React.lazy(() =>
    import("./MutationTrackingChart").then(m => ({
      default: m.MutationTrackingChart,
    }))
  ),
  "mutation"
);

export default HighPerformanceChart;
