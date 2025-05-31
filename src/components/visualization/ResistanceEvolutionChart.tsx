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
  ReferenceLine,
  Brush,
} from "recharts";
import {
  BaseChart,
  ChartConfig,
  ChartDataPoint,
  useChartData,
} from "./BaseChart";

// Resistance evolution data point interface
export interface ResistanceDataPoint extends ChartDataPoint {
  generation: number;
  resistanceFrequency: number; // Percentage of resistant bacteria
  mutationRate: number; // Mutations per generation
  selectedGenes: number; // Number of resistance genes under selection
  totalMutations: number; // Cumulative mutation count
  fitnessAdvantage: number; // Average fitness advantage of resistant strains
  selectionPressure: number; // Environmental selection pressure
  timestamp?: string;
}

// Resistance evolution chart props
export interface ResistanceEvolutionChartProps {
  data: ResistanceDataPoint[];
  config?: ChartConfig;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  className?: string;
  showMutations?: boolean;
  showFitness?: boolean;
  showBrush?: boolean;
  highlightEvents?: Array<{
    generation: number;
    label: string;
    color?: string;
  }>;
}

// Custom tooltip for resistance evolution
interface ResistanceTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
    dataKey: string;
  }>;
  label?: string | number;
}

const ResistanceTooltip: React.FC<ResistanceTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg max-w-sm">
        <p className="font-semibold text-gray-800 mb-2">Generation: {label}</p>
        {payload.map((entry, index) => {
          const formatValue = (value: number, dataKey: string) => {
            if (dataKey === "resistanceFrequency")
              return `${value.toFixed(1)}%`;
            if (dataKey === "mutationRate") return `${value.toFixed(4)}/gen`;
            if (dataKey === "fitnessAdvantage") return `${value.toFixed(3)}`;
            if (dataKey === "selectionPressure") return `${value.toFixed(2)}`;
            return value.toFixed(0);
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

// Default configuration for resistance evolution charts
const defaultResistanceConfig: ChartConfig = {
  height: 450,
  margin: {
    top: 20,
    right: 80,
    bottom: 60,
    left: 60,
  },
};

// Main resistance evolution chart component
export const ResistanceEvolutionChart: React.FC<
  ResistanceEvolutionChartProps
> = ({
  data,
  config = {},
  loading = false,
  error,
  title = "Resistance Gene Evolution",
  description = "Tracking resistance frequency and mutation dynamics over generations",
  className,
  showMutations = true,
  showFitness = true,
  showBrush = false,
  highlightEvents = [],
}) => {
  // Process and validate data
  const processedData = useChartData(data, rawData => {
    return rawData.map(point => ({
      ...point,
      resistanceFrequency: Math.max(
        0,
        Math.min(100, point.resistanceFrequency * 100)
      ), // Convert to percentage
    }));
  });

  const mergedConfig = React.useMemo(
    () => ({ ...defaultResistanceConfig, ...config }),
    [config]
  );

  const chartComponent = React.useMemo(
    () => (
      <LineChart data={processedData}>
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
          yAxisId="frequency"
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          label={{
            value: "Resistance Frequency (%)",
            angle: -90,
            position: "insideLeft",
            style: { textAnchor: "middle" },
          }}
        />
        {showMutations && (
          <YAxis
            yAxisId="mutations"
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
        )}

        <Tooltip content={<ResistanceTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="line"
          wrapperStyle={{ paddingBottom: "20px" }}
        />

        {/* Reference lines for significant events */}
        {highlightEvents.map((event, index) => (
          <ReferenceLine
            key={index}
            x={event.generation}
            stroke={event.color || "#ef4444"}
            strokeDasharray="2 2"
            label={{
              value: event.label,
              position: "top",
              style: { fontSize: "12px", fill: event.color || "#ef4444" },
            }}
          />
        ))}

        {/* Primary resistance frequency line */}
        <Line
          yAxisId="frequency"
          type="monotone"
          dataKey="resistanceFrequency"
          stroke="#dc2626"
          strokeWidth={3}
          dot={false}
          name="Resistance Frequency"
          connectNulls={false}
        />

        {/* Selection pressure indicator */}
        <Line
          yAxisId="frequency"
          type="monotone"
          dataKey="selectionPressure"
          stroke="#7c3aed"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Selection Pressure"
          connectNulls={false}
        />

        {/* Mutation rate (if enabled) */}
        {showMutations && (
          <Line
            yAxisId="mutations"
            type="monotone"
            dataKey="mutationRate"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Mutation Rate"
            connectNulls={false}
          />
        )}

        {/* Fitness advantage (if enabled) */}
        {showFitness && (
          <Line
            yAxisId="frequency"
            type="monotone"
            dataKey="fitnessAdvantage"
            stroke="#059669"
            strokeWidth={2}
            strokeDasharray="3 6"
            dot={false}
            name="Fitness Advantage"
            connectNulls={false}
          />
        )}

        {/* Brush for zooming (if enabled) */}
        {showBrush && (
          <Brush
            dataKey="generation"
            height={30}
            stroke="#3b82f6"
            fill="#eff6ff"
          />
        )}
      </LineChart>
    ),
    [processedData, showMutations, showFitness, showBrush, highlightEvents]
  );

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

// Utility function to transform simulation data for resistance evolution
export const transformResistanceData = (
  simulationUpdates: Array<{
    generation?: number;
    population_size?: number;
    resistant_count?: number;
    mutation_rate?: number;
    total_mutations?: number;
    fitness_advantage?: number;
    selection_pressure?: number;
    resistance_genes?: number;
    timestamp?: string;
  }>
): ResistanceDataPoint[] => {
  return simulationUpdates.map((update, index) => {
    const totalPop = update.population_size || 1;
    const resistantCount = update.resistant_count || 0;

    return {
      generation: update.generation || index,
      resistanceFrequency: resistantCount / totalPop, // Will be converted to percentage in component
      mutationRate: update.mutation_rate || 0,
      selectedGenes: update.resistance_genes || 0,
      totalMutations: update.total_mutations || 0,
      fitnessAdvantage: update.fitness_advantage || 0,
      selectionPressure: update.selection_pressure || 0,
      timestamp: update.timestamp || new Date().toISOString(),
    };
  });
};

export default ResistanceEvolutionChart;
