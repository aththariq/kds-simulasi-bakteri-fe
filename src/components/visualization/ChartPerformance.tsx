"use client";

import * as React from "react";
import { ChartDataPoint } from "./BaseChart";

// Performance configuration options
export interface PerformanceConfig {
  // Data sampling
  enableSampling?: boolean;
  maxDataPoints?: number;
  samplingStrategy?: "uniform" | "adaptive" | "priority" | "outlier-preserving";

  // Progressive loading
  enableProgressiveLoading?: boolean;
  chunkSize?: number;
  loadingDelay?: number;

  // Windowing for large datasets
  enableWindowing?: boolean;
  windowSize?: number;
  windowOverlap?: number;

  // Memoization settings
  enableMemoization?: boolean;
  memoizationThreshold?: number;

  // Rendering optimization
  enableVirtualization?: boolean;
  renderThreshold?: number;
  debounceDelay?: number;

  // Performance monitoring
  enableProfiling?: boolean;
  logPerformanceMetrics?: boolean;
}

// Performance metrics tracking
export interface PerformanceMetrics {
  dataProcessingTime: number;
  renderTime: number;
  memoryUsage: number;
  totalDataPoints: number;
  visibleDataPoints: number;
  samplingRatio: number;
  lastUpdateTime: number;
}

// Data sampling strategies
export type SamplingStrategy =
  | "uniform"
  | "adaptive"
  | "priority"
  | "outlier-preserving";

// Default performance configuration
const defaultPerformanceConfig: PerformanceConfig = {
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
};

// Uniform sampling: Take every nth point
const uniformSampling = (
  data: ChartDataPoint[],
  targetSize: number
): ChartDataPoint[] => {
  if (data.length <= targetSize) return data;

  const step = Math.floor(data.length / targetSize);
  const sampled: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }

  return sampled;
};

// Adaptive sampling: Higher density in areas with more variation
const adaptiveSampling = (
  data: ChartDataPoint[],
  targetSize: number
): ChartDataPoint[] => {
  if (data.length <= targetSize) return data;

  // Calculate variation for each point (simplified - using first numeric field)
  const numericField = Object.keys(data[0]).find(
    key =>
      typeof data[0][key] === "number" && key !== "generation" && key !== "time"
  );

  if (!numericField) return uniformSampling(data, targetSize);

  const variations: number[] = data.map((point, index) => {
    if (index === 0 || index === data.length - 1) return Infinity; // Always include first and last

    const prev = data[index - 1][numericField] as number;
    const curr = point[numericField] as number;
    const next = data[index + 1][numericField] as number;

    // Calculate local variation
    return Math.abs(curr - prev) + Math.abs(next - curr);
  });

  // Sort by variation and take top points
  const indexedVariations = variations.map((variation, index) => ({
    variation,
    index,
  }));
  indexedVariations.sort((a, b) => b.variation - a.variation);

  const selectedIndices = indexedVariations
    .slice(0, targetSize)
    .map(item => item.index)
    .sort((a, b) => a - b);

  return selectedIndices.map(index => data[index]);
};

// Priority sampling: Preserve important data points (resistance thresholds, mutations)
const prioritySampling = (
  data: ChartDataPoint[],
  targetSize: number
): ChartDataPoint[] => {
  if (data.length <= targetSize) return data;

  const priorities: Array<{ index: number; priority: number }> = data.map(
    (point, index) => {
      let priority = 0;

      // Higher priority for first and last points
      if (index === 0 || index === data.length - 1) priority += 1000;

      // Higher priority for resistance threshold crossings
      if (typeof point.resistanceFrequency === "number") {
        const resistance = point.resistanceFrequency;
        if (resistance > 0.5 && resistance < 0.6) priority += 500; // Near 50% threshold
        if (resistance > 0.9) priority += 300; // High resistance
      }

      // Higher priority for mutation events
      if (
        typeof point.mutationEvents === "number" &&
        point.mutationEvents > 0
      ) {
        priority += point.mutationEvents * 50;
      }

      // Higher priority for population crashes or booms
      if (typeof point.populationSize === "number") {
        const prev = index > 0 ? (data[index - 1].populationSize as number) : 0;
        if (prev > 0) {
          const change = Math.abs((point.populationSize - prev) / prev);
          if (change > 0.5) priority += 200; // Significant population change
        }
      }

      return { index, priority };
    }
  );

  // Sort by priority and take top points
  priorities.sort((a, b) => b.priority - a.priority);
  const selectedIndices = priorities
    .slice(0, targetSize)
    .map(item => item.index)
    .sort((a, b) => a - b);

  return selectedIndices.map(index => data[index]);
};

// Outlier-preserving sampling: Maintain statistical outliers
const outlierPreservingSampling = (
  data: ChartDataPoint[],
  targetSize: number
): ChartDataPoint[] => {
  if (data.length <= targetSize) return data;

  const numericFields = Object.keys(data[0]).filter(
    key =>
      typeof data[0][key] === "number" && key !== "generation" && key !== "time"
  );

  if (numericFields.length === 0) return uniformSampling(data, targetSize);

  // Calculate statistical outliers for each numeric field
  const outlierIndices = new Set<number>();

  numericFields.forEach(field => {
    const values = data
      .map(point => point[field] as number)
      .filter(v => v !== null && v !== undefined);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    data.forEach((point, index) => {
      const value = point[field] as number;
      if (Math.abs(value - mean) > 2 * stdDev) {
        outlierIndices.add(index);
      }
    });
  });

  // Always include first and last points
  outlierIndices.add(0);
  outlierIndices.add(data.length - 1);

  // If we have enough outliers, use them; otherwise, fill with uniform sampling
  const outlierArray = Array.from(outlierIndices).sort((a, b) => a - b);

  if (outlierArray.length >= targetSize) {
    return outlierArray.slice(0, targetSize).map(index => data[index]);
  }

  // Fill remaining spots with uniform sampling from non-outlier points
  const nonOutlierIndices = data
    .map((_, index) => index)
    .filter(index => !outlierIndices.has(index));

  const remainingNeeded = targetSize - outlierArray.length;
  const step = Math.floor(nonOutlierIndices.length / remainingNeeded);

  for (
    let i = 0;
    i < remainingNeeded && i * step < nonOutlierIndices.length;
    i++
  ) {
    outlierArray.push(nonOutlierIndices[i * step]);
  }

  return outlierArray.sort((a, b) => a - b).map(index => data[index]);
};

// Data sampling function
const sampleData = (
  data: ChartDataPoint[],
  strategy: SamplingStrategy,
  targetSize: number
): ChartDataPoint[] => {
  switch (strategy) {
    case "uniform":
      return uniformSampling(data, targetSize);
    case "adaptive":
      return adaptiveSampling(data, targetSize);
    case "priority":
      return prioritySampling(data, targetSize);
    case "outlier-preserving":
      return outlierPreservingSampling(data, targetSize);
    default:
      return uniformSampling(data, targetSize);
  }
};

// Progressive loading hook
const useProgressiveLoading = (
  data: ChartDataPoint[],
  config: PerformanceConfig
) => {
  const [loadedData, setLoadedData] = React.useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadProgress, setLoadProgress] = React.useState(0);

  React.useEffect(() => {
    if (!config.enableProgressiveLoading) {
      setLoadedData(data);
      setLoadProgress(100);
      return;
    }

    setIsLoading(true);
    setLoadProgress(0);

    const chunkSize = config.chunkSize || 100;
    let currentIndex = 0;

    const loadNextChunk = () => {
      const nextChunk = data.slice(currentIndex, currentIndex + chunkSize);
      setLoadedData(prev => [...prev, ...nextChunk]);
      currentIndex += chunkSize;

      const progress = Math.min(100, (currentIndex / data.length) * 100);
      setLoadProgress(progress);

      if (currentIndex < data.length) {
        setTimeout(loadNextChunk, config.loadingDelay || 16);
      } else {
        setIsLoading(false);
      }
    };

    setLoadedData([]);
    loadNextChunk();
  }, [data, config]);

  return { loadedData, isLoading, loadProgress };
};

// Windowing hook
const useWindowing = (data: ChartDataPoint[], config: PerformanceConfig) => {
  const [currentWindow, setCurrentWindow] = React.useState(0);

  const windowSize = config.windowSize || 500;
  const windowOverlap = config.windowOverlap || 50;
  const totalWindows = Math.ceil(
    (data.length - windowOverlap) / (windowSize - windowOverlap)
  );

  const windowedData = React.useMemo(() => {
    if (!config.enableWindowing) {
      return data;
    }

    const start = currentWindow * (windowSize - windowOverlap);
    const end = start + windowSize;
    return data.slice(start, end);
  }, [data, currentWindow, windowSize, windowOverlap, config.enableWindowing]);

  const nextWindow = React.useCallback(() => {
    setCurrentWindow(prev => Math.min(prev + 1, totalWindows - 1));
  }, [totalWindows]);

  const prevWindow = React.useCallback(() => {
    setCurrentWindow(prev => Math.max(prev - 1, 0));
  }, []);

  const goToWindow = React.useCallback(
    (windowIndex: number) => {
      setCurrentWindow(Math.max(0, Math.min(windowIndex, totalWindows - 1)));
    },
    [totalWindows]
  );

  return {
    windowedData,
    currentWindow,
    totalWindows,
    nextWindow,
    prevWindow,
    goToWindow,
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = (
  enabled: boolean = false
): {
  metrics: PerformanceMetrics;
  startProfiling: (label: string) => void;
  endProfiling: (label: string) => void;
  recordMetric: (key: keyof PerformanceMetrics, value: number) => void;
} => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({
    dataProcessingTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    totalDataPoints: 0,
    visibleDataPoints: 0,
    samplingRatio: 1,
    lastUpdateTime: Date.now(),
  });

  const profilingTimes = React.useRef<Map<string, number>>(new Map());

  const startProfiling = React.useCallback(
    (label: string) => {
      if (!enabled) return;
      profilingTimes.current.set(label, performance.now());
    },
    [enabled]
  );

  const endProfiling = React.useCallback(
    (label: string) => {
      if (!enabled) return;

      const startTime = profilingTimes.current.get(label);
      if (startTime) {
        const duration = performance.now() - startTime;
        profilingTimes.current.delete(label);

        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

        // Update relevant metrics
        if (label.includes("data")) {
          setMetrics(prev => ({ ...prev, dataProcessingTime: duration }));
        } else if (label.includes("render")) {
          setMetrics(prev => ({ ...prev, renderTime: duration }));
        }
      }
    },
    [enabled]
  );

  const recordMetric = React.useCallback(
    (key: keyof PerformanceMetrics, value: number) => {
      if (!enabled) return;

      setMetrics(prev => ({
        ...prev,
        [key]: value,
        lastUpdateTime: Date.now(),
      }));
    },
    [enabled]
  );

  // Monitor memory usage
  React.useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if ("memory" in performance) {
        const memInfo = (performance as { memory?: { usedJSHeapSize: number } })
          .memory;
        if (memInfo) {
          recordMetric("memoryUsage", memInfo.usedJSHeapSize / 1024 / 1024); // MB
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, recordMetric]);

  return { metrics, startProfiling, endProfiling, recordMetric };
};

// Memoized data processing hook
export const useMemoizedDataProcessing = <T extends ChartDataPoint>(
  data: T[],
  processor: (data: T[]) => T[],
  dependencies: React.DependencyList = [],
  threshold: number = 100
) => {
  return React.useMemo(() => {
    // Skip memoization for small datasets
    if (data.length < threshold) {
      return processor(data);
    }

    return processor(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, processor, threshold, dependencies]);
};

// Debounced data update hook
export const useDebouncedDataUpdate = <T,>(
  value: T,
  delay: number = 100
): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// High-performance chart data hook
export const useHighPerformanceChartData = (
  data: ChartDataPoint[],
  config: PerformanceConfig = {}
) => {
  const mergedConfig = { ...defaultPerformanceConfig, ...config };
  const { enableProfiling, enableSampling, maxDataPoints, samplingStrategy } =
    mergedConfig;

  const { metrics, startProfiling, endProfiling, recordMetric } =
    usePerformanceMonitor(enableProfiling);
  const { loadedData, isLoading, loadProgress } = useProgressiveLoading(
    data,
    mergedConfig
  );
  const {
    windowedData,
    currentWindow,
    totalWindows,
    nextWindow,
    prevWindow,
    goToWindow,
  } = useWindowing(loadedData, mergedConfig);

  // Apply sampling if needed
  const processedData = React.useMemo(() => {
    startProfiling("data-processing");

    let result = windowedData;

    if (enableSampling && result.length > maxDataPoints!) {
      result = sampleData(result, samplingStrategy!, maxDataPoints!);
    }

    // Record metrics
    recordMetric("totalDataPoints", data.length);
    recordMetric("visibleDataPoints", result.length);
    recordMetric("samplingRatio", result.length / Math.max(data.length, 1));

    endProfiling("data-processing");
    return result;
  }, [
    windowedData,
    enableSampling,
    maxDataPoints,
    samplingStrategy,
    startProfiling,
    endProfiling,
    recordMetric,
    data.length,
  ]);

  // Debounce data updates for performance
  const debouncedData = useDebouncedDataUpdate(
    processedData,
    mergedConfig.debounceDelay
  );

  return {
    data: debouncedData,
    isLoading,
    loadProgress,
    currentWindow,
    totalWindows,
    nextWindow,
    prevWindow,
    goToWindow,
    metrics,
  };
};

// Performance optimization utilities
export const PerformanceUtils = {
  // Calculate optimal chunk size based on data size and device capabilities
  calculateOptimalChunkSize: (
    dataSize: number,
    deviceMemory?: number
  ): number => {
    const baseChunkSize = 100;
    const memoryMultiplier = deviceMemory ? Math.min(deviceMemory / 4, 4) : 1;
    const sizeMultiplier = Math.max(1, Math.log10(dataSize / 1000));

    return Math.floor((baseChunkSize * memoryMultiplier) / sizeMultiplier);
  },

  // Estimate memory usage for dataset
  estimateMemoryUsage: (data: ChartDataPoint[]): number => {
    if (data.length === 0) return 0;

    const samplePoint = data[0];
    const pointSize = JSON.stringify(samplePoint).length * 2; // Rough estimate in bytes
    return (data.length * pointSize) / 1024 / 1024; // Convert to MB
  },

  // Determine if virtualization is needed
  shouldUseVirtualization: (
    dataSize: number,
    threshold: number = 5000
  ): boolean => {
    return dataSize > threshold;
  },

  // Calculate sampling ratio for target performance
  calculateSamplingRatio: (dataSize: number, targetSize: number): number => {
    return Math.min(1, targetSize / dataSize);
  },
};

// Default export for the module
const ChartPerformance = {
  useHighPerformanceChartData,
  usePerformanceMonitor,
  useMemoizedDataProcessing,
  useDebouncedDataUpdate,
  PerformanceUtils,
};

export default ChartPerformance;
