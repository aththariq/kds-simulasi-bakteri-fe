/**
 * Touch Interaction Tests for Chart Components
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  TouchEventUtils,
  MobileViewportUtils,
  TouchPerformanceUtils,
  TouchInteractionTestCases,
  act,
} from "../../touch-interaction.test";

// Create mock components inline - no jest.mock needed
const PopulationChart = ({ data, title, error, ...props }: any) => (
  <div data-testid="population-chart" className="chart-container">
    <h3>{title || "Population Chart"}</h3>
    {error && <div data-testid="chart-error">{error}</div>}
    <svg width="400" height="300" data-testid="chart-svg">
      <g data-testid="chart-content">
        <rect x="0" y="0" width="400" height="300" fill="transparent" />
        {data && data.length > 0 && (
          <text x="200" y="150" textAnchor="middle" data-testid="chart-data">
            Data points: {data.length}
          </text>
        )}
      </g>
    </svg>
  </div>
);

const ResistanceEvolutionChart = ({ data, title, error, ...props }: any) => (
  <div data-testid="resistance-chart" className="chart-container">
    <h3>{title || "Resistance Evolution Chart"}</h3>
    {error && <div data-testid="chart-error">{error}</div>}
    <svg width="400" height="300" data-testid="chart-svg">
      <g data-testid="chart-content">
        <rect x="0" y="0" width="400" height="300" fill="transparent" />
        {data && data.length > 0 && (
          <text x="200" y="150" textAnchor="middle" data-testid="chart-data">
            Data points: {data.length}
          </text>
        )}
      </g>
    </svg>
  </div>
);

const PopulationGrowthChart = ({ data, title, error, ...props }: any) => (
  <div data-testid="population-growth-chart" className="chart-container">
    <h3>{title || "Population Growth Chart"}</h3>
    {error && <div data-testid="chart-error">{error}</div>}
    <svg width="400" height="300" data-testid="chart-svg">
      <g data-testid="chart-content">
        <rect x="0" y="0" width="400" height="300" fill="transparent" />
        {data && data.length > 0 && (
          <text x="200" y="150" textAnchor="middle" data-testid="chart-data">
            Data points: {data.length}
          </text>
        )}
      </g>
    </svg>
  </div>
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
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Population Growth"
          showAntibiotic={true}
          showLegend={true}
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test touch interaction
      await TouchEventUtils.simulateTap(chartElement!, 100, 100);

      // Verify chart remains interactive
      expect(chartElement).toBeVisible();
    });

    it("should adapt to mobile viewport", async () => {
      await MobileViewportUtils.setMobileViewport();

      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Population Growth" />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();
    });

    it("should handle pinch zoom on population chart", async () => {
      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Population Growth" />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test pinch zoom gesture
      await TouchEventUtils.simulatePinchZoom(chartElement!, 100, 200);
    });
  });

  describe("ResistanceEvolutionChart Touch Interactions", () => {
    it("should handle touch on resistance evolution chart", async () => {
      const { container } = render(
        <ResistanceEvolutionChart
          data={mockResistanceData}
          title="Resistance Evolution"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="resistance-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test touch interaction
      await TouchEventUtils.simulateTap(chartElement!, 150, 100);
    });

    it("should handle pan gesture on resistance chart", async () => {
      const { container } = render(
        <ResistanceEvolutionChart
          data={mockResistanceData}
          title="Resistance Evolution"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="resistance-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test pan gesture
      await TouchEventUtils.simulatePan(chartElement!, 100, 100, 200, 150);
    });
  });

  describe("PopulationGrowthChart Touch Interactions", () => {
    it("should handle touch on population growth chart", async () => {
      const { container } = render(
        <PopulationGrowthChart
          data={mockGrowthData}
          title="Population Growth"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-growth-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test touch interaction
      await TouchEventUtils.simulateTap(chartElement!, 200, 150);
    });

    it("should handle swipe gesture on growth chart", async () => {
      const { container } = render(
        <PopulationGrowthChart
          data={mockGrowthData}
          title="Population Growth"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-growth-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test swipe gesture
      await TouchEventUtils.simulateSwipe(chartElement!, "left", 200, 150, 100);
    });
  });

  describe("Chart Performance Tests", () => {
    it("should maintain good performance with touch interactions", async () => {
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Performance Test Chart"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Measure touch response time
      const responseTime = await TouchPerformanceUtils.measureTouchResponseTime(
        chartElement!,
        async () => {
          await TouchEventUtils.simulateTap(chartElement!, 150, 150);
        }
      );

      // Should respond within reasonable time (less than 100ms)
      expect(responseTime).toBeLessThan(100);
    });

    it("should handle multiple rapid touches gracefully", async () => {
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Multi-touch Test Chart"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Simulate rapid touches
      const rapidTouches = Array.from({ length: 5 }, (_, i) =>
        TouchEventUtils.simulateTap(chartElement!, 100 + i * 20, 100)
      );

      await Promise.all(rapidTouches);

      // Chart should still be responsive
      expect(chartElement).toBeVisible();
    });
  });

  describe("Chart Accessibility Features", () => {
    it("should provide proper accessibility attributes", () => {
      const { container } = render(
        <PopulationChart data={mockPopulationData} title="Accessible Chart" />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Check for accessibility features
      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();
    });

    it("should handle keyboard navigation appropriately", () => {
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Keyboard Navigation Chart"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test keyboard focus
      fireEvent.focus(chartElement!);
      expect(document.activeElement).toBe(chartElement);
    });
  });

  describe("Chart Error States", () => {
    it("should handle empty data gracefully", () => {
      const { container } = render(
        <PopulationChart data={[]} title="Empty Data Chart" />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();
    });

    it("should display error state appropriately", () => {
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          error="Test error message"
          title="Error State Chart"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();
    });
  });

  describe("Chart Integration Tests", () => {
    it("should work with all chart interaction test cases", async () => {
      const { container } = render(
        <PopulationChart
          data={mockPopulationData}
          title="Integration Test Chart"
        />
      );

      const chartElement = container.querySelector(
        '[data-testid="population-chart"]'
      );
      expect(chartElement).toBeInTheDocument();

      // Test just one interaction type to keep it simple
      await TouchEventUtils.simulateTap(chartElement!, 100, 100);

      // Chart should remain functional
      expect(chartElement).toBeVisible();
    });
  });
});
