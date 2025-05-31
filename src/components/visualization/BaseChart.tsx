"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// Common chart configuration interface
export interface ChartConfig {
  width?: string | number;
  height?: number;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  theme?: "light" | "dark" | "auto";
  responsive?: boolean;
}

// Common chart data point interface
export interface ChartDataPoint {
  [key: string]: string | number | boolean | null | undefined;
}

// Base chart props interface
export interface BaseChartProps {
  data: ChartDataPoint[];
  config?: ChartConfig;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

// Default chart configuration
const defaultConfig: ChartConfig = {
  width: "100%",
  height: 400,
  margin: {
    top: 20,
    right: 30,
    bottom: 20,
    left: 20,
  },
  theme: "auto",
  responsive: true,
};

// Chart theme colors
export const chartTheme = {
  light: {
    grid: "#f0f0f0",
    text: "#374151",
    accent: "#3b82f6",
    background: "#ffffff",
    border: "#e5e7eb",
  },
  dark: {
    grid: "#374151",
    text: "#d1d5db",
    accent: "#60a5fa",
    background: "#1f2937",
    border: "#4b5563",
  },
};

// Error component
const ChartError: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center h-64 border border-red-200 bg-red-50 rounded-lg">
    <div className="text-center">
      <div className="text-red-600 mb-2">⚠️</div>
      <p className="text-red-700 font-medium">Chart Error</p>
      <p className="text-red-600 text-sm mt-1">{message}</p>
    </div>
  </div>
);

// Loading component
const ChartLoading: React.FC = () => (
  <div className="flex items-center justify-center h-64 border border-gray-200 bg-gray-50 rounded-lg animate-pulse">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-gray-600">Loading chart data...</p>
    </div>
  </div>
);

// Chart container component
const ChartContainer: React.FC<{
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}> = ({ config, className, children }) => {
  if (config.responsive) {
    return (
      <ResponsiveContainer
        width={config.width}
        height={config.height}
        className={className}
      >
        {children as React.ReactElement}
      </ResponsiveContainer>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: config.width,
        height: config.height,
      }}
    >
      {children}
    </div>
  );
};

// Base chart component
export const BaseChart: React.FC<BaseChartProps> = ({
  data,
  config = {},
  loading = false,
  error,
  title,
  description,
  className,
  children,
}) => {
  const mergedConfig = React.useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  const containerClassName = cn(
    "chart-container bg-white border border-gray-200 rounded-lg p-4",
    className
  );

  // Handle loading state
  if (loading) {
    return (
      <div className={containerClassName}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        )}
        <ChartLoading />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={containerClassName}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        )}
        <ChartError message={error} />
      </div>
    );
  }

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className={containerClassName}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-center h-64 border border-gray-200 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400 mb-2">📊</div>
            <p className="text-gray-600">No data available</p>
            <p className="text-gray-500 text-sm mt-1">
              Data will appear when the simulation starts
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <ChartContainer config={mergedConfig} className="chart-content">
        {children}
      </ChartContainer>
    </div>
  );
};

// Utility hook for chart data processing
export const useChartData = <T extends ChartDataPoint>(
  rawData: T[],
  processor?: (data: T[]) => T[]
) => {
  return React.useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    return processor ? processor(rawData) : rawData;
  }, [rawData, processor]);
};

// Utility hook for chart configuration
export const useChartConfig = (
  baseConfig: ChartConfig,
  overrides?: Partial<ChartConfig>
) => {
  return React.useMemo(
    () => ({ ...baseConfig, ...overrides }),
    [baseConfig, overrides]
  );
};
