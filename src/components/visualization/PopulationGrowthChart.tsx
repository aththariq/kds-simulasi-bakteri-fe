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
  Brush,
} from "recharts";
import {
  BaseChart,
  ChartConfig,
  ChartDataPoint,
  useChartData,
} from "./BaseChart";

// Population growth data point interface
export interface GrowthDataPoint extends ChartDataPoint {
  generation: number;
  populationSize: number;
  growthRate: number; // Population growth rate per generation
  carryingCapacity: number; // Environmental carrying capacity
  populationDensity: number; // Population per unit space
  birthRate: number; // Births per generation
  deathRate: number; // Deaths per generation
  netGrowth: number; // Net population change
  environmentalStress: number; // Environmental stress factor
  competitionIndex: number; // Intraspecies competition level
  timestamp?: string;
}

// Population growth chart props
export interface PopulationGrowthChartProps {
  data: GrowthDataPoint[];
  config?: ChartConfig;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  className?: string;
  chartType?: "line" | "area" | "composed";
  showCarryingCapacity?: boolean;
  showGrowthRate?: boolean;
  showStressFactors?: boolean;
  showBrush?: boolean;
  logScale?: boolean;
}

// Custom tooltip for population growth
interface GrowthTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
    dataKey: string;
  }>;
  label?: string | number;
}

const GrowthTooltip: React.FC<GrowthTooltipProps> = ({
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
            if (dataKey === "growthRate") return `${(value * 100).toFixed(2)}%`;
            if (dataKey === "populationDensity")
              return `${value.toFixed(1)}/unit²`;
            if (
              dataKey === "environmentalStress" ||
              dataKey === "competitionIndex"
            )
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

// Default configuration for population growth charts
const defaultGrowthConfig: ChartConfig = {
  height: 400,
  margin: {
    top: 20,
    right: 80,
    bottom: 60,
    left: 60,
  },
};

// Line chart variant
const GrowthLineChart: React.FC<{
  data: GrowthDataPoint[];
  showCarryingCapacity: boolean;
  showGrowthRate: boolean;
  showStressFactors: boolean;
  showBrush: boolean;
  logScale: boolean;
}> = ({
  data,
  showCarryingCapacity,
  showGrowthRate,
  showStressFactors,
  showBrush,
  logScale,
}) => (
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
      scale={logScale ? "log" : "linear"}
      label={{
        value: logScale ? "Population Size (log)" : "Population Size",
        angle: -90,
        position: "insideLeft",
        style: { textAnchor: "middle" },
      }}
    />
    {showGrowthRate && (
      <YAxis
        yAxisId="rate"
        orientation="right"
        stroke="#059669"
        fontSize={12}
        tickLine={false}
        axisLine={false}
        label={{
          value: "Growth Rate (%)",
          angle: 90,
          position: "insideRight",
          style: { textAnchor: "middle" },
        }}
      />
    )}

    <Tooltip content={<GrowthTooltip />} />
    <Legend
      verticalAlign="top"
      height={36}
      iconType="line"
      wrapperStyle={{ paddingBottom: "20px" }}
    />

    {/* Population size */}
    <Line
      yAxisId="population"
      type="monotone"
      dataKey="populationSize"
      stroke="#3b82f6"
      strokeWidth={3}
      dot={false}
      name="Population Size"
      connectNulls={false}
    />

    {/* Carrying capacity reference line */}
    {showCarryingCapacity && (
      <Line
        yAxisId="population"
        type="monotone"
        dataKey="carryingCapacity"
        stroke="#6b7280"
        strokeWidth={2}
        strokeDasharray="8 4"
        dot={false}
        name="Carrying Capacity"
        connectNulls={false}
      />
    )}

    {/* Growth rate */}
    {showGrowthRate && (
      <Line
        yAxisId="rate"
        type="monotone"
        dataKey="growthRate"
        stroke="#059669"
        strokeWidth={2}
        dot={false}
        name="Growth Rate"
        connectNulls={false}
      />
    )}

    {/* Stress factors */}
    {showStressFactors && (
      <>
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="environmentalStress"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="3 3"
          dot={false}
          name="Environmental Stress"
          connectNulls={false}
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="competitionIndex"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="6 2"
          dot={false}
          name="Competition Index"
          connectNulls={false}
        />
      </>
    )}

    {/* Brush for zooming */}
    {showBrush && (
      <Brush dataKey="generation" height={30} stroke="#3b82f6" fill="#eff6ff" />
    )}
  </LineChart>
);

// Area chart variant for stacked visualization
const GrowthAreaChart: React.FC<{
  data: GrowthDataPoint[];
  showCarryingCapacity: boolean;
  showBrush: boolean;
}> = ({ data, showCarryingCapacity, showBrush }) => (
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
      stroke="#6b7280"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      label={{
        value: "Population Metrics",
        angle: -90,
        position: "insideLeft",
        style: { textAnchor: "middle" },
      }}
    />

    <Tooltip content={<GrowthTooltip />} />
    <Legend />

    {/* Birth and death rates as areas */}
    <Area
      type="monotone"
      dataKey="birthRate"
      stackId="1"
      stroke="#10b981"
      fill="#10b981"
      fillOpacity={0.6}
      name="Birth Rate"
    />
    <Area
      type="monotone"
      dataKey="deathRate"
      stackId="1"
      stroke="#ef4444"
      fill="#ef4444"
      fillOpacity={0.6}
      name="Death Rate"
    />

    {/* Population size as line */}
    <Line
      type="monotone"
      dataKey="populationSize"
      stroke="#3b82f6"
      strokeWidth={3}
      dot={false}
      name="Population Size"
    />

    {/* Carrying capacity line */}
    {showCarryingCapacity && (
      <Line
        type="monotone"
        dataKey="carryingCapacity"
        stroke="#6b7280"
        strokeWidth={2}
        strokeDasharray="8 4"
        dot={false}
        name="Carrying Capacity"
      />
    )}

    {/* Brush for zooming */}
    {showBrush && (
      <Brush dataKey="generation" height={30} stroke="#3b82f6" fill="#eff6ff" />
    )}
  </ComposedChart>
);

// Main population growth chart component
export const PopulationGrowthChart: React.FC<PopulationGrowthChartProps> = ({
  data,
  config = {},
  loading = false,
  error,
  title = "Population Growth Dynamics",
  description = "Tracking population growth rates, carrying capacity, and environmental factors",
  className,
  chartType = "line",
  showCarryingCapacity = true,
  showGrowthRate = true,
  showStressFactors = false,
  showBrush = false,
  logScale = false,
}) => {
  // Process and validate data
  const processedData = useChartData(data, rawData => {
    return rawData.map((point, index) => {
      // Calculate derived metrics if not provided
      const prevPoint = index > 0 ? rawData[index - 1] : null;
      const growthRate = prevPoint
        ? (point.populationSize - prevPoint.populationSize) /
          prevPoint.populationSize
        : 0;

      return {
        ...point,
        growthRate: point.growthRate ?? growthRate,
        netGrowth: point.birthRate - point.deathRate,
        populationDensity:
          point.populationDensity ?? point.populationSize / 100, // Assume 100 unit area
      };
    });
  });

  const mergedConfig = React.useMemo(
    () => ({ ...defaultGrowthConfig, ...config }),
    [config]
  );

  const chartComponent = React.useMemo(() => {
    if (chartType === "area") {
      return (
        <GrowthAreaChart
          data={processedData}
          showCarryingCapacity={showCarryingCapacity}
          showBrush={showBrush}
        />
      );
    }

    return (
      <GrowthLineChart
        data={processedData}
        showCarryingCapacity={showCarryingCapacity}
        showGrowthRate={showGrowthRate}
        showStressFactors={showStressFactors}
        showBrush={showBrush}
        logScale={logScale}
      />
    );
  }, [
    processedData,
    chartType,
    showCarryingCapacity,
    showGrowthRate,
    showStressFactors,
    showBrush,
    logScale,
  ]);

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

// Utility function to transform simulation data for growth analysis
export const transformGrowthData = (
  simulationUpdates: Array<{
    generation?: number;
    population_size?: number;
    carrying_capacity?: number;
    birth_rate?: number;
    death_rate?: number;
    environmental_stress?: number;
    competition_index?: number;
    population_density?: number;
    timestamp?: string;
  }>
): GrowthDataPoint[] => {
  return simulationUpdates.map((update, index) => {
    const populationSize = update.population_size || 0;
    const birthRate = update.birth_rate || 0;
    const deathRate = update.death_rate || 0;

    return {
      generation: update.generation || index,
      populationSize,
      growthRate:
        index > 0
          ? (populationSize -
              (simulationUpdates[index - 1].population_size || 0)) /
            (simulationUpdates[index - 1].population_size || 1)
          : 0,
      carryingCapacity: update.carrying_capacity || populationSize * 1.5,
      populationDensity: update.population_density || populationSize / 100,
      birthRate,
      deathRate,
      netGrowth: birthRate - deathRate,
      environmentalStress: update.environmental_stress || 0,
      competitionIndex: update.competition_index || 0,
      timestamp: update.timestamp || new Date().toISOString(),
    };
  });
};

export default PopulationGrowthChart;
