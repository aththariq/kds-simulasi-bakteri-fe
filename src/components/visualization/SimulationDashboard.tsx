"use client";

import * as React from "react";
import { ResponsiveChartGrid, gridPresets } from "./ResponsiveChartGrid";
import { PopulationChart, PopulationDataPoint } from "./PopulationChart";
import { cn } from "@/lib/utils";

// Dashboard configuration interface
export interface DashboardConfig {
  layout?: "dashboard" | "monitoring" | "comparison" | "fullscreen";
  title?: string;
  description?: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

// Dashboard props interface
export interface SimulationDashboardProps {
  data: PopulationDataPoint[];
  config?: DashboardConfig;
  loading?: boolean;
  error?: string;
  className?: string;
}

// Mini chart component for dashboard widgets
const MiniPopulationChart: React.FC<{
  data: PopulationDataPoint[];
  title: string;
  showOnly?: "population" | "resistance" | "antibiotic";
  compact?: boolean;
}> = ({ data, title, showOnly = "population", compact = false }) => {
  const chartConfig = {
    height: compact ? 200 : 300,
    margin: {
      top: 10,
      right: compact ? 20 : 40,
      bottom: compact ? 30 : 40,
      left: compact ? 30 : 40,
    },
  };

  return (
    <PopulationChart
      data={data}
      config={chartConfig}
      title={title}
      chartType="line"
      showAntibiotic={showOnly === "antibiotic"}
      showLegend={!compact}
      className={cn(
        "bg-white border border-gray-200 rounded-lg shadow-sm",
        compact && "text-sm"
      )}
    />
  );
};

// Statistics card component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "stable";
  icon?: React.ReactNode;
}> = ({ title, value, change, trend, icon }) => {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-gray-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={cn("text-sm", trend && trendColors[trend])}>
              {change}
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
};

// Get latest statistics from data
const getLatestStats = (data: PopulationDataPoint[]) => {
  if (!data || data.length === 0) {
    return {
      totalPopulation: 0,
      resistantPopulation: 0,
      resistancePercentage: 0,
      antibioticLevel: 0,
      generation: 0,
    };
  }

  const latest = data[data.length - 1];
  const resistancePercentage =
    latest.totalPopulation > 0
      ? (latest.resistantPopulation / latest.totalPopulation) * 100
      : 0;

  return {
    totalPopulation: latest.totalPopulation,
    resistantPopulation: latest.resistantPopulation,
    resistancePercentage: Math.round(resistancePercentage * 10) / 10,
    antibioticLevel: Math.round(latest.antibioticConcentration * 100) / 100,
    generation: latest.generation,
  };
};

// Main simulation dashboard component
export const SimulationDashboard: React.FC<SimulationDashboardProps> = ({
  data,
  config = {},
  loading = false,
  error,
  className,
}) => {
  const {
    layout = "dashboard",
    title = "Bacterial Simulation Dashboard",
    description = "Real-time visualization of bacterial population dynamics",
    refreshInterval = 5000,
    autoRefresh = false,
  } = config;

  const stats = React.useMemo(() => getLatestStats(data), [data]);

  // Auto-refresh functionality
  React.useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        // This would trigger a data refresh in a real implementation
        console.log("Auto-refreshing dashboard data...");
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Select grid configuration based on layout
  const gridConfig = React.useMemo(() => {
    switch (layout) {
      case "monitoring":
        return gridPresets.monitoring;
      case "comparison":
        return gridPresets.comparison;
      case "fullscreen":
        return gridPresets.fullscreen;
      default:
        return gridPresets.dashboard;
    }
  }, [layout]);

  if (loading) {
    return (
      <div className={cn("simulation-dashboard", className)}>
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading simulation dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("simulation-dashboard", className)}>
        <div className="flex items-center justify-center h-96 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <div className="text-red-600 mb-2">⚠️</div>
            <p className="text-red-700 font-medium">Dashboard Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("simulation-dashboard space-y-6", className)}>
      {/* Dashboard Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
        {data.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Last updated: Generation {stats.generation} • {data.length} data
            points
          </p>
        )}
      </div>

      {/* Statistics Cards */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Population"
            value={stats.totalPopulation.toLocaleString()}
            icon={
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">
                👥
              </div>
            }
          />
          <StatCard
            title="Resistant Bacteria"
            value={stats.resistantPopulation.toLocaleString()}
            icon={
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs">
                🦠
              </div>
            }
          />
          <StatCard
            title="Resistance Rate"
            value={`${stats.resistancePercentage}%`}
            trend={
              stats.resistancePercentage > 50
                ? "up"
                : stats.resistancePercentage > 20
                ? "stable"
                : "down"
            }
            icon={
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs">
                📊
              </div>
            }
          />
          <StatCard
            title="Antibiotic Level"
            value={`${stats.antibioticLevel} μg/mL`}
            icon={
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">
                💊
              </div>
            }
          />
        </div>
      )}

      {/* Main Charts Grid */}
      <ResponsiveChartGrid config={gridConfig}>
        {layout === "fullscreen" ? (
          <PopulationChart
            data={data}
            title="Population Dynamics Overview"
            description="Complete view of bacterial population changes with antibiotic treatment"
            chartType="line"
            showAntibiotic={true}
            showLegend={true}
            config={{ height: 500 }}
          />
        ) : layout === "comparison" ? (
          <>
            <MiniPopulationChart
              data={data}
              title="Population Trends"
              showOnly="population"
            />
            <MiniPopulationChart
              data={data}
              title="Resistance Evolution"
              showOnly="resistance"
            />
          </>
        ) : (
          <>
            <PopulationChart
              data={data}
              title="Population Dynamics"
              description="Real-time bacterial population changes"
              chartType="line"
              showAntibiotic={true}
              showLegend={true}
            />

            <PopulationChart
              data={data}
              title="Population Composition"
              description="Resistant vs sensitive bacteria over time"
              chartType="area"
              showAntibiotic={false}
              showLegend={true}
            />

            {layout === "monitoring" && (
              <MiniPopulationChart
                data={data}
                title="Antibiotic Concentration"
                showOnly="antibiotic"
                compact={true}
              />
            )}
          </>
        )}
      </ResponsiveChartGrid>

      {/* Footer Info */}
      {data.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
          <p>
            Showing {data.length} generations of simulation data • Layout:{" "}
            {layout.charAt(0).toUpperCase() + layout.slice(1)}
          </p>
        </div>
      )}
    </div>
  );
};

export default SimulationDashboard;
