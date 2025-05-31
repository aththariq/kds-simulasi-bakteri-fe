"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useVisualizationConfig } from "./hooks/useVisualizationConfig";
import { Eye } from "lucide-react";

// Sample data for preview
const generateSampleData = (points: number = 20) => {
  return Array.from({ length: points }, (_, i) => ({
    time: i * 10,
    population: Math.floor(Math.random() * 1000) + 500,
    resistant: Math.floor(Math.random() * 300) + 100,
    susceptible: Math.floor(Math.random() * 700) + 300,
    generation: i + 1,
  }));
};

export interface ConfigurationPreviewProps {
  className?: string;
}

export const ConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({
  className = "",
}) => {
  const { config } = useVisualizationConfig();

  const sampleData = useMemo(
    () => generateSampleData(config.data.bufferSize > 100 ? 20 : 15),
    [config.data.bufferSize]
  );

  const chartProps = useMemo(() => {
    const baseProps = {
      data: sampleData,
      margin: {
        top: config.layout.cardPadding,
        right: config.layout.cardPadding,
        bottom: config.layout.cardPadding,
        left: config.layout.cardPadding,
      },
    };

    const animationProps = config.chart.animation.enabled
      ? {
          animationDuration: config.chart.animation.duration,
          animationEasing: config.chart.animation.easing as
            | "ease"
            | "ease-in"
            | "ease-out"
            | "ease-in-out"
            | "linear",
        }
      : {
          animationDuration: 0,
        };

    return { ...baseProps, ...animationProps };
  }, [config, sampleData]);

  const axisProps = {
    axisLine: { stroke: config.theme.colors.text },
    tickLine: { stroke: config.theme.colors.text },
    tick: { fill: config.theme.colors.text, fontSize: 12 },
  };

  const gridProps = config.chart.grid.show
    ? {
        stroke: config.theme.mode === "dark" ? "#374151" : "#e5e7eb",
        strokeDasharray: "3 3",
        opacity: 0.5,
      }
    : undefined;

  const tooltipProps = config.chart.tooltip.enabled
    ? {
        contentStyle: {
          backgroundColor: config.theme.colors.background,
          border: `1px solid ${config.theme.colors.primary}`,
          borderRadius: "6px",
          color: config.theme.colors.text,
        },
        labelStyle: { color: config.theme.colors.text },
      }
    : undefined;

  const legendProps = config.chart.legend.show
    ? {
        wrapperStyle: { color: config.theme.colors.text },
      }
    : undefined;

  const renderChart = () => {
    const commonElements = (
      <>
        <XAxis
          dataKey="time"
          {...axisProps}
          label={{
            value: "Time (hours)",
            position: "insideBottom",
            offset: -5,
            fill: config.theme.colors.text,
          }}
        />
        <YAxis
          {...axisProps}
          label={{
            value: "Population",
            angle: -90,
            position: "insideLeft",
            fill: config.theme.colors.text,
          }}
        />
        {config.chart.grid.show && <CartesianGrid {...gridProps} />}
        {config.chart.tooltip.enabled && <Tooltip {...tooltipProps} />}
        {config.chart.legend.show && <Legend {...legendProps} />}
      </>
    );

    switch (config.chart.type) {
      case "area":
        return (
          <AreaChart {...chartProps}>
            {commonElements}
            <Area
              type="monotone"
              dataKey="population"
              stackId="1"
              stroke={config.theme.colors.primary}
              fill={config.theme.colors.primary}
              fillOpacity={0.3}
              name="Total Population"
            />
            <Area
              type="monotone"
              dataKey="resistant"
              stackId="2"
              stroke={config.theme.chart.resistantPopulation}
              fill={config.theme.chart.resistantPopulation}
              fillOpacity={0.3}
              name="Resistant"
            />
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart {...chartProps}>
            {commonElements}
            <Bar
              dataKey="population"
              fill={config.theme.colors.primary}
              name="Total Population"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="resistant"
              fill={config.theme.chart.resistantPopulation}
              name="Resistant"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        );

      case "scatter":
        return (
          <ScatterChart {...chartProps}>
            {commonElements}
            <Scatter
              dataKey="population"
              fill={config.theme.colors.primary}
              name="Population Distribution"
            />
          </ScatterChart>
        );

      case "line":
      default:
        return (
          <LineChart {...chartProps}>
            {commonElements}
            <Line
              type="monotone"
              dataKey="population"
              stroke={config.theme.colors.primary}
              strokeWidth={2}
              dot={{ fill: config.theme.colors.primary, strokeWidth: 0, r: 3 }}
              activeDot={{
                r: 5,
                stroke: config.theme.colors.primary,
                strokeWidth: 2,
              }}
              name="Total Population"
            />
            <Line
              type="monotone"
              dataKey="resistant"
              stroke={config.theme.chart.resistantPopulation}
              strokeWidth={2}
              dot={{
                fill: config.theme.chart.resistantPopulation,
                strokeWidth: 0,
                r: 3,
              }}
              activeDot={{
                r: 5,
                stroke: config.theme.chart.resistantPopulation,
                strokeWidth: 2,
              }}
              name="Resistant Bacteria"
            />
            <Line
              type="monotone"
              dataKey="susceptible"
              stroke={config.theme.colors.secondary}
              strokeWidth={2}
              dot={{
                fill: config.theme.colors.secondary,
                strokeWidth: 0,
                r: 3,
              }}
              activeDot={{
                r: 5,
                stroke: config.theme.colors.secondary,
                strokeWidth: 2,
              }}
              name="Susceptible Bacteria"
            />
          </LineChart>
        );
    }
  };

  const previewStyle = {
    backgroundColor: config.theme.colors.background,
    color: config.theme.colors.text,
    aspectRatio: config.layout.responsive.aspectRatio.default,
    padding: config.layout.containerSpacing,
  };

  return (
    <Card
      className={`w-full ${className}`}
      style={{ borderColor: config.theme.colors.primary }}
    >
      <CardHeader style={{ backgroundColor: config.theme.colors.background }}>
        <CardTitle
          className="flex items-center gap-2"
          style={{ color: config.theme.colors.text }}
        >
          <Eye className="h-5 w-5" />
          Configuration Preview
        </CardTitle>
        <CardDescription style={{ color: config.theme.colors.textSecondary }}>
          Live preview of your visualization configuration
        </CardDescription>
      </CardHeader>

      <CardContent style={{ backgroundColor: config.theme.colors.background }}>
        <div className="space-y-4">
          {/* Configuration Summary */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              style={{
                borderColor: config.theme.colors.primary,
                color: config.theme.colors.text,
              }}
            >
              Theme: {config.theme.mode}
            </Badge>
            <Badge
              variant="outline"
              style={{
                borderColor: config.theme.colors.primary,
                color: config.theme.colors.text,
              }}
            >
              Chart: {config.chart.type}
            </Badge>
            <Badge
              variant="outline"
              style={{
                borderColor: config.theme.colors.primary,
                color: config.theme.colors.text,
              }}
            >
              Animation:{" "}
              {config.chart.animation.enabled
                ? `${config.chart.animation.duration}ms`
                : "OFF"}
            </Badge>
            <Badge
              variant="outline"
              style={{
                borderColor: config.theme.colors.primary,
                color: config.theme.colors.text,
              }}
            >
              Buffer: {config.data.bufferSize} points
            </Badge>
            <Badge
              variant="outline"
              style={{
                borderColor: config.theme.colors.primary,
                color: config.theme.colors.text,
              }}
            >
              Refresh: {config.data.refreshInterval}ms
            </Badge>
          </div>

          {/* Chart Preview */}
          <div
            className="border rounded-lg overflow-hidden"
            style={previewStyle}
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>

          {/* Configuration Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div
                className="font-medium"
                style={{ color: config.theme.colors.text }}
              >
                Colors
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: config.theme.colors.primary }}
                  />
                  <span style={{ color: config.theme.colors.textSecondary }}>
                    Primary
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: config.theme.colors.secondary }}
                  />
                  <span style={{ color: config.theme.colors.textSecondary }}>
                    Secondary
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{
                      backgroundColor: config.theme.chart.resistantPopulation,
                    }}
                  />
                  <span style={{ color: config.theme.colors.textSecondary }}>
                    Error
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div
                className="font-medium"
                style={{ color: config.theme.colors.text }}
              >
                Layout
              </div>
              <div
                className="space-y-1"
                style={{ color: config.theme.colors.textSecondary }}
              >
                <div>
                  Ratio: {config.layout.responsive.aspectRatio.default}:1
                </div>
                <div>Container: {config.layout.containerSpacing}px</div>
                <div>Card: {config.layout.cardPadding}px</div>
              </div>
            </div>

            <div>
              <div
                className="font-medium"
                style={{ color: config.theme.colors.text }}
              >
                Features
              </div>
              <div
                className="space-y-1"
                style={{ color: config.theme.colors.textSecondary }}
              >
                <div>Grid: {config.chart.grid.show ? "ON" : "OFF"}</div>
                <div>Legend: {config.chart.legend.show ? "ON" : "OFF"}</div>
                <div>
                  Tooltip: {config.chart.tooltip.enabled ? "ON" : "OFF"}
                </div>
              </div>
            </div>

            <div>
              <div
                className="font-medium"
                style={{ color: config.theme.colors.text }}
              >
                Data
              </div>
              <div
                className="space-y-1"
                style={{ color: config.theme.colors.textSecondary }}
              >
                <div>Precision: {config.data.precision} decimals</div>
                <div>Export: {config.data.exportFormat}</div>
                <div>Auto: {config.data.autoExport ? "ON" : "OFF"}</div>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          {config.performance && (
            <div
              className="pt-4 border-t"
              style={{ borderColor: config.theme.colors.primary + "30" }}
            >
              <div
                className="font-medium mb-2"
                style={{ color: config.theme.colors.text }}
              >
                Performance Status
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={
                    config.performance.enableOptimizations
                      ? "default"
                      : "secondary"
                  }
                  style={{
                    backgroundColor: config.performance.enableOptimizations
                      ? config.theme.colors.primary
                      : config.theme.colors.textSecondary,
                    color: config.theme.colors.background,
                  }}
                >
                  Optimizations{" "}
                  {config.performance.enableOptimizations
                    ? "Enabled"
                    : "Disabled"}
                </Badge>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: config.theme.colors.primary,
                    color: config.theme.colors.text,
                  }}
                >
                  Buffer Limit: {config.data.bufferSize}
                </Badge>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: config.theme.colors.primary,
                    color: config.theme.colors.text,
                  }}
                >
                  Update Debounce: {config.performance.debounceMs}ms
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
