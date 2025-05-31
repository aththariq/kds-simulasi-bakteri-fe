"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Monitor,
  Tv,
} from "lucide-react";
import { useTheme } from "./ChartTheme";

// Device type detection
export type DeviceType = "mobile" | "tablet" | "desktop" | "large";
export type Orientation = "portrait" | "landscape";

// Responsive configuration
export interface ResponsiveConfig {
  // Breakpoint-based configurations
  mobile: {
    chartHeight: number;
    showToolbar: boolean;
    showLegend: boolean;
    fontSize: string;
    padding: number;
  };
  tablet: {
    chartHeight: number;
    showToolbar: boolean;
    showLegend: boolean;
    fontSize: string;
    padding: number;
  };
  desktop: {
    chartHeight: number;
    showToolbar: boolean;
    showLegend: boolean;
    fontSize: string;
    padding: number;
  };
  large: {
    chartHeight: number;
    showToolbar: boolean;
    showLegend: boolean;
    fontSize: string;
    padding: number;
  };
}

// Default responsive configuration
const defaultResponsiveConfig: ResponsiveConfig = {
  mobile: {
    chartHeight: 250,
    showToolbar: false,
    showLegend: false,
    fontSize: "12px",
    padding: 8,
  },
  tablet: {
    chartHeight: 350,
    showToolbar: true,
    showLegend: true,
    fontSize: "14px",
    padding: 12,
  },
  desktop: {
    chartHeight: 450,
    showToolbar: true,
    showLegend: true,
    fontSize: "14px",
    padding: 16,
  },
  large: {
    chartHeight: 600,
    showToolbar: true,
    showLegend: true,
    fontSize: "16px",
    padding: 20,
  },
};

// Container props
export interface ResponsiveChartContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  responsiveConfig?: Partial<ResponsiveConfig>;

  // Layout options
  allowFullscreen?: boolean;
  maintainAspectRatio?: boolean;
  aspectRatio?: number; // width/height ratio

  // Content options
  toolbar?: React.ReactNode;
  legend?: React.ReactNode;
  footer?: React.ReactNode;

  // Callbacks
  onDeviceChange?: (device: DeviceType, orientation: Orientation) => void;
  onResize?: (width: number, height: number) => void;
}

// Device type detection hook
const useDeviceDetection = () => {
  const [deviceType, setDeviceType] = React.useState<DeviceType>("desktop");
  const [orientation, setOrientation] =
    React.useState<Orientation>("landscape");
  const [windowSize, setWindowSize] = React.useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  React.useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({ width, height });
      setOrientation(width > height ? "landscape" : "portrait");

      if (width < 640) {
        setDeviceType("mobile");
      } else if (width < 1024) {
        setDeviceType("tablet");
      } else if (width < 1536) {
        setDeviceType("desktop");
      } else {
        setDeviceType("large");
      }
    };

    detectDevice();
    window.addEventListener("resize", detectDevice);
    window.addEventListener("orientationchange", detectDevice);

    return () => {
      window.removeEventListener("resize", detectDevice);
      window.removeEventListener("orientationchange", detectDevice);
    };
  }, []);

  return { deviceType, orientation, windowSize };
};

// Responsive chart container component
export const ResponsiveChartContainer: React.FC<
  ResponsiveChartContainerProps
> = ({
  children,
  title,
  description,
  className = "",
  responsiveConfig,
  allowFullscreen = true,
  maintainAspectRatio = false,
  aspectRatio = 16 / 9,
  toolbar,
  legend,
  footer,
  onDeviceChange,
  onResize,
}) => {
  const { theme } = useTheme();
  const { deviceType, orientation, windowSize } = useDeviceDetection();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Merge responsive configuration
  const config = React.useMemo(
    () => ({
      ...defaultResponsiveConfig,
      ...responsiveConfig,
    }),
    [responsiveConfig]
  );

  // Get current device configuration
  const currentConfig = config[deviceType];

  // Calculate responsive dimensions
  const dimensions = React.useMemo(() => {
    const containerWidth = isFullscreen
      ? windowSize.width
      : windowSize.width * 0.9;

    let chartHeight = currentConfig.chartHeight;
    let chartWidth = containerWidth - currentConfig.padding * 2;

    if (maintainAspectRatio) {
      const calculatedHeight = chartWidth / aspectRatio;
      chartHeight = Math.min(chartHeight, calculatedHeight);
      chartWidth = chartHeight * aspectRatio;
    }

    // Adjust for mobile orientation
    if (deviceType === "mobile" && orientation === "landscape") {
      chartHeight = Math.min(chartHeight, windowSize.height * 0.6);
    }

    return {
      width: chartWidth,
      height: chartHeight,
      padding: currentConfig.padding,
    };
  }, [
    deviceType,
    orientation,
    windowSize,
    isFullscreen,
    currentConfig,
    maintainAspectRatio,
    aspectRatio,
  ]);

  // Notify parent of device changes
  React.useEffect(() => {
    onDeviceChange?.(deviceType, orientation);
  }, [deviceType, orientation, onDeviceChange]);

  // Notify parent of size changes
  React.useEffect(() => {
    onResize?.(dimensions.width, dimensions.height);
  }, [dimensions.width, dimensions.height, onResize]);

  // Device type icon
  const DeviceIcon = React.useMemo(() => {
    switch (deviceType) {
      case "mobile":
        return Smartphone;
      case "tablet":
        return Tablet;
      case "desktop":
        return Monitor;
      case "large":
        return Tv;
      default:
        return Monitor;
    }
  }, [deviceType]);

  // Responsive styles
  const containerStyles = React.useMemo(
    () => ({
      padding: dimensions.padding,
      fontSize: currentConfig.fontSize,
      fontFamily: theme.typography.fontFamily,
      ...(isFullscreen && {
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: theme.colors.chart.background,
      }),
    }),
    [dimensions.padding, currentConfig.fontSize, theme, isFullscreen]
  );

  // Chart wrapper styles
  const chartWrapperStyles = React.useMemo(
    () => ({
      width: dimensions.width,
      height: dimensions.height,
      margin: "0 auto",
      position: "relative" as const,
    }),
    [dimensions]
  );

  return (
    <div
      ref={containerRef}
      className={`responsive-chart-container ${className}`}
      style={containerStyles}
    >
      <Card className="h-full">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <CardTitle
                  className="flex items-center gap-2"
                  style={{ fontSize: currentConfig.fontSize }}
                >
                  {title}
                </CardTitle>
              )}
              {description && (
                <p
                  className="text-gray-600 mt-1"
                  style={{
                    fontSize: `calc(${currentConfig.fontSize} * 0.875)`,
                  }}
                >
                  {description}
                </p>
              )}
            </div>

            {/* Device Info and Controls */}
            <div className="flex items-center gap-2">
              {/* Device Type Indicator */}
              <Badge variant="outline" className="text-xs">
                <DeviceIcon className="h-3 w-3 mr-1" />
                {deviceType}
                {deviceType === "mobile" && (
                  <span className="ml-1">
                    ({orientation === "portrait" ? "↕" : "↔"})
                  </span>
                )}
              </Badge>

              {/* Resolution Info */}
              <Badge variant="outline" className="text-xs font-mono">
                {Math.round(dimensions.width)}×{Math.round(dimensions.height)}
              </Badge>

              {/* Fullscreen Toggle */}
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

          {/* Toolbar */}
          {currentConfig.showToolbar && toolbar && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {toolbar}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Main Chart Area */}
          <div
            className="flex-1 flex items-center justify-center"
            style={chartWrapperStyles}
          >
            <div className="w-full h-full relative">{children}</div>
          </div>

          {/* Legend */}
          {currentConfig.showLegend && legend && (
            <div className="mt-4">{legend}</div>
          )}

          {/* Footer */}
          {footer && <div className="mt-4 border-t pt-3">{footer}</div>}
        </CardContent>
      </Card>

      {/* Mobile-specific optimizations */}
      {deviceType === "mobile" && (
        <style jsx>{`
          .responsive-chart-container .recharts-tooltip-wrapper {
            transform: scale(1.2);
          }
          .responsive-chart-container .recharts-legend-wrapper {
            font-size: 10px !important;
          }
          .responsive-chart-container .recharts-cartesian-axis-tick text {
            font-size: 10px !important;
          }
        `}</style>
      )}
    </div>
  );
};

// Hook for responsive chart behavior
export const useResponsiveChart = () => {
  const { deviceType, orientation, windowSize } = useDeviceDetection();
  const { theme } = useTheme();

  // Get responsive chart configuration
  const chartConfig = React.useMemo(() => {
    switch (deviceType) {
      case "mobile":
        return {
          height: 250,
          fontSize: 12,
          strokeWidth: 1.5,
          dotSize: 3,
          margin: { top: 10, right: 15, bottom: 15, left: 15 },
        };
      case "tablet":
        return {
          height: 350,
          fontSize: 13,
          strokeWidth: 2,
          dotSize: 4,
          margin: { top: 15, right: 20, bottom: 15, left: 20 },
        };
      case "large":
        return {
          height: 600,
          fontSize: 16,
          strokeWidth: 2.5,
          dotSize: 5,
          margin: { top: 25, right: 40, bottom: 25, left: 30 },
        };
      default: // desktop
        return {
          height: 400,
          fontSize: 14,
          strokeWidth: 2,
          dotSize: 4,
          margin: { top: 20, right: 30, bottom: 20, left: 20 },
        };
    }
  }, [deviceType]);

  // Touch-friendly adjustments for mobile
  const interactionConfig = React.useMemo(() => {
    if (deviceType === "mobile") {
      return {
        tooltip: {
          allowEscapeViewBox: { x: true, y: true },
          position: { x: windowSize.width / 2, y: 100 },
        },
        brush: {
          height: 40, // Larger brush area for touch
        },
        zoom: {
          minScale: 0.5,
          maxScale: 5,
        },
      };
    }

    return {
      tooltip: {},
      brush: { height: 30 },
      zoom: { minScale: 0.1, maxScale: 10 },
    };
  }, [deviceType, windowSize]);

  // Performance adjustments based on device
  const performanceConfig = React.useMemo(() => {
    if (deviceType === "mobile") {
      return {
        animation: false,
        dataReduction: true,
        maxDataPoints: 200,
      };
    }

    if (deviceType === "tablet") {
      return {
        animation: true,
        dataReduction: false,
        maxDataPoints: 500,
      };
    }

    return {
      animation: true,
      dataReduction: false,
      maxDataPoints: 1000,
    };
  }, [deviceType]);

  return {
    deviceType,
    orientation,
    windowSize,
    chartConfig,
    interactionConfig,
    performanceConfig,
    theme,
  };
};

// Responsive grid for multiple charts
export interface ResponsiveChartGridProps {
  children: React.ReactNode[];
  className?: string;
}

export const ResponsiveChartGrid: React.FC<ResponsiveChartGridProps> = ({
  children,
  className = "",
}) => {
  const { deviceType } = useDeviceDetection();

  // Grid configuration based on device type
  const gridConfig = React.useMemo(() => {
    switch (deviceType) {
      case "mobile":
        return {
          columns: 1,
          gap: 16,
        };
      case "tablet":
        return {
          columns: children.length === 1 ? 1 : 2,
          gap: 20,
        };
      case "desktop":
        return {
          columns: children.length <= 2 ? children.length : 2,
          gap: 24,
        };
      case "large":
        return {
          columns: Math.min(children.length, 3),
          gap: 32,
        };
      default:
        return {
          columns: 2,
          gap: 24,
        };
    }
  }, [deviceType, children.length]);

  const gridStyles = React.useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: `repeat(${gridConfig.columns}, 1fr)`,
      gap: gridConfig.gap,
      width: "100%",
    }),
    [gridConfig]
  );

  return (
    <div className={`responsive-chart-grid ${className}`} style={gridStyles}>
      {children}
    </div>
  );
};

export default ResponsiveChartContainer;
