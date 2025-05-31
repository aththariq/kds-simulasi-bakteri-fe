"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Grid layout configuration
export interface GridConfig {
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  aspectRatio?: "auto" | "square" | "wide" | "video";
  minHeight?: number;
  maxHeight?: number;
}

// Responsive chart grid props
export interface ResponsiveChartGridProps {
  children: React.ReactNode;
  config?: GridConfig;
  className?: string;
  title?: string;
  description?: string;
}

// Default grid configuration
const defaultGridConfig: GridConfig = {
  columns: {
    default: 1,
    sm: 1,
    md: 2,
    lg: 2,
    xl: 3,
  },
  gap: 6,
  aspectRatio: "auto",
};

// Breakpoint hook for responsive behavior
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = React.useState<string>("default");

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1280) setBreakpoint("xl");
      else if (width >= 1024) setBreakpoint("lg");
      else if (width >= 768) setBreakpoint("md");
      else if (width >= 640) setBreakpoint("sm");
      else setBreakpoint("default");
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return breakpoint;
};

// Chart container for individual charts within the grid
export const ChartGridItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  aspectRatio?: GridConfig["aspectRatio"];
}> = ({ children, className, aspectRatio = "auto" }) => {
  const aspectRatioClasses = {
    auto: "",
    square: "aspect-square",
    wide: "aspect-[16/9]",
    video: "aspect-video",
  };

  return (
    <div
      className={cn(
        "chart-grid-item",
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {children}
    </div>
  );
};

// Main responsive chart grid component
export const ResponsiveChartGrid: React.FC<ResponsiveChartGridProps> = ({
  children,
  config = {},
  className,
  title,
  description,
}) => {
  const mergedConfig = React.useMemo(
    () => ({ ...defaultGridConfig, ...config }),
    [config]
  );

  const breakpoint = useBreakpoint();

  // Get column count for current breakpoint
  const getColumnCount = React.useCallback(() => {
    const columns = mergedConfig.columns!;
    switch (breakpoint) {
      case "xl":
        return (
          columns.xl ||
          columns.lg ||
          columns.md ||
          columns.sm ||
          columns.default
        );
      case "lg":
        return columns.lg || columns.md || columns.sm || columns.default;
      case "md":
        return columns.md || columns.sm || columns.default;
      case "sm":
        return columns.sm || columns.default;
      default:
        return columns.default;
    }
  }, [breakpoint, mergedConfig.columns]);

  const columnCount = getColumnCount();

  // Generate grid classes based on column count
  const gridClasses = React.useMemo(() => {
    const baseClasses = "grid gap-6";
    const columnClasses = {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
      5: "grid-cols-1 md:grid-cols-2 xl:grid-cols-5",
      6: "grid-cols-1 md:grid-cols-2 xl:grid-cols-6",
    };

    const gapClasses = {
      2: "gap-2",
      4: "gap-4",
      6: "gap-6",
      8: "gap-8",
    };

    return cn(
      baseClasses,
      columnClasses[Math.min(columnCount, 6) as keyof typeof columnClasses] ||
        columnClasses[3],
      gapClasses[mergedConfig.gap as keyof typeof gapClasses] || gapClasses[6]
    );
  }, [columnCount, mergedConfig.gap]);

  // Container styles
  const containerStyle = React.useMemo(() => {
    const style: React.CSSProperties = {};

    if (mergedConfig.minHeight) {
      style.minHeight = `${mergedConfig.minHeight}px`;
    }

    if (mergedConfig.maxHeight) {
      style.maxHeight = `${mergedConfig.maxHeight}px`;
    }

    return style;
  }, [mergedConfig.minHeight, mergedConfig.maxHeight]);

  return (
    <div
      className={cn("responsive-chart-grid", className)}
      style={containerStyle}
    >
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          )}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}

      <div className={gridClasses}>
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            // Wrap each child in a grid item if not already wrapped
            if (child.type === ChartGridItem) {
              return child;
            }
            return (
              <ChartGridItem key={index} aspectRatio={mergedConfig.aspectRatio}>
                {child}
              </ChartGridItem>
            );
          }
          return child;
        })}
      </div>
    </div>
  );
};

// Preset configurations for common layouts
export const gridPresets = {
  dashboard: {
    columns: { default: 1, md: 2, xl: 3 },
    gap: 6,
    aspectRatio: "auto" as const,
  },

  monitoring: {
    columns: { default: 1, lg: 2 },
    gap: 8,
    aspectRatio: "wide" as const,
    minHeight: 400,
  },

  comparison: {
    columns: { default: 1, md: 2 },
    gap: 6,
    aspectRatio: "square" as const,
  },

  fullscreen: {
    columns: { default: 1 },
    gap: 0,
    aspectRatio: "auto" as const,
    minHeight: 600,
  },
} as const;

// Hook for managing responsive chart configurations
export const useResponsiveChartConfig = (baseConfig: GridConfig) => {
  const breakpoint = useBreakpoint();

  return React.useMemo(() => {
    // Adjust chart configurations based on screen size
    const adjustedConfig = { ...baseConfig };

    switch (breakpoint) {
      case "default":
      case "sm":
        // Mobile optimizations
        if (adjustedConfig.gap && adjustedConfig.gap > 4) {
          adjustedConfig.gap = 4;
        }
        break;
      case "md":
        // Tablet optimizations
        break;
      case "lg":
      case "xl":
        // Desktop optimizations
        break;
    }

    return adjustedConfig;
  }, [baseConfig, breakpoint]);
};

export default ResponsiveChartGrid;
