import React, { useState, useEffect, useCallback, useMemo } from "react";
import { visualization, chartConfig, gestures } from "@/lib/responsive";

export type DeviceType = "mobile" | "tablet" | "desktop";
export type ChartType = "heatmap" | "network" | "petriDish" | "line" | "bar";

export interface MobileVisualizationConfig {
  deviceType: DeviceType;
  chartType: ChartType;
  enableTouchGestures: boolean;
  enableSimplifiedView: boolean;
  performanceMode: boolean;
}

export interface TouchGestureState {
  isTouch: boolean;
  isPinching: boolean;
  isSwipe: boolean;
  swipeDirection: "up" | "down" | "left" | "right" | null;
  pinchScale: number;
  lastTouchTime: number;
}

export interface VisualizationDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const useMobileVisualization = (
  chartType: ChartType,
  initialConfig?: Partial<MobileVisualizationConfig>
) => {
  // Device detection
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "landscape"
  );

  // Touch gesture state
  const [touchState, setTouchState] = useState<TouchGestureState>({
    isTouch: false,
    isPinching: false,
    isSwipe: false,
    swipeDirection: null,
    pinchScale: 1,
    lastTouchTime: 0,
  });

  // Configuration
  const config = useMemo<MobileVisualizationConfig>(
    () => ({
      deviceType,
      chartType,
      enableTouchGestures: deviceType === "mobile",
      enableSimplifiedView: deviceType === "mobile",
      performanceMode: deviceType === "mobile",
      ...initialConfig,
    }),
    [deviceType, chartType, initialConfig]
  );
  // Device detection effect
  useEffect(() => {
    const detectDevice = () => {
      if (typeof window === "undefined") return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      setOrientation(width > height ? "landscape" : "portrait");

      if (width < 640) {
        setDeviceType("mobile");
      } else if (width < 1024) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    detectDevice();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", detectDevice);
      window.addEventListener("orientationchange", detectDevice);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", detectDevice);
        window.removeEventListener("orientationchange", detectDevice);
      }
    };
  }, []);
  // Get optimized dimensions based on device type
  const dimensions = useMemo<VisualizationDimensions>(() => {
    const baseDimensions = visualization.dimensions[deviceType];

    // Adjust for orientation on mobile/tablet
    if (deviceType !== "desktop" && orientation === "portrait") {
      const safeWidth =
        typeof window !== "undefined"
          ? window.innerWidth - 40
          : baseDimensions.width;
      return {
        ...baseDimensions,
        width: Math.min(baseDimensions.width, safeWidth),
        height: baseDimensions.height * 0.8,
      };
    }

    const safeWidth =
      typeof window !== "undefined"
        ? window.innerWidth - 40
        : baseDimensions.width;
    return {
      ...baseDimensions,
      width: Math.min(baseDimensions.width, safeWidth),
    };
  }, [deviceType, orientation]);

  // Get chart-specific configuration
  const chartSpecificConfig = useMemo(() => {
    return chartConfig[deviceType][chartType] || {};
  }, [deviceType, chartType]);

  // Get performance settings
  const performanceSettings = useMemo(() => {
    return visualization.performance[deviceType];
  }, [deviceType]);

  // Get simplified view settings
  const simplifiedSettings = useMemo(() => {
    return visualization.simplified[deviceType];
  }, [deviceType]);
  // Touch gesture handlers with React.TouchEvent and native TouchEvent support
  const handleTouchStart = useCallback(
    (event: React.TouchEvent | TouchEvent) => {
      if (!config.enableTouchGestures) return;

      const touches = event.touches;
      const now = Date.now();

      setTouchState(prev => ({
        ...prev,
        isTouch: true,
        lastTouchTime: now,
        isPinching: touches.length === 2,
      }));
    },
    [config.enableTouchGestures]
  );
  const handleTouchMove = useCallback(
    (event: React.TouchEvent | TouchEvent) => {
      if (!config.enableTouchGestures || !touchState.isTouch) return;

      const touches = event.touches;

      if (touches.length === 2 && touchState.isPinching) {
        // Handle pinch gesture
        event.preventDefault();
        // Pinch logic would be implemented here
      }
    },
    [config.enableTouchGestures, touchState.isTouch, touchState.isPinching]
  );
  const handleTouchEnd = useCallback(() => {
    if (!config.enableTouchGestures) return;

    setTouchState(prev => ({
      ...prev,
      isTouch: false,
      isPinching: false,
      isSwipe: false,
      swipeDirection: null,
      pinchScale: 1,
    }));
  }, [config.enableTouchGestures]);
  // Data optimization for mobile performance
  const optimizeDataForMobile = useCallback(
    <T>(data: T[]) => {
      if (!config.performanceMode) return data;

      const maxPoints = performanceSettings.maxDataPoints;

      if (data.length <= maxPoints) return data;

      // Sample data points evenly
      const step = Math.ceil(data.length / maxPoints);
      return data.filter((_, index) => index % step === 0);
    },
    [config.performanceMode, performanceSettings.maxDataPoints]
  );

  // Debounced resize handler
  const [debouncedDimensions, setDebouncedDimensions] = useState(dimensions);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDimensions(dimensions);
    }, performanceSettings.debounceDelay);

    return () => clearTimeout(timer);
  }, [dimensions, performanceSettings.debounceDelay]);
  // Check if touch device
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  // Get responsive font size
  const fontSize = useMemo(() => {
    return simplifiedSettings.fontSize;
  }, [simplifiedSettings.fontSize]);

  // Get animation duration based on performance mode
  const animationDuration = useMemo(() => {
    return config.performanceMode ? performanceSettings.animationDuration : 750;
  }, [config.performanceMode, performanceSettings.animationDuration]);

  return {
    // Device information
    deviceType,
    orientation,
    isTouchDevice,

    // Configuration
    config,

    // Dimensions and layout
    dimensions: debouncedDimensions,
    chartSpecificConfig,

    // Performance settings
    performanceSettings,
    simplifiedSettings,
    animationDuration,
    fontSize,

    // Touch gesture state
    touchState,

    // Utility functions
    optimizeDataForMobile,

    // Touch event handlers (React.TouchEvent compatible)
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },

    // Helper functions
    shouldShowLegend: () => simplifiedSettings.showLegend,
    shouldShowGrid: () => simplifiedSettings.showGrid,
    shouldShowTooltips: () => simplifiedSettings.showTooltips,
    shouldShowAxes: () => simplifiedSettings.showAxes,
    getMaxCategories: () => simplifiedSettings.maxCategories,
  };
};
