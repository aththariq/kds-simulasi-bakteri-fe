"use client";

import * as React from "react";
import { SimulationDashboard } from "./SimulationDashboard";
import {
  ResponsiveChartGrid,
  gridPresets,
  useBreakpoint,
} from "./ResponsiveChartGrid";
import { PopulationChart, PopulationDataPoint } from "./PopulationChart";

// Generate comprehensive test data
const generateTestData = (generations: number = 100): PopulationDataPoint[] => {
  const data: PopulationDataPoint[] = [];

  for (let generation = 0; generation <= generations; generation++) {
    // Simulate realistic bacterial population dynamics
    const basePopulation = 1000;

    // Population growth with environmental pressures
    const carryingCapacity = 10000;
    const populationGrowth =
      carryingCapacity *
      (1 - Math.exp(-0.3 * generation)) *
      (1 + Math.sin(generation * 0.1) * 0.1); // Growth with oscillations

    const totalPopulation = Math.floor(basePopulation + populationGrowth);

    // Resistance evolution - increases with antibiotic pressure
    const antibioticCycles = Math.sin(generation * 0.2) * 0.5 + 0.5; // Treatment cycles
    const resistancePressure = antibioticCycles * 0.8 + 0.2; // Base resistance
    const resistancePercentage = Math.min(
      0.9,
      generation * 0.008 * resistancePressure + Math.random() * 0.03
    );

    const resistantPopulation = Math.floor(
      totalPopulation * resistancePercentage
    );

    // Antibiotic concentration with treatment protocols
    const treatmentSchedule = Math.floor(generation / 15) % 3; // 3-phase cycle
    let antibioticConcentration = 0;

    switch (treatmentSchedule) {
      case 0: // High treatment
        antibioticConcentration =
          8 + Math.sin(generation * 0.5) * 2 + Math.random();
        break;
      case 1: // Maintenance treatment
        antibioticConcentration =
          3 + Math.sin(generation * 0.3) * 1 + Math.random() * 0.5;
        break;
      case 2: // Treatment break
        antibioticConcentration = Math.max(
          0,
          1 + Math.sin(generation * 0.8) * 0.5
        );
        break;
    }

    data.push({
      generation,
      totalPopulation,
      resistantPopulation,
      sensitivePopulation: totalPopulation - resistantPopulation,
      antibioticConcentration: Math.max(0, antibioticConcentration),
      timestamp: new Date(Date.now() + generation * 3600000).toISOString(),
    });
  }

  return data;
};

// Responsive info component
const ResponsiveInfo: React.FC = () => {
  const breakpoint = useBreakpoint();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-blue-900 mb-2">
        Responsive Information
      </h3>
      <p className="text-blue-800 text-sm">
        Current breakpoint:{" "}
        <span className="font-mono bg-blue-100 px-2 py-1 rounded">
          {breakpoint}
        </span>
      </p>
      <p className="text-blue-700 text-xs mt-2">
        Try resizing your browser window to see how the layout adapts to
        different screen sizes.
      </p>
    </div>
  );
};

// Layout selector component
const LayoutSelector: React.FC<{
  currentLayout: string;
  onLayoutChange: (layout: string) => void;
}> = ({ currentLayout, onLayoutChange }) => {
  const layouts = [
    {
      key: "dashboard",
      label: "Dashboard",
      description: "Multi-chart dashboard view",
    },
    {
      key: "monitoring",
      label: "Monitoring",
      description: "Real-time monitoring layout",
    },
    {
      key: "comparison",
      label: "Comparison",
      description: "Side-by-side comparison",
    },
    {
      key: "fullscreen",
      label: "Fullscreen",
      description: "Single chart focus",
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">Layout Options</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {layouts.map(layout => (
          <button
            key={layout.key}
            onClick={() => onLayoutChange(layout.key)}
            className={`p-3 text-left border rounded-lg transition-colors ${
              currentLayout === layout.key
                ? "bg-blue-50 border-blue-300 text-blue-900"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="font-medium">{layout.label}</div>
            <div className="text-xs text-gray-600 mt-1">
              {layout.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main responsive test component
export const ResponsiveTest: React.FC = () => {
  const [testData] = React.useState(() => generateTestData(80));
  const [currentLayout, setCurrentLayout] = React.useState<string>("dashboard");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  // Simulate loading state
  const handleLoadingTest = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  // Simulate error state
  const handleErrorTest = () => {
    setError("Simulated connection error for testing purposes");
    setTimeout(() => setError(""), 5000);
  };

  return (
    <div className="responsive-test space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Responsive Visualization Test Suite
        </h1>
        <p className="text-gray-600 text-lg">
          Comprehensive testing of responsive chart layouts and dashboard
          components
        </p>
      </div>

      {/* Responsive info */}
      <ResponsiveInfo />

      {/* Layout controls */}
      <LayoutSelector
        currentLayout={currentLayout}
        onLayoutChange={setCurrentLayout}
      />

      {/* Test controls */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Test Controls</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleLoadingTest}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Test Loading State
          </button>
          <button
            onClick={handleErrorTest}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Test Error State
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reset Test
          </button>
        </div>
      </div>

      {/* Main dashboard */}
      <SimulationDashboard
        data={testData}
        config={{
          layout: currentLayout as
            | "dashboard"
            | "monitoring"
            | "comparison"
            | "fullscreen",
          title: `${
            currentLayout.charAt(0).toUpperCase() + currentLayout.slice(1)
          } Layout Test`,
          description:
            "Demonstrating responsive behavior across different screen sizes",
          autoRefresh: false,
        }}
        loading={loading}
        error={error}
      />

      {/* Additional responsive grid examples */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Custom Grid Configurations
          </h2>

          {/* Monitoring preset */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Monitoring Layout
            </h3>
            <ResponsiveChartGrid config={gridPresets.monitoring}>
              <PopulationChart
                data={testData}
                title="Real-time Population Monitor"
                chartType="line"
                showAntibiotic={true}
                config={{ height: 350 }}
              />
              <PopulationChart
                data={testData}
                title="Resistance Tracking"
                chartType="area"
                showAntibiotic={false}
                config={{ height: 350 }}
              />
            </ResponsiveChartGrid>
          </div>

          {/* Comparison preset */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Comparison Layout
            </h3>
            <ResponsiveChartGrid config={gridPresets.comparison}>
              <PopulationChart
                data={testData.slice(0, 40)}
                title="First 40 Generations"
                chartType="line"
                config={{ height: 300 }}
              />
              <PopulationChart
                data={testData.slice(40)}
                title="Remaining Generations"
                chartType="line"
                config={{ height: 300 }}
              />
            </ResponsiveChartGrid>
          </div>
        </div>
      </div>

      {/* Data summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Test Data Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Generations:</span>{" "}
            {testData.length}
          </div>
          <div>
            <span className="font-medium">Final Population:</span>{" "}
            {testData[testData.length - 1]?.totalPopulation.toLocaleString() ||
              0}
          </div>
          <div>
            <span className="font-medium">Final Resistance:</span>{" "}
            {testData[testData.length - 1]
              ? Math.round(
                  (testData[testData.length - 1].resistantPopulation /
                    testData[testData.length - 1].totalPopulation) *
                    100
                )
              : 0}
            %
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTest;
