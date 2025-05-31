"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  BarChart3,
  Cpu,
  HardDrive,
  RefreshCw,
  Target,
  Brain,
} from "lucide-react";
import {
  PerformanceConfig,
  PerformanceMetrics,
  usePerformanceMonitor,
} from "./ChartPerformance";

// Define SamplingStrategy type locally if not exported
type SamplingStrategy =
  | "uniform"
  | "adaptive"
  | "priority"
  | "outlier-preserving";

// Advanced optimization modes
export type OptimizationMode =
  | "balanced" // Balance between performance and quality
  | "performance" // Maximize performance
  | "quality" // Maximize visual quality
  | "memory" // Minimize memory usage
  | "adaptive" // AI-driven adaptive optimization
  | "custom"; // User-defined settings

// Device capabilities assessment
export interface DeviceCapabilities {
  memoryGB: number;
  cpuCores: number;
  isHighDPI: boolean;
  supportsConcurrency: boolean;
  estimatedPerformanceClass: "low" | "medium" | "high" | "ultra";
}

// Optimization recommendations
export interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  category: "performance" | "memory" | "quality" | "stability";
  action: () => void;
  enabled: boolean;
  estimatedImprovement: string;
}

// Advanced performance configuration
export interface AdvancedPerformanceConfig extends PerformanceConfig {
  optimizationMode: OptimizationMode;
  autoOptimization: boolean;
  adaptiveThresholds: boolean;
  deviceAwareOptimization: boolean;
  memoryManagement: {
    enableGarbageCollection: boolean;
    gcThreshold: number; // MB
    preloadStrategy: "aggressive" | "conservative" | "adaptive";
  };
  renderingOptimization: {
    enableRAF: boolean; // RequestAnimationFrame
    batchUpdates: boolean;
    throttleUpdates: boolean;
    updateInterval: number; // ms
  };
  dataOptimization: {
    intelligentSampling: boolean;
    outlierPreservation: boolean;
    compressionLevel: "none" | "light" | "medium" | "aggressive";
    cacheStrategy: "memory" | "indexeddb" | "hybrid";
  };
}

// Performance optimizer props
export interface AdvancedPerformanceOptimizerProps {
  config: AdvancedPerformanceConfig;
  metrics: PerformanceMetrics;
  dataSize: number;
  onConfigChange: (config: AdvancedPerformanceConfig) => void;
  className?: string;
}

// Default advanced configuration
const defaultAdvancedConfig: AdvancedPerformanceConfig = {
  // Base config
  enableSampling: true,
  maxDataPoints: 1000,
  samplingStrategy: "adaptive",
  enableProgressiveLoading: true,
  chunkSize: 100,
  loadingDelay: 16,
  enableWindowing: true,
  windowSize: 500,
  windowOverlap: 50,
  enableMemoization: true,
  memoizationThreshold: 100,
  enableVirtualization: true,
  renderThreshold: 5000,
  debounceDelay: 100,
  enableProfiling: false,
  logPerformanceMetrics: false,

  // Advanced config
  optimizationMode: "adaptive",
  autoOptimization: true,
  adaptiveThresholds: true,
  deviceAwareOptimization: true,
  memoryManagement: {
    enableGarbageCollection: true,
    gcThreshold: 100,
    preloadStrategy: "adaptive",
  },
  renderingOptimization: {
    enableRAF: true,
    batchUpdates: true,
    throttleUpdates: true,
    updateInterval: 16,
  },
  dataOptimization: {
    intelligentSampling: true,
    outlierPreservation: true,
    compressionLevel: "aggressive",
    cacheStrategy: "indexeddb",
  },
};

// Device capability detection
const detectDeviceCapabilities = (): DeviceCapabilities => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memory = (navigator as any).deviceMemory || 4; // GB
  const cpuCores = navigator.hardwareConcurrency || 4;
  const isHighDPI = window.devicePixelRatio > 1.5;
  const supportsConcurrency =
    "Worker" in window && "SharedArrayBuffer" in window;

  let performanceClass: DeviceCapabilities["estimatedPerformanceClass"];
  if (memory >= 8 && cpuCores >= 8) performanceClass = "ultra";
  else if (memory >= 4 && cpuCores >= 4) performanceClass = "high";
  else if (memory >= 2 && cpuCores >= 2) performanceClass = "medium";
  else performanceClass = "low";

  return {
    memoryGB: memory,
    cpuCores,
    isHighDPI,
    supportsConcurrency,
    estimatedPerformanceClass: performanceClass,
  };
};

// Generate optimization recommendations
const generateRecommendations = (
  metrics: PerformanceMetrics,
  config: AdvancedPerformanceConfig,
  deviceCapabilities: DeviceCapabilities,
  dataSize: number
): OptimizationRecommendation[] => {
  const recommendations: OptimizationRecommendation[] = [];

  // Data processing optimization
  if (metrics.dataProcessingTime > 50) {
    recommendations.push({
      id: "enable-sampling",
      title: "Enable Intelligent Sampling",
      description:
        "Reduce data processing time by sampling large datasets intelligently",
      impact: "high",
      category: "performance",
      action: () => {},
      enabled: !config.enableSampling,
      estimatedImprovement: "60-80% faster",
    });
  }

  // Memory optimization
  if (metrics.memoryUsage > deviceCapabilities.memoryGB * 512) {
    // Half of device memory in MB
    recommendations.push({
      id: "enable-windowing",
      title: "Enable Data Windowing",
      description: "Process data in smaller windows to reduce memory usage",
      impact: "high",
      category: "memory",
      action: () => {},
      enabled: !config.enableWindowing,
      estimatedImprovement: "50-70% less memory",
    });
  }

  // Render optimization
  if (metrics.renderTime > 33) {
    // Below 30fps
    recommendations.push({
      id: "enable-virtualization",
      title: "Enable Chart Virtualization",
      description: "Render only visible elements to improve frame rate",
      impact: "high",
      category: "performance",
      action: () => {},
      enabled: !config.enableVirtualization,
      estimatedImprovement: "40-60% faster rendering",
    });
  }

  // Progressive loading for large datasets
  if (dataSize > 10000 && !config.enableProgressiveLoading) {
    recommendations.push({
      id: "enable-progressive",
      title: "Enable Progressive Loading",
      description: "Load data incrementally for better perceived performance",
      impact: "medium",
      category: "performance",
      action: () => {},
      enabled: false,
      estimatedImprovement: "Instant initial render",
    });
  }

  // Adaptive sampling for quality
  if (config.samplingStrategy !== "adaptive" && dataSize > 5000) {
    recommendations.push({
      id: "adaptive-sampling",
      title: "Use Adaptive Sampling",
      description:
        "Preserve important data points while reducing overall dataset size",
      impact: "medium",
      category: "quality",
      action: () => {},
      enabled: false,
      estimatedImprovement: "Better visual accuracy",
    });
  }

  return recommendations;
};

// Optimization mode presets
const getOptimizationPreset = (
  mode: OptimizationMode,
  deviceCapabilities: DeviceCapabilities
): Partial<AdvancedPerformanceConfig> => {
  const baseConfig = { ...defaultAdvancedConfig };

  switch (mode) {
    case "performance":
      return {
        maxDataPoints: 500,
        samplingStrategy: "uniform",
        chunkSize: 50,
        windowSize: 250,
        enableVirtualization: true,
        renderThreshold: 1000,
        debounceDelay: 50,
        memoryManagement: {
          enableGarbageCollection: true,
          gcThreshold: 50,
          preloadStrategy: "conservative",
        },
        renderingOptimization: {
          enableRAF: true,
          batchUpdates: true,
          throttleUpdates: true,
          updateInterval: 16,
        },
      };

    case "quality":
      return {
        maxDataPoints: 5000,
        samplingStrategy: "outlier-preserving",
        chunkSize: 200,
        windowSize: 1000,
        enableVirtualization: false,
        renderThreshold: 10000,
        debounceDelay: 200,
        dataOptimization: {
          intelligentSampling: true,
          outlierPreservation: true,
          compressionLevel: "light",
          cacheStrategy: "memory",
        },
      };

    case "memory":
      return {
        maxDataPoints: 300,
        samplingStrategy: "uniform",
        chunkSize: 25,
        windowSize: 150,
        enableWindowing: true,
        windowOverlap: 25,
        memoryManagement: {
          enableGarbageCollection: true,
          gcThreshold: 25,
          preloadStrategy: "conservative",
        },
        dataOptimization: {
          intelligentSampling: true,
          outlierPreservation: true,
          compressionLevel: "aggressive",
          cacheStrategy: "indexeddb",
        },
      };

    case "balanced":
      return {
        maxDataPoints: 1000,
        samplingStrategy: "adaptive",
        chunkSize: 100,
        windowSize: 500,
        enableVirtualization: true,
        renderThreshold: 5000,
        debounceDelay: 100,
      };

    case "adaptive":
      // AI-driven configuration based on device capabilities
      const adaptiveConfig = { ...baseConfig };

      if (deviceCapabilities.estimatedPerformanceClass === "low") {
        Object.assign(
          adaptiveConfig,
          getOptimizationPreset("memory", deviceCapabilities)
        );
      } else if (deviceCapabilities.estimatedPerformanceClass === "ultra") {
        Object.assign(
          adaptiveConfig,
          getOptimizationPreset("quality", deviceCapabilities)
        );
      } else {
        Object.assign(
          adaptiveConfig,
          getOptimizationPreset("balanced", deviceCapabilities)
        );
      }

      return adaptiveConfig;

    default:
      return baseConfig;
  }
};

// Performance optimizer component
export const AdvancedPerformanceOptimizer: React.FC<
  AdvancedPerformanceOptimizerProps
> = ({ config, metrics, dataSize, onConfigChange, className = "" }) => {
  const deviceCapabilities = React.useMemo(
    () => detectDeviceCapabilities(),
    []
  );
  const [recommendations, setRecommendations] = React.useState<
    OptimizationRecommendation[]
  >([]);
  const [isOptimizing, setIsOptimizing] = React.useState(false);

  const { metrics: realtimeMetrics } = usePerformanceMonitor(true);

  // Update recommendations when metrics change
  React.useEffect(() => {
    const newRecommendations = generateRecommendations(
      { ...metrics, ...realtimeMetrics },
      config,
      deviceCapabilities,
      dataSize
    );
    setRecommendations(newRecommendations);
  }, [metrics, realtimeMetrics, config, deviceCapabilities, dataSize]);

  // Auto-optimization
  const performAutoOptimization = React.useCallback(async () => {
    setIsOptimizing(true);

    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 1000));

    const optimizedConfig = {
      ...config,
      ...getOptimizationPreset(config.optimizationMode, deviceCapabilities),
    };

    onConfigChange(optimizedConfig);
    setIsOptimizing(false);
  }, [config, deviceCapabilities, onConfigChange]);

  // Apply optimization preset
  const applyOptimizationMode = (mode: OptimizationMode) => {
    const preset = getOptimizationPreset(mode, deviceCapabilities);
    onConfigChange({
      ...config,
      ...preset,
      optimizationMode: mode,
    });
  };

  // Calculate performance score
  const performanceScore = React.useMemo(() => {
    const scores = {
      processing: Math.max(0, 100 - metrics.dataProcessingTime),
      rendering: Math.max(0, 100 - metrics.renderTime * 2),
      memory: Math.max(
        0,
        100 - (metrics.memoryUsage / deviceCapabilities.memoryGB) * 10
      ),
      efficiency: Math.min(100, metrics.samplingRatio * 100),
    };

    return Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;
  }, [metrics, deviceCapabilities]);

  return (
    <Card className={`advanced-performance-optimizer ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Performance Optimizer
          </CardTitle>
          <Badge
            variant={
              performanceScore > 80
                ? "default"
                : performanceScore > 60
                ? "secondary"
                : "destructive"
            }
          >
            {performanceScore.toFixed(0)}% Optimized
          </Badge>
        </div>

        {/* Performance Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Performance</span>
            <span>{performanceScore.toFixed(1)}/100</span>
          </div>
          <Progress value={performanceScore} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Device Info */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Device Class</div>
            <Badge variant="outline" className="capitalize">
              {deviceCapabilities.estimatedPerformanceClass}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Data Size</div>
            <div className="text-sm font-mono">
              {dataSize.toLocaleString()} pts
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Memory</div>
            <div className="text-sm font-mono">
              {deviceCapabilities.memoryGB}GB
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">CPU Cores</div>
            <div className="text-sm font-mono">
              {deviceCapabilities.cpuCores}
            </div>
          </div>
        </div>

        {/* Optimization Modes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Optimization Mode</h4>
            {config.autoOptimization && (
              <Button
                size="sm"
                onClick={performAutoOptimization}
                disabled={isOptimizing}
                className="h-7"
              >
                {isOptimizing ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Zap className="h-3 w-3 mr-1" />
                )}
                Auto-Optimize
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                "balanced",
                "performance",
                "quality",
                "memory",
                "adaptive",
              ] as OptimizationMode[]
            ).map(mode => (
              <Button
                key={mode}
                variant={
                  config.optimizationMode === mode ? "default" : "outline"
                }
                size="sm"
                onClick={() => applyOptimizationMode(mode)}
                className="capitalize text-xs"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommendations ({recommendations.length})
            </h4>

            <div className="space-y-2">
              {recommendations.slice(0, 3).map(rec => (
                <div key={rec.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rec.title}</span>
                        <Badge
                          variant={
                            rec.impact === "high"
                              ? "destructive"
                              : rec.impact === "medium"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {rec.impact} impact
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{rec.description}</p>
                      <div className="text-xs text-green-600 font-medium">
                        {rec.estimatedImprovement}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Advanced Settings</h4>

          {/* Auto Optimization */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm">Auto-Optimization</div>
              <div className="text-xs text-gray-500">
                Automatically adjust settings based on performance
              </div>
            </div>
            <Switch
              checked={config.autoOptimization}
              onCheckedChange={checked =>
                onConfigChange({ ...config, autoOptimization: checked })
              }
            />
          </div>

          {/* Adaptive Thresholds */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm">Adaptive Thresholds</div>
              <div className="text-xs text-gray-500">
                Dynamically adjust performance thresholds
              </div>
            </div>
            <Switch
              checked={config.adaptiveThresholds}
              onCheckedChange={checked =>
                onConfigChange({ ...config, adaptiveThresholds: checked })
              }
            />
          </div>

          {/* Max Data Points */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm">Max Data Points</div>
              <div className="text-xs font-mono">{config.maxDataPoints}</div>
            </div>
            <Slider
              value={[config.maxDataPoints || 1000]}
              onValueChange={([value]) =>
                onConfigChange({ ...config, maxDataPoints: value })
              }
              min={100}
              max={10000}
              step={100}
              className="w-full"
            />
          </div>

          {/* Sampling Strategy */}
          <div className="space-y-2">
            <div className="text-sm">Sampling Strategy</div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "uniform",
                  "adaptive",
                  "priority",
                  "outlier-preserving",
                ] as SamplingStrategy[]
              ).map(strategy => (
                <Button
                  key={strategy}
                  variant={
                    config.samplingStrategy === strategy ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    onConfigChange({ ...config, samplingStrategy: strategy })
                  }
                  className="text-xs"
                >
                  {strategy.replace("-", " ")}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              Processing
            </div>
            <div className="text-sm font-mono">
              {metrics.dataProcessingTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Rendering
            </div>
            <div className="text-sm font-mono">
              {metrics.renderTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Memory
            </div>
            <div className="text-sm font-mono">
              {metrics.memoryUsage.toFixed(1)}MB
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Sampling
            </div>
            <div className="text-sm font-mono">
              {(metrics.samplingRatio * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedPerformanceOptimizer;
