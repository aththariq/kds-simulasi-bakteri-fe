"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
} from "lucide-react";

// Tooltip data point interface
export interface TooltipDataPoint {
  name: string;
  value: number | string;
  color?: string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: number;
  format?: "number" | "percentage" | "scientific" | "duration" | "custom";
  customFormatter?: (value: number | string) => string;
  description?: string;
  warning?: string;
  info?: string;
}

// Tooltip payload interface (from Recharts)
export interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
  unit?: string;
}

// Tooltip props interface
export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  dataPoints?: TooltipDataPoint[];
  title?: string;
  showTrends?: boolean;
  showDescription?: boolean;
  compactMode?: boolean;
  className?: string;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number | string, name?: string) => string;
}

// Data formatters
const formatValue = (
  value: number | string,
  format: TooltipDataPoint["format"] = "number",
  customFormatter?: (value: number | string) => string
): string => {
  if (customFormatter) {
    return customFormatter(value);
  }

  if (typeof value === "string") return value;

  switch (format) {
    case "percentage":
      return `${(value * 100).toFixed(2)}%`;
    case "scientific":
      return value.toExponential(2);
    case "duration":
      if (value < 60) return `${value.toFixed(1)}s`;
      if (value < 3600) return `${(value / 60).toFixed(1)}m`;
      return `${(value / 3600).toFixed(1)}h`;
    default:
      return typeof value === "number" ? value.toLocaleString() : String(value);
  }
};

// Generation formatter for bacterial simulation
const formatGeneration = (generation: string | number): string => {
  const gen =
    typeof generation === "string" ? parseInt(generation) : generation;
  if (isNaN(gen)) return String(generation);

  return `Generation ${gen.toLocaleString()}`;
};

// Trend indicator component
const TrendIndicator: React.FC<{
  trend: "up" | "down" | "stable";
  value?: number;
}> = ({ trend, value }) => {
  const getIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const getColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className={`flex items-center gap-1 ${getColor()}`}>
      {getIcon()}
      {value !== undefined && (
        <span className="text-xs">
          {trend === "stable"
            ? "0%"
            : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
        </span>
      )}
    </div>
  );
};

// Data point row component
const DataPointRow: React.FC<{
  dataPoint: TooltipDataPoint;
  showTrends: boolean;
  showDescription: boolean;
  compactMode: boolean;
}> = ({ dataPoint, showTrends, showDescription, compactMode }) => {
  const formattedValue = formatValue(
    dataPoint.value,
    dataPoint.format,
    dataPoint.customFormatter
  );

  return (
    <div className={`space-y-1 ${compactMode ? "py-1" : "py-2"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dataPoint.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dataPoint.color }}
            />
          )}
          <span
            className={`font-medium ${compactMode ? "text-xs" : "text-sm"}`}
          >
            {dataPoint.name}
          </span>
          {dataPoint.warning && (
            <AlertTriangle className="h-3 w-3 text-amber-500" />
          )}
          {dataPoint.info && <Info className="h-3 w-3 text-blue-500" />}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono ${compactMode ? "text-xs" : "text-sm"}`}>
            {formattedValue}
            {dataPoint.unit && (
              <span className="text-gray-500 ml-1">{dataPoint.unit}</span>
            )}
          </span>
          {showTrends && dataPoint.trend && (
            <TrendIndicator
              trend={dataPoint.trend}
              value={dataPoint.trendValue}
            />
          )}
        </div>
      </div>

      {showDescription && dataPoint.description && !compactMode && (
        <p className="text-xs text-gray-600 pl-5">{dataPoint.description}</p>
      )}

      {dataPoint.warning && !compactMode && (
        <div className="flex items-start gap-2 pl-5">
          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">{dataPoint.warning}</p>
        </div>
      )}
    </div>
  );
};

// Main chart tooltip component
export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active = false,
  payload = [],
  label,
  dataPoints,
  title,
  showTrends = true,
  showDescription = true,
  compactMode = false,
  className = "",
  labelFormatter = formatGeneration,
}) => {
  if (!active) return null;

  // Use either provided dataPoints or convert from Recharts payload
  const points: TooltipDataPoint[] =
    dataPoints ||
    payload.map(entry => ({
      name: entry.name || entry.dataKey || "Unknown",
      value: entry.value || 0,
      color: entry.color,
      unit: entry.unit,
      format: "number",
    }));

  if (points.length === 0) return null;

  const formattedLabel = label ? labelFormatter(label) : "";

  return (
    <Card
      className={`tooltip-container shadow-lg border-2 max-w-sm z-50 ${className}`}
    >
      <CardContent className={`${compactMode ? "p-3" : "p-4"}`}>
        {/* Header */}
        <div className="space-y-2">
          {title && (
            <h4
              className={`font-semibold ${
                compactMode ? "text-sm" : "text-base"
              }`}
            >
              {title}
            </h4>
          )}

          {formattedLabel && (
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {formattedLabel}
              </Badge>
            </div>
          )}
        </div>

        {(title || formattedLabel) && <Separator className="my-3" />}

        {/* Data points */}
        <div className="space-y-1">
          {points.map((point, index) => (
            <React.Fragment key={point.name + index}>
              <DataPointRow
                dataPoint={point}
                showTrends={showTrends}
                showDescription={showDescription}
                compactMode={compactMode}
              />
              {index < points.length - 1 && !compactMode && (
                <Separator className="my-2" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Summary section for multiple data points */}
        {points.length > 2 && !compactMode && (
          <>
            <Separator className="my-3" />
            <div className="text-xs text-gray-600">
              Showing {points.length} data series
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized tooltip for bacterial simulation metrics
export const BacterialSimulationTooltip: React.FC<
  ChartTooltipProps & {
    simulationData?: {
      generation: number;
      totalPopulation: number;
      resistantPopulation: number;
      mutationRate: number;
      environmentalStress: number;
      diversityIndex?: number;
    };
  }
> = ({ simulationData, ...props }) => {
  if (!props.active || !simulationData) {
    return <ChartTooltip {...props} />;
  }

  const {
    generation,
    totalPopulation,
    resistantPopulation,
    mutationRate,
    environmentalStress,
    diversityIndex,
  } = simulationData;

  const resistancePercentage =
    totalPopulation > 0 ? (resistantPopulation / totalPopulation) * 100 : 0;

  const dataPoints: TooltipDataPoint[] = [
    {
      name: "Total Population",
      value: totalPopulation,
      format: "number",
      unit: "bacteria",
      color: "#3b82f6",
      description: "Total number of bacteria in the population",
    },
    {
      name: "Resistant Bacteria",
      value: resistantPopulation,
      format: "number",
      unit: "bacteria",
      color: "#ef4444",
      description: "Number of bacteria with resistance genes",
    },
    {
      name: "Resistance Frequency",
      value: resistancePercentage,
      format: "percentage",
      color: "#f97316",
      description: "Percentage of population with resistance",
      warning:
        resistancePercentage > 50 ? "High resistance detected!" : undefined,
    },
    {
      name: "Mutation Rate",
      value: mutationRate,
      format: "scientific",
      unit: "per generation",
      color: "#8b5cf6",
      description: "Rate of genetic mutations occurring",
    },
    {
      name: "Environmental Stress",
      value: environmentalStress,
      format: "percentage",
      color: "#06b6d4",
      description: "Current environmental pressure level",
      warning:
        environmentalStress > 0.8 ? "Extreme stress conditions!" : undefined,
    },
  ];

  if (diversityIndex !== undefined) {
    dataPoints.push({
      name: "Genetic Diversity",
      value: diversityIndex,
      format: "number",
      color: "#10b981",
      description: "Shannon diversity index of genetic variants",
      info: "Higher values indicate greater genetic diversity",
    });
  }

  return (
    <ChartTooltip
      {...props}
      dataPoints={dataPoints}
      title="Bacterial Simulation Metrics"
      label={`Generation ${generation}`}
    />
  );
};

// Export utility functions
export const createTooltipDataPoint = (
  name: string,
  value: number | string,
  options?: Partial<Omit<TooltipDataPoint, "name" | "value">>
): TooltipDataPoint => ({
  name,
  value,
  ...options,
});

// Preset tooltip configurations for different chart types
export const tooltipPresets = {
  population: {
    showTrends: true,
    showDescription: true,
    compactMode: false,
  },
  resistance: {
    showTrends: true,
    showDescription: true,
    compactMode: false,
  },
  mutation: {
    showTrends: false,
    showDescription: true,
    compactMode: true,
  },
  compact: {
    showTrends: false,
    showDescription: false,
    compactMode: true,
  },
};
