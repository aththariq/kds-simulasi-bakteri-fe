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
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
} from "recharts";
import {
  BaseChart,
  ChartConfig,
  ChartDataPoint,
  useChartData,
} from "./BaseChart";

// Mutation tracking data point interface
export interface MutationDataPoint extends ChartDataPoint {
  generation: number;
  totalMutations: number;
  pointMutations: number;
  insertions: number;
  deletions: number;
  beneficialMutations: number;
  neutralMutations: number;
  deleteriousMutations: number;
  lethalMutations: number;
  mutationRate: number;
  averageFitnessEffect: number;
  mutationSpectrum: number; // Diversity of mutations
  hotspotActivity: number; // Activity in mutation hotspots
  timestamp?: string;
}

// Individual mutation event for scatter plot
export interface MutationEvent extends ChartDataPoint {
  generation: number;
  position: number;
  fitnessEffect: number;
  mutationType: "point" | "insertion" | "deletion" | "resistance";
  effectType: "beneficial" | "neutral" | "deleterious" | "lethal";
  color?: string;
}

// Mutation tracking chart props
export interface MutationTrackingChartProps {
  data: MutationDataPoint[];
  mutationEvents?: MutationEvent[];
  config?: ChartConfig;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  className?: string;
  chartType?: "line" | "scatter" | "combined" | "stacked";
  showMutationTypes?: boolean;
  showEffects?: boolean;
  showEvents?: boolean;
  colorByEffect?: boolean;
}

// Custom tooltip for mutation tracking
interface MutationTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
    dataKey: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
}

const MutationTooltip: React.FC<MutationTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    // Check if this is a scatter plot point with mutation event data
    const mutationEvent = payload[0]?.payload;
    if (mutationEvent && mutationEvent.mutationType) {
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg max-w-sm">
          <p className="font-semibold text-gray-800 mb-2">
            Mutation Event - Generation {String(mutationEvent.generation)}
          </p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">Type:</span>{" "}
              {String(mutationEvent.mutationType)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Effect:</span>{" "}
              {String(mutationEvent.effectType)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Position:</span>{" "}
              {String(mutationEvent.position)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Fitness Effect:</span>{" "}
              {Number(mutationEvent.fitnessEffect).toFixed(4)}
            </p>
          </div>
        </div>
      );
    }

    // Regular tooltip for line/bar charts
    return (
      <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg max-w-sm">
        <p className="font-semibold text-gray-800 mb-2">Generation: {label}</p>
        {payload.map((entry, index) => {
          const formatValue = (value: number, dataKey: string) => {
            if (dataKey === "mutationRate")
              return `${(value * 1000).toFixed(2)}/1000`;
            if (dataKey === "averageFitnessEffect")
              return `${value.toFixed(4)}`;
            if (dataKey === "mutationSpectrum" || dataKey === "hotspotActivity")
              return `${(value * 100).toFixed(1)}%`;
            return value.toLocaleString();
          };

          return (
            <div key={index} className="flex items-center space-x-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-700">
                {entry.name}: {formatValue(entry.value, entry.dataKey)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Default configuration for mutation tracking charts
const defaultMutationConfig: ChartConfig = {
  height: 450,
  margin: {
    top: 20,
    right: 80,
    bottom: 60,
    left: 60,
  },
};

// Color scheme for mutation types and effects
const mutationColors = {
  types: {
    point: "#3b82f6",
    insertion: "#10b981",
    deletion: "#ef4444",
    resistance: "#f59e0b",
  },
  effects: {
    beneficial: "#10b981",
    neutral: "#6b7280",
    deleterious: "#f97316",
    lethal: "#dc2626",
  },
};

// Line chart variant for tracking mutation rates
const MutationLineChart: React.FC<{
  data: MutationDataPoint[];
  showMutationTypes: boolean;
  showEffects: boolean;
}> = ({ data, showMutationTypes, showEffects }) => (
  <LineChart data={data}>
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
      yAxisId="count"
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Mutation Count",
        angle: -90,
        position: "insideLeft",
        style: { textAnchor: "middle" },
      }}
    />
    <YAxis
      yAxisId="rate"
      orientation="right"
      stroke="#f59e0b"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Mutation Rate",
        angle: 90,
        position: "insideRight",
        style: { textAnchor: "middle" },
      }}
    />

    <Tooltip content={<MutationTooltip />} />
    <Legend verticalAlign="top" height={36} iconType="line" />

    {/* Total mutations */}
    <Line
      yAxisId="count"
      type="monotone"
      dataKey="totalMutations"
      stroke="#1f2937"
      strokeWidth={3}
      dot={false}
      name="Total Mutations"
      connectNulls={false}
    />

    {/* Mutation rate */}
    <Line
      yAxisId="rate"
      type="monotone"
      dataKey="mutationRate"
      stroke="#f59e0b"
      strokeWidth={2}
      strokeDasharray="5 5"
      dot={false}
      name="Mutation Rate"
      connectNulls={false}
    />

    {/* Mutation types */}
    {showMutationTypes && (
      <>
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="pointMutations"
          stroke={mutationColors.types.point}
          strokeWidth={2}
          dot={false}
          name="Point Mutations"
          connectNulls={false}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="insertions"
          stroke={mutationColors.types.insertion}
          strokeWidth={2}
          dot={false}
          name="Insertions"
          connectNulls={false}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="deletions"
          stroke={mutationColors.types.deletion}
          strokeWidth={2}
          dot={false}
          name="Deletions"
          connectNulls={false}
        />
      </>
    )}

    {/* Mutation effects */}
    {showEffects && (
      <>
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="beneficialMutations"
          stroke={mutationColors.effects.beneficial}
          strokeWidth={2}
          strokeDasharray="3 3"
          dot={false}
          name="Beneficial"
          connectNulls={false}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="deleteriousMutations"
          stroke={mutationColors.effects.deleterious}
          strokeWidth={2}
          strokeDasharray="3 3"
          dot={false}
          name="Deleterious"
          connectNulls={false}
        />
      </>
    )}
  </LineChart>
);

// Scatter chart for individual mutation events
const MutationScatterChart: React.FC<{
  events: MutationEvent[];
  colorByEffect: boolean;
}> = ({ events, colorByEffect }) => (
  <ScatterChart data={events}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis
      dataKey="generation"
      type="number"
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
      dataKey="fitnessEffect"
      type="number"
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Fitness Effect",
        angle: -90,
        position: "insideLeft",
        style: { textAnchor: "middle" },
      }}
    />

    <Tooltip content={<MutationTooltip />} />
    <Legend />

    {/* Group events by type or effect for coloring */}
    {colorByEffect
      ? Object.entries(mutationColors.effects).map(([effect, color]) => (
          <Scatter
            key={effect}
            data={events.filter(e => e.effectType === effect)}
            fill={color}
            name={effect.charAt(0).toUpperCase() + effect.slice(1)}
          />
        ))
      : Object.entries(mutationColors.types).map(([type, color]) => (
          <Scatter
            key={type}
            data={events.filter(e => e.mutationType === type)}
            fill={color}
            name={type.charAt(0).toUpperCase() + type.slice(1)}
          />
        ))}
  </ScatterChart>
);

// Stacked area chart for mutation composition
const MutationStackedChart: React.FC<{
  data: MutationDataPoint[];
  showMutationTypes: boolean;
  showEffects: boolean;
}> = ({ data, showMutationTypes, showEffects }) => (
  <ComposedChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis
      dataKey="generation"
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
    />
    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />

    <Tooltip content={<MutationTooltip />} />
    <Legend />

    {showMutationTypes ? (
      <>
        <Area
          type="monotone"
          dataKey="pointMutations"
          stackId="1"
          stroke={mutationColors.types.point}
          fill={mutationColors.types.point}
          fillOpacity={0.6}
          name="Point Mutations"
        />
        <Area
          type="monotone"
          dataKey="insertions"
          stackId="1"
          stroke={mutationColors.types.insertion}
          fill={mutationColors.types.insertion}
          fillOpacity={0.6}
          name="Insertions"
        />
        <Area
          type="monotone"
          dataKey="deletions"
          stackId="1"
          stroke={mutationColors.types.deletion}
          fill={mutationColors.types.deletion}
          fillOpacity={0.6}
          name="Deletions"
        />
      </>
    ) : (
      <>
        <Area
          type="monotone"
          dataKey="beneficialMutations"
          stackId="1"
          stroke={mutationColors.effects.beneficial}
          fill={mutationColors.effects.beneficial}
          fillOpacity={0.6}
          name="Beneficial"
        />
        <Area
          type="monotone"
          dataKey="neutralMutations"
          stackId="1"
          stroke={mutationColors.effects.neutral}
          fill={mutationColors.effects.neutral}
          fillOpacity={0.6}
          name="Neutral"
        />
        <Area
          type="monotone"
          dataKey="deleteriousMutations"
          stackId="1"
          stroke={mutationColors.effects.deleterious}
          fill={mutationColors.effects.deleterious}
          fillOpacity={0.6}
          name="Deleterious"
        />
        {showEffects && (
          <Area
            type="monotone"
            dataKey="lethalMutations"
            stackId="1"
            stroke={mutationColors.effects.lethal}
            fill={mutationColors.effects.lethal}
            fillOpacity={0.6}
            name="Lethal"
          />
        )}
      </>
    )}

    {/* Mutation rate as line overlay */}
    <Line
      type="monotone"
      dataKey="mutationRate"
      stroke="#1f2937"
      strokeWidth={2}
      dot={false}
      name="Mutation Rate"
    />
  </ComposedChart>
);

// Main mutation tracking chart component
export const MutationTrackingChart: React.FC<MutationTrackingChartProps> = ({
  data,
  mutationEvents = [],
  config = {},
  loading = false,
  error,
  title = "Mutation Tracking Analysis",
  description = "Monitoring mutation rates, types, and fitness effects over generations",
  className,
  chartType = "line",
  showMutationTypes = true,
  showEffects = true,
  showEvents = false,
  colorByEffect = false,
}) => {
  // Process and validate data
  const processedData = useChartData(data);

  const mergedConfig = React.useMemo(
    () => ({ ...defaultMutationConfig, ...config }),
    [config]
  );

  const chartComponent = React.useMemo(() => {
    if (chartType === "scatter" && showEvents) {
      return (
        <MutationScatterChart
          events={mutationEvents}
          colorByEffect={colorByEffect}
        />
      );
    }

    if (chartType === "stacked") {
      return (
        <MutationStackedChart
          data={processedData}
          showMutationTypes={showMutationTypes}
          showEffects={showEffects}
        />
      );
    }

    return (
      <MutationLineChart
        data={processedData}
        showMutationTypes={showMutationTypes}
        showEffects={showEffects}
      />
    );
  }, [
    processedData,
    mutationEvents,
    chartType,
    showMutationTypes,
    showEffects,
    showEvents,
    colorByEffect,
  ]);

  return (
    <BaseChart
      data={chartType === "scatter" ? mutationEvents : processedData}
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

// Utility function to transform simulation data for mutation tracking
export const transformMutationData = (
  simulationUpdates: Array<{
    generation?: number;
    mutations?: {
      total?: number;
      point?: number;
      insertions?: number;
      deletions?: number;
      beneficial?: number;
      neutral?: number;
      deleterious?: number;
      lethal?: number;
      rate?: number;
      average_fitness_effect?: number;
    };
    timestamp?: string;
  }>
): MutationDataPoint[] => {
  return simulationUpdates.map((update, index) => {
    const mutations = update.mutations || {};

    return {
      generation: update.generation || index,
      totalMutations: mutations.total || 0,
      pointMutations: mutations.point || 0,
      insertions: mutations.insertions || 0,
      deletions: mutations.deletions || 0,
      beneficialMutations: mutations.beneficial || 0,
      neutralMutations: mutations.neutral || 0,
      deleteriousMutations: mutations.deleterious || 0,
      lethalMutations: mutations.lethal || 0,
      mutationRate: mutations.rate || 0,
      averageFitnessEffect: mutations.average_fitness_effect || 0,
      mutationSpectrum:
        (mutations.point || 0) +
          (mutations.insertions || 0) +
          (mutations.deletions || 0) >
        0
          ? Math.random() * 0.8 + 0.1
          : 0, // Placeholder calculation
      hotspotActivity: Math.random() * 0.5, // Placeholder - would come from actual hotspot analysis
      timestamp: update.timestamp || new Date().toISOString(),
    };
  });
};

export default MutationTrackingChart;
