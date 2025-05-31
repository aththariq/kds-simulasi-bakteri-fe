/**
 * Frontend Memory Management Hook
 * Provides memory monitoring, cleanup, and resource disposal for React components
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface MemoryManagerConfig {
  enableMonitoring: boolean;
  monitoringInterval: number; // ms
  warningThreshold: number; // MB
  criticalThreshold: number; // MB
  autoCleanup: boolean;
  maxBufferSize: number;
}

interface CleanupFunction {
  (): void | Promise<void>;
}

interface ResourceHandle {
  id: string;
  cleanup: CleanupFunction;
  category: string;
  createdAt: number;
}

interface MemoryPressureCallbacks {
  onWarning?: (metrics: MemoryMetrics) => void;
  onCritical?: (metrics: MemoryMetrics) => void;
  onNormal?: (metrics: MemoryMetrics) => void;
}

const DEFAULT_CONFIG: MemoryManagerConfig = {
  enableMonitoring: true,
  monitoringInterval: 5000,
  warningThreshold: 100, // 100MB
  criticalThreshold: 200, // 200MB
  autoCleanup: true,
  maxBufferSize: 1000,
};

/**
 * Get current memory metrics from browser
 */
const getMemoryMetrics = (): MemoryMetrics | null => {
  if (!("memory" in performance)) {
    return null;
  }

  const memory = (
    performance as {
      memory: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }
  ).memory;
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    timestamp: Date.now(),
  };
};

/**
 * Convert bytes to MB
 */
const bytesToMB = (bytes: number): number => bytes / (1024 * 1024);

/**
 * Memory management hook for React components
 */
export const useMemoryManager = (
  config: Partial<MemoryManagerConfig> = {},
  callbacks: MemoryPressureCallbacks = {}
) => {
  const finalConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  const [memoryState, setMemoryState] = useState<
    "normal" | "warning" | "critical"
  >("normal");
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Track resources and cleanup functions
  const resourcesRef = useRef<Map<string, ResourceHandle>>(new Map());
  const cleanupTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMetricsRef = useRef<MemoryMetrics | null>(null);

  /**
   * Unregister and cleanup a specific resource
   */
  const cleanupResource = useCallback(async (id: string): Promise<boolean> => {
    const handle = resourcesRef.current.get(id);
    if (!handle) {
      return false;
    }

    try {
      await handle.cleanup();
      resourcesRef.current.delete(id);

      // Clear auto-cleanup timeout
      const timeout = cleanupTimeoutsRef.current.get(id);
      if (timeout) {
        clearTimeout(timeout);
        cleanupTimeoutsRef.current.delete(id);
      }

      return true;
    } catch (error) {
      console.error(`Error cleaning up resource ${id}:`, error);
      return false;
    }
  }, []);

  /**
   * Register a new resource for cleanup tracking
   */
  const registerResource = useCallback(
    (
      cleanup: CleanupFunction,
      category: string = "general",
      autoCleanupDelay?: number
    ): string => {
      const id = Math.random().toString(36).substring(2, 15);
      const handle: ResourceHandle = {
        id,
        cleanup,
        category,
        createdAt: Date.now(),
      };

      resourcesRef.current.set(id, handle);

      // Set up auto-cleanup if specified
      if (autoCleanupDelay && autoCleanupDelay > 0) {
        const timeout = setTimeout(() => {
          cleanupResource(id);
        }, autoCleanupDelay);

        cleanupTimeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [cleanupResource]
  );

  /**
   * Cleanup all resources in a category
   */
  const cleanupCategory = useCallback(
    async (category: string): Promise<number> => {
      let cleanedCount = 0;
      const resourcesToCleanup = Array.from(resourcesRef.current.entries())
        .filter(([, handle]) => handle.category === category)
        .map(([id]) => id);

      for (const id of resourcesToCleanup) {
        if (await cleanupResource(id)) {
          cleanedCount++;
        }
      }

      return cleanedCount;
    },
    [cleanupResource]
  );

  /**
   * Cleanup all resources
   */
  const cleanupAll = useCallback(async (): Promise<number> => {
    let cleanedCount = 0;
    const resourceIds = Array.from(resourcesRef.current.keys());

    for (const id of resourceIds) {
      if (await cleanupResource(id)) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  }, [cleanupResource]);

  /**
   * Force garbage collection (if available)
   */
  const forceGC = useCallback(() => {
    if (
      "gc" in window &&
      typeof (window as { gc?: () => void }).gc === "function"
    ) {
      try {
        (window as { gc: () => void }).gc();
        return true;
      } catch (error) {
        console.warn("Failed to force garbage collection:", error);
      }
    }
    return false;
  }, []);

  /**
   * Assess memory pressure state
   */
  const assessMemoryState = useCallback(
    (metrics: MemoryMetrics): "normal" | "warning" | "critical" => {
      const usedMB = bytesToMB(metrics.usedJSHeapSize);

      if (usedMB >= finalConfig.criticalThreshold) {
        return "critical";
      } else if (usedMB >= finalConfig.warningThreshold) {
        return "warning";
      } else {
        return "normal";
      }
    },
    [finalConfig.warningThreshold, finalConfig.criticalThreshold]
  );

  /**
   * Handle memory pressure changes
   */
  const handleMemoryPressure = useCallback(
    async (
      newState: "normal" | "warning" | "critical",
      metrics: MemoryMetrics
    ) => {
      if (newState === memoryState) {
        return;
      }

      setMemoryState(newState);

      // Trigger callbacks
      switch (newState) {
        case "warning":
          callbacks.onWarning?.(metrics);
          if (finalConfig.autoCleanup) {
            // Gentle cleanup - remove oldest resources
            const oldResources = Array.from(resourcesRef.current.entries())
              .filter(([, handle]) => Date.now() - handle.createdAt > 60000) // Older than 1 minute
              .sort(([, a], [, b]) => a.createdAt - b.createdAt)
              .slice(0, Math.ceil(resourcesRef.current.size * 0.1)); // Cleanup 10%

            for (const [id] of oldResources) {
              await cleanupResource(id);
            }
          }
          break;

        case "critical":
          callbacks.onCritical?.(metrics);
          if (finalConfig.autoCleanup) {
            // Aggressive cleanup - remove more resources
            await cleanupCategory("cache");
            await cleanupCategory("temporary");
            forceGC();
          }
          break;

        case "normal":
          callbacks.onNormal?.(metrics);
          break;
      }
    },
    [
      memoryState,
      callbacks,
      finalConfig.autoCleanup,
      cleanupResource,
      cleanupCategory,
      forceGC,
    ]
  );

  /**
   * Monitor memory usage
   */
  const checkMemoryUsage = useCallback(() => {
    const currentMetrics = getMemoryMetrics();
    if (!currentMetrics) {
      return;
    }

    setMetrics(currentMetrics);
    lastMetricsRef.current = currentMetrics;

    const currentState = assessMemoryState(currentMetrics);
    handleMemoryPressure(currentState, currentMetrics);
  }, [assessMemoryState, handleMemoryPressure]);

  /**
   * Start memory monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring || !finalConfig.enableMonitoring) {
      return;
    }

    setIsMonitoring(true);
    monitoringIntervalRef.current = setInterval(
      checkMemoryUsage,
      finalConfig.monitoringInterval
    );

    // Initial check
    checkMemoryUsage();
  }, [
    isMonitoring,
    finalConfig.enableMonitoring,
    finalConfig.monitoringInterval,
    checkMemoryUsage,
  ]);

  /**
   * Stop memory monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) {
      return;
    }

    setIsMonitoring(false);
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, [isMonitoring]);

  /**
   * Get current resource statistics
   */
  const getResourceStats = useCallback(() => {
    const resources = Array.from(resourcesRef.current.values());
    const categories = new Map<string, number>();

    resources.forEach(resource => {
      categories.set(
        resource.category,
        (categories.get(resource.category) || 0) + 1
      );
    });

    return {
      totalResources: resources.length,
      categories: Object.fromEntries(categories),
      oldestResource:
        resources.length > 0
          ? Math.min(...resources.map(r => r.createdAt))
          : null,
    };
  }, []);

  // Auto-start monitoring on mount
  useEffect(() => {
    if (finalConfig.enableMonitoring) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [finalConfig.enableMonitoring, startMonitoring, stopMonitoring]);

  // Cleanup all resources on unmount
  useEffect(() => {
    const currentTimeouts = cleanupTimeoutsRef.current;

    return () => {
      cleanupAll();

      // Clear all timeouts using the captured reference
      currentTimeouts.forEach(timeout => clearTimeout(timeout));
      currentTimeouts.clear();
    };
  }, [cleanupAll]);

  return {
    // State
    metrics,
    memoryState,
    isMonitoring,

    // Resource management
    registerResource,
    cleanupResource,
    cleanupCategory,
    cleanupAll,

    // Memory management
    forceGC,
    checkMemoryUsage,

    // Monitoring control
    startMonitoring,
    stopMonitoring,

    // Statistics
    getResourceStats,

    // Utilities
    bytesToMB,
    isMemoryAPIAvailable: "memory" in performance,
  };
};

/**
 * Hook for managing WebSocket connections with automatic cleanup
 */
export const useWebSocketResource = (
  url: string | null,
  options: { autoCleanupDelay?: number } = {}
) => {
  const { registerResource, cleanupResource } = useMemoryManager();
  const wsRef = useRef<WebSocket | null>(null);
  const resourceIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (!url || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    // Register with memory manager
    if (resourceIdRef.current) {
      cleanupResource(resourceIdRef.current);
    }

    resourceIdRef.current = registerResource(
      () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      },
      "websocket",
      options.autoCleanupDelay
    );

    return ws;
  }, [url, registerResource, cleanupResource, options.autoCleanupDelay]);

  const disconnect = useCallback(() => {
    if (resourceIdRef.current) {
      cleanupResource(resourceIdRef.current);
      resourceIdRef.current = null;
    }
    wsRef.current = null;
  }, [cleanupResource]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, websocket: wsRef.current };
};

/**
 * Hook for managing canvas resources with automatic cleanup
 */
export const useCanvasResource = (
  canvasRef: React.RefObject<HTMLCanvasElement>
) => {
  const { registerResource, cleanupResource } = useMemoryManager();
  const resourceIdRef = useRef<string | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const getContext = useCallback(
    (contextType: "2d" = "2d") => {
      if (!canvasRef.current) {
        return null;
      }

      if (!contextRef.current) {
        const context = canvasRef.current.getContext(contextType);
        contextRef.current = context;

        // Register cleanup
        resourceIdRef.current = registerResource(() => {
          if (context && canvasRef.current) {
            // Clear canvas
            context.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
            contextRef.current = null;
          }
        }, "canvas");
      }

      return contextRef.current;
    },
    [canvasRef, registerResource]
  );

  const clearCanvas = useCallback(() => {
    if (contextRef.current && canvasRef.current) {
      contextRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  }, [canvasRef]);

  const dispose = useCallback(() => {
    if (resourceIdRef.current) {
      cleanupResource(resourceIdRef.current);
      resourceIdRef.current = null;
    }
  }, [cleanupResource]);

  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return { getContext, clearCanvas, dispose };
};

export default useMemoryManager;
