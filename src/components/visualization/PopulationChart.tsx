"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import {
  BaseChart,
  ChartConfig,
  ChartDataPoint,
  useChartData,
} from "./BaseChart";

// Population data point interface
export interface PopulationDataPoint extends ChartDataPoint {
  generation: number;
  totalPopulation: number;
  resistantPopulation: number;
  sensitivePopulation: number;
  antibioticConcentration: number;
  timestamp?: string;
}

// Population chart props
export interface PopulationChartProps {
  data: PopulationDataPoint[];
  config?: ChartConfig;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  className?: string;
  chartType?: "line" | "area";
  showAntibiotic?: boolean;
  showLegend?: boolean;
}

// Tooltip payload interface
interface TooltipPayload {
  color: string;
  name: string;
  value: number;
  dataKey: string;
}

// Tooltip props interface
interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}

// Default configuration for population charts
const defaultPopulationConfig: ChartConfig = {
  height: 400,
  margin: {
    top: 20,
    right: 80,
    bottom: 60,
    left: 60,
  },
};

// Custom tooltip component
const PopulationTooltip: React.FC<TooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">Generation: {label}</p>
        {payload.map((entry: TooltipPayload, index: number) => (
          <div key={index} className="flex items-center space-x-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.name}: {entry.value.toLocaleString()}
              {entry.dataKey === "antibioticConcentration" && " μg/mL"}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Population line chart component
const PopulationLineChart: React.FC<{
  data: PopulationDataPoint[];
  showAntibiotic: boolean;
  showLegend: boolean;
}> = ({ data, showAntibiotic, showLegend }) => (
  <LineChart data={data}>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="#f0f0f0"
      horizontal={true}
      vertical={false}
    />
    <XAxis
      dataKey="generation"
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Generation",
        position: "insideBottom",
        offset: -10,
        style: { textAnchor: "middle" },
      }}
    />
    <YAxis
      yAxisId="population"
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Population Count",
        angle: -90,
        position: "insideLeft",
        style: { textAnchor: "middle" },
      }}
    />
    {showAntibiotic && (
      <YAxis
        yAxisId="antibiotic"
        orientation="right"
        stroke="#ef4444"
        fontSize={12}
        tickLine={false}
        axisLine={false}
        label={{
          value: "Antibiotic (μg/mL)",
          angle: 90,
          position: "insideRight",
          style: { textAnchor: "middle" },
        }}
      />
    )}
    <Tooltip content={<PopulationTooltip />} />
    {showLegend && <Legend verticalAlign="top" height={36} iconType="line" />}

    <Line
      yAxisId="population"
      type="monotone"
      dataKey="totalPopulation"
      stroke="#3b82f6"
      strokeWidth={2}
      dot={false}
      name="Total Population"
      connectNulls={false}
    />
    <Line
      yAxisId="population"
      type="monotone"
      dataKey="resistantPopulation"
      stroke="#ef4444"
      strokeWidth={2}
      dot={false}
      name="Resistant Bacteria"
      connectNulls={false}
    />
    <Line
      yAxisId="population"
      type="monotone"
      dataKey="sensitivePopulation"
      stroke="#10b981"
      strokeWidth={2}
      dot={false}
      name="Sensitive Bacteria"
      connectNulls={false}
    />
    {showAntibiotic && (
      <Line
        yAxisId="antibiotic"
        type="monotone"
        dataKey="antibioticConcentration"
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={false}
        name="Antibiotic Level"
        connectNulls={false}
      />
    )}
  </LineChart>
);

// Population area chart component
const PopulationAreaChart: React.FC<{
  data: PopulationDataPoint[];
  showAntibiotic: boolean;
  showLegend: boolean;
}> = ({ data, showAntibiotic, showLegend }) => (
  <ComposedChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis
      dataKey="generation"
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Generation",
        position: "insideBottom",
        offset: -10,
        style: { textAnchor: "middle" },
      }}
    />
    <YAxis
      yAxisId="population"
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Population Count",
        angle: -90,
        position: "insideLeft",
        style: { textAnchor: "middle" },
      }}
    />
    {showAntibiotic && (
      <YAxis
        yAxisId="antibiotic"
        orientation="right"
        stroke="#ef4444"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
    )}
    <Tooltip content={<PopulationTooltip />} />
    {showLegend && <Legend />}

    <Area
      yAxisId="population"
      type="monotone"
      dataKey="sensitivePopulation"
      stackId="1"
      stroke="#10b981"
      fill="#10b981"
      fillOpacity={0.6}
      name="Sensitive Bacteria"
    />
    <Area
      yAxisId="population"
      type="monotone"
      dataKey="resistantPopulation"
      stackId="1"
      stroke="#ef4444"
      fill="#ef4444"
      fillOpacity={0.6}
      name="Resistant Bacteria"
    />
    {showAntibiotic && (
      <Line
        yAxisId="antibiotic"
        type="monotone"
        dataKey="antibioticConcentration"
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={false}
        name="Antibiotic Level"
      />
    )}
  </ComposedChart>
);

// Main population chart component
export const PopulationChart: React.FC<PopulationChartProps> = ({
  data,
  config = {},
  loading = false,
  error,
  title = "Bacterial Population Dynamics",
  description = "Changes in bacterial population over simulation generations",
  className,
  chartType = "line",
  showAntibiotic = true,
  showLegend = true,
}) => {
  // Process and validate data
  const processedData = useChartData(data, rawData => {
    return rawData.map(point => ({
      ...point,
      sensitivePopulation: point.totalPopulation - point.resistantPopulation,
    }));
  });

  const mergedConfig = React.useMemo(
    () => ({ ...defaultPopulationConfig, ...config }),
    [config]
  );

  const chartComponent = React.useMemo(() => {
    if (chartType === "area") {
      return (
        <PopulationAreaChart
          data={processedData}
          showAntibiotic={showAntibiotic}
          showLegend={showLegend}
        />
      );
    }
    return (
      <PopulationLineChart
        data={processedData}
        showAntibiotic={showAntibiotic}
        showLegend={showLegend}
      />
    );
  }, [processedData, chartType, showAntibiotic, showLegend]);

  return (
    <BaseChart
      data={processedData}
      config={mergedConfig}
      loading={loading}
      error={error}
      title={title}
      description={description}
      className={className}
    >
      {chartComponent}
    </BaseChart>
  );
};

// Interface for simulation update data from WebSocket
interface SimulationUpdate {
  generation?: number;
  population_size?: number;
  resistant_count?: number;
  antibiotic_concentration?: number;
  timestamp?: string;
}

// Utility functions for data transformation
export const transformSimulationData = (
  simulationUpdates: SimulationUpdate[]
): PopulationDataPoint[] => {
  return simulationUpdates.map((update, index) => ({
    generation: update.generation || index,
    totalPopulation: update.population_size || 0,
    resistantPopulation: update.resistant_count || 0,
    sensitivePopulation:
      (update.population_size || 0) - (update.resistant_count || 0),
    antibioticConcentration: update.antibiotic_concentration || 0,
    timestamp: update.timestamp || new Date().toISOString(),
  }));
};

export default PopulationChart;
