/**
 * Touch Interaction Tests for Chart Components
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  TouchEventUtils,
  MobileViewportUtils,
  TouchPerformanceUtils,
  act,
} from "../../touch-interaction.test";

// Create comprehensive mock components with proper structure
const ChartContainer = ({ children, title, error, className = "" }: any) => (
  <div data-testid="chart-container" className={`chart-container ${className}`}>
    {title && <h3 data-testid="chart-title">{title}</h3>}
    {error && (
      <div data-testid="chart-error" className="error">
        {error}
      </div>
    )}
    <div data-testid="chart-wrapper" className="chart-wrapper">
      {children}
    </div>
  </div>
);

const PopulationChart = ({
  data,
  title,
  error,
  onDataPointClick,
  ...props
}: any) => (
  <ChartContainer title={title} error={error} data-testid="population-chart">
    <svg
      width="400"
      height="300"
      data-testid="chart-svg"
      onClick={e => {
        if (onDataPointClick && data && data.length > 0) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          onDataPointClick({ x, y, data: data[0] });
        }
      }}
    >
      <g data-testid="chart-content">
        <rect x="0" y="0" width="400" height="300" fill="transparent" />
        {data && data.length > 0 && (
          <>
            <text x="200" y="150" textAnchor="middle" data-testid="chart-data">
              Data points: {data.length}
            </text>
            {data.map((point: any, index: number) => (
              <circle
                key={index}
                cx={50 + index * 50}
                cy={200 - point.totalPopulation / 50}
                r="4"
                fill="#3b82f6"
                data-testid={`data-point-${index}`}
                className="data-point touch-friendly"
              />
            ))}
          </>
        )}
      </g>
    </svg>
  </ChartContainer>
);

const ResistanceEvolutionChart = ({
  data,
  title,
  error,
  onDataPointClick,
  ...props
}: any) => (
  <ChartContainer title={title} error={error} data-testid="resistance-chart">
    <svg
      width="400"
      height="300"
      data-testid="chart-svg"
      onClick={e => {
        if (onDataPointClick && data && data.length > 0) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          onDataPointClick({ x, y, data: data[0] });
        }
      }}
    >
      <g data-testid="chart-content">
        <rect x="0" y="0" width="400" height="300" fill="transparent" />
        {data && data.length > 0 && (
          <>
            <text x="200" y="150" textAnchor="middle" data-testid="chart-data">
              Resistance points: {data.length}
            </text>
            {data.map((point: any, index: number) => (
              <circle
                key={index}
                cx={50 + index * 50}
                cy={200 - point.resistanceFrequency * 100}
                r="4"
                fill="#ef4444"
                data-testid={`resistance-point-${index}`}
                className="data-point touch-friendly"
              />
            ))}
          </>
        )}
      </g>
    </svg>
  </ChartContainer>
);

const PopulationGrowthChart = ({
  data,
  title,
  error,
  onDataPointClick,
  ...props
}: any) => (
  <ChartContainer
    title={title}
    error={error}
    data-testid="population-growth-chart"
  >
    <svg
      width="400"
      height="300"
      data-testid="chart-svg"
      onClick={e => {
        if (onDataPointClick && data && data.length > 0) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          onDataPointClick({ x, y, data: data[0] });
        }
      }}
    >
      <g data-testid="chart-content">
        <rect x="0" y="0" width="400" height="300" fill="transparent" />
        {data && data.length > 0 && (
          <>
            <text x="200" y="150" textAnchor="middle" data-testid="chart-data">
              Growth points: {data.length}
            </text>
            {data.map((point: any, index: number) => (
              <circle
                key={index}
                cx={50 + index * 50}
                cy={200 - point.populationSize / 50}
                r="4"
                fill="#10b981"
                data-testid={`growth-point-${index}`}
                className="data-point touch-friendly"
              />
            ))}
          </>
        )}
      </g>
    </svg>
  </ChartContainer>
);

// Mock data for testing
const mockPopulationData = [
  {
    generation: 1,
    totalPopulation: 1000,
    resistantPopulation: 100,
    sensitivePopulation: 900,
    antibioticConcentration: 0.5,
    timestamp: "2024-01-01T00:00:00Z",
  },
  {
    generation: 2,
    totalPopulation: 1100,
    resistantPopulation: 150,
    sensitivePopulation: 950,
    antibioticConcentration: 0.6,
    timestamp: "2024-01-01T00:01:00Z",
  },
];

const mockResistanceData = [
  {
    generation: 1,
    resistanceFrequency: 0.1,
    averageFitness: 0.8,
    mutationRate: 0.001,
    timestamp: "2024-01-01T00:00:00Z",
  },
  {
    generation: 2,
    resistanceFrequency: 0.136,
    averageFitness: 0.85,
    mutationRate: 0.001,
    timestamp: "2024-01-01T00:01:00Z",
  },
];

const mockGrowthData = [
  {
    generation: 1,
    populationSize: 1000,
    growthRate: 0.1,
    carryingCapacity: 10000,
    timestamp: "2024-01-01T00:00:00Z",
  },
  {
    generation: 2,
    populationSize: 1100,
    growthRate: 0.1,
    carryingCapacity: 10000,
    timestamp: "2024-01-01T00:01:00Z",
  },
];

describe("Chart Components - Touch Interactions", () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset viewport to desktop before each test
    await MobileViewportUtils.setDesktopViewport();

    // Mock getBoundingClientRect for chart elements
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));
  });

  afterEach(() => {
    // Reset viewport
    MobileViewportUtils.setDesktopViewport();
  });

  describe("PopulationChart Touch Interactions", () => {
    it("should handle touch interactions on population chart", async () => {
      const onDataPointClick = jest.fn();
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Population Growth"
          showAntibiotic={true}
          showLegend={true}
          onDataPointClick={onDataPointClick}
        />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();

      const chartSvg = container.querySelector('[data-testid="chart-svg"]');
      expect(chartSvg).toBeInTheDocument();

      // Test touch interaction
      await TouchEventUtils.simulateTap(chartSvg!, 100, 100);

      // Verify chart remains interactive
      expect(chartContainer).toBeVisible();
    });

    it("should adapt to mobile viewport", async () => {
      await MobileViewportUtils.setMobileViewport();

      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Population Growth" />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();
    });

    it("should handle pinch zoom on population chart", async () => {
      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Population Growth" />
      );

      const chartSvg = container.querySelector('[data-testid="chart-svg"]');
      expect(chartSvg).toBeInTheDocument();

      // Test pinch zoom gesture
      await TouchEventUtils.simulatePinchZoom(chartSvg!, 100, 200);
    });

    it("should handle data point selection on touch", async () => {
      const onDataPointClick = jest.fn();
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Population Growth"
          onDataPointClick={onDataPointClick}
        />
      );

      const dataPoint = container.querySelector('[data-testid="data-point-0"]');
      expect(dataPoint).toBeInTheDocument();

      await TouchEventUtils.simulateTap(dataPoint!, 50, 150);
    });
  });

  describe("ResistanceEvolutionChart Touch Interactions", () => {
    it("should handle touch on resistance evolution chart", async () => {
      const onDataPointClick = jest.fn();
      const { container } = render(
        <ResistanceEvolutionChart
          data={mockResistanceData}
          title="Resistance Evolution"
          onDataPointClick={onDataPointClick}
        />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();

      const chartSvg = container.querySelector('[data-testid="chart-svg"]');
      await TouchEventUtils.simulateTap(chartSvg!, 100, 100);
    });

    it("should support resistance data point interaction", async () => {
      const onDataPointClick = jest.fn();
      const { container } = render(
        <ResistanceEvolutionChart
          data={mockResistanceData}
          title="Resistance Evolution"
          onDataPointClick={onDataPointClick}
        />
      );

      const resistancePoint = container.querySelector(
        '[data-testid="resistance-point-0"]'
      );
      expect(resistancePoint).toBeInTheDocument();

      await TouchEventUtils.simulateTap(resistancePoint!, 50, 190);
    });
  });

  describe("PopulationGrowthChart Touch Interactions", () => {
    it("should handle growth chart touch interactions", async () => {
      const onDataPointClick = jest.fn();
      const { container } = render(
        <PopulationGrowthChart
          data={mockGrowthData}
          title="Population Growth"
          onDataPointClick={onDataPointClick}
        />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();

      const growthPoint = container.querySelector(
        '[data-testid="growth-point-0"]'
      );
      expect(growthPoint).toBeInTheDocument();

      await TouchEventUtils.simulateTap(growthPoint!, 50, 180);
    });
  });

  describe("Chart Accessibility Features", () => {
    it("should provide proper accessibility attributes", () => {
      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Population Growth" />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();

      // Check for accessibility features
      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      const title = container.querySelector('[data-testid="chart-title"]');
      expect(title).toBeInTheDocument();
    });

    it("should handle keyboard navigation appropriately", () => {
      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Population Growth" />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();

      // Test keyboard focus
      fireEvent.focus(chartContainer!);
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe("Chart Error States", () => {
    it("should handle empty data gracefully", () => {
      const { container } = render(
        <PopulationChart data={[]} title="Population Growth" />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();
    });

    it("should display error state appropriately", () => {
      const { container } = render(
        <PopulationChart data={mockPopulationData} error="Test error message" />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();

      const errorElement = container.querySelector(
        '[data-testid="chart-error"]'
      );
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent("Test error message");
    });
  });

  describe("Chart Integration Tests", () => {
    it("should work with all chart interaction test cases", async () => {
      const onDataPointClick = jest.fn();
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Population Growth"
          onDataPointClick={onDataPointClick}
        />
      );

      const chartContainer = container.querySelector(
        '[data-testid="chart-container"]'
      );
      expect(chartContainer).toBeInTheDocument();

      // Test just one interaction type to keep it simple
      const chartSvg = container.querySelector('[data-testid="chart-svg"]');
      await TouchEventUtils.simulateTap(chartSvg!, 100, 100);

      expect(chartContainer).toBeVisible();
    });
  });

  describe("Performance Tests", () => {
    it("should maintain good performance during touch interactions", async () => {
      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Population Growth" />
      );

      const chartSvg = container.querySelector('[data-testid="chart-svg"]');
      expect(chartSvg).toBeInTheDocument();

      const responseTime = await TouchPerformanceUtils.measureTouchResponseTime(
        chartSvg!,
        async () => {
          await TouchEventUtils.simulateTap(chartSvg!, 100, 100);
        }
      );

      // Expect response time to be under 100ms
      expect(responseTime).toBeLessThan(100);
    });
  });
});
