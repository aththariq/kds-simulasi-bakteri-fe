"use client";

import * as React from "react";
import { PopulationChart, PopulationDataPoint } from "./PopulationChart";

// Generate sample data for testing
const generateSampleData = (): PopulationDataPoint[] => {
  const data: PopulationDataPoint[] = [];

  for (let generation = 0; generation <= 50; generation++) {
    // Simulate population growth with resistance evolution
    const basePopulation = 1000;
    const growthFactor = 1 + Math.sin(generation * 0.2) * 0.1; // Oscillating growth
    const totalPopulation = Math.floor(
      basePopulation * growthFactor * (1 + generation * 0.02)
    );

    // Resistance increases over time, especially when antibiotics are present
    const resistancePercentage = Math.min(
      0.8,
      generation * 0.015 + Math.random() * 0.05
    );
    const resistantPopulation = Math.floor(
      totalPopulation * resistancePercentage
    );

    // Antibiotic concentration varies (treatment cycles)
    const antibioticConcentration = Math.max(
      0,
      10 * Math.sin(generation * 0.3) + 5 + Math.random() * 2
    );

    data.push({
      generation,
      totalPopulation,
      resistantPopulation,
      sensitivePopulation: totalPopulation - resistantPopulation,
      antibioticConcentration,
      timestamp: new Date(Date.now() + generation * 3600000).toISOString(), // 1 hour per generation
    });
  }

  return data;
};

export const TestChart: React.FC = () => {
  const [sampleData] = React.useState(() => generateSampleData());

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Visualization Test Suite
        </h1>
        <p className="text-gray-600">
          Testing bacterial population visualization components
        </p>
      </div>

      {/* Line Chart Test */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Line Chart Test
        </h2>
        <PopulationChart
          data={sampleData}
          chartType="line"
          title="Bacterial Population Dynamics (Line Chart)"
          description="Visualization of population changes over generations with antibiotic treatment"
          showAntibiotic={true}
          showLegend={true}
        />
      </div>

      {/* Area Chart Test */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Area Chart Test
        </h2>
        <PopulationChart
          data={sampleData}
          chartType="area"
          title="Bacterial Population Composition (Area Chart)"
          description="Stacked area visualization showing the proportion of resistant vs sensitive bacteria"
          showAntibiotic={true}
          showLegend={true}
        />
      </div>

      {/* Loading State Test */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Loading State Test
        </h2>
        <PopulationChart
          data={[]}
          loading={true}
          title="Loading Chart"
          description="This chart demonstrates the loading state"
        />
      </div>

      {/* Error State Test */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Error State Test
        </h2>
        <PopulationChart
          data={[]}
          error="Failed to load simulation data"
          title="Error Chart"
          description="This chart demonstrates the error state"
        />
      </div>

      {/* Empty Data Test */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Empty Data Test
        </h2>
        <PopulationChart
          data={[]}
          title="Empty Data Chart"
          description="This chart demonstrates the empty data state"
        />
      </div>

      {/* Compact Configuration Test */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Compact Configuration Test
        </h2>
        <PopulationChart
          data={sampleData.slice(0, 20)} // First 20 generations only
          config={{
            height: 250,
            margin: { top: 10, right: 40, bottom: 40, left: 40 },
          }}
          title="Compact Population Chart"
          description="Smaller chart configuration for dashboard widgets"
          showAntibiotic={false}
          showLegend={false}
        />
      </div>
    </div>
  );
};

export default TestChart;
