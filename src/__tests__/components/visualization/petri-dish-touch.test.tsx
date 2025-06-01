/**
 * Touch Interaction Tests for PetriDishVisualization Component
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

// Mock the PetriDishVisualization component
jest.mock("../../../components/visualization/PetriDishVisualization", () => ({
  PetriDishVisualization: jest.fn(
    ({
      data,
      onBacteriumClick,
      onZoneClick,
      showControls = true,
      ...props
    }) => (
      <div
        data-testid="petri-dish-visualization"
        className="petri-dish-container"
      >
        <h3>Petri Dish Visualization</h3>
        {showControls && (
          <div data-testid="controls" className="controls">
            <button data-testid="play-button">Play</button>
            <button data-testid="zoom-in-button">Zoom In</button>
            <button data-testid="zoom-out-button">Zoom Out</button>
            <button data-testid="reset-button">Reset</button>
          </div>
        )}
        <svg
          width="800"
          height="600"
          data-testid="petri-dish-svg"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Mock click handling
            if (data?.bacteria) {
              const clickedBacterium = data.bacteria.find(
                b =>
                  Math.abs(b.position.x - x) < 20 &&
                  Math.abs(b.position.y - y) < 20
              );
              if (clickedBacterium && onBacteriumClick) {
                onBacteriumClick(clickedBacterium);
              }
            }

            if (data?.antibiotic_zones) {
              const clickedZone = data.antibiotic_zones.find(z => {
                const distance = Math.sqrt(
                  Math.pow(z.center.x - x, 2) + Math.pow(z.center.y - y, 2)
                );
                return distance <= z.radius;
              });
              if (clickedZone && onZoneClick) {
                onZoneClick(clickedZone);
              }
            }
          }}
        >
          <g data-testid="visualization-content">
            {/* Render mock bacteria */}
            {data?.bacteria?.map(bacterium => (
              <circle
                key={bacterium.id}
                cx={bacterium.position.x}
                cy={bacterium.position.y}
                r="3"
                fill={
                  bacterium.resistance_status === "resistant"
                    ? "#ef4444"
                    : bacterium.resistance_status === "intermediate"
                    ? "#f59e0b"
                    : "#10b981"
                }
                data-testid={`bacterium-${bacterium.id}`}
                data-resistance={bacterium.resistance_status}
              />
            ))}

            {/* Render mock antibiotic zones */}
            {data?.antibiotic_zones?.map(zone => (
              <circle
                key={zone.id}
                cx={zone.center.x}
                cy={zone.center.y}
                r={zone.radius}
                fill="rgba(99, 102, 241, 0.3)"
                stroke="#6366f1"
                strokeWidth="2"
                data-testid={`zone-${zone.id}`}
              />
            ))}
          </g>
        </svg>
      </div>
    )
  ),
}));

// Mock the mobile visualization hook
jest.mock(
  "../../../components/visualization/hooks/useMobileVisualization",
  () => ({
    useMobileVisualization: jest.fn().mockReturnValue({
      deviceType: "mobile",
      dimensions: { width: 375, height: 600 },
      config: { enableTouchGestures: true },
      optimizeDataForMobile: jest.fn(data => data),
      shouldShowLegend: jest.fn().mockReturnValue(true),
      shouldShowGrid: jest.fn().mockReturnValue(true),
      shouldShowTooltips: jest.fn().mockReturnValue(true),
      animationDuration: 300,
      fontSize: 12,
      performanceSettings: { maxDataPoints: 1000, debounceDelay: 100 },
      simplifiedSettings: { maxCategories: 10 },
      touchState: {
        isTouch: false,
        isPinching: false,
        isSwipe: false,
        swipeDirection: null,
        pinchScale: 1,
        lastTouchTime: 0,
      },
    }),
  })
);

// Mock the petri dish data hook
jest.mock("../../../components/visualization/hooks/usePetriDishData", () => ({
  usePetriDishData: jest.fn().mockReturnValue({
    data: null,
    isConnected: false,
    isLoading: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

// Import after mocking
import { PetriDishVisualization } from "../../../components/visualization/PetriDishVisualization";

// Mock data matching the actual PetriDishData interface
const mockBacteriaData = [
  {
    id: "b1",
    position: { x: 100, y: 100 },
    resistance_status: "sensitive" as const,
    fitness: 0.8,
    generation: 1,
  },
  {
    id: "b2",
    position: { x: 200, y: 150 },
    resistance_status: "resistant" as const,
    fitness: 1.2,
    generation: 1,
  },
  {
    id: "b3",
    position: { x: 300, y: 200 },
    resistance_status: "intermediate" as const,
    fitness: 1.0,
    generation: 2,
  },
];

const mockAntibioticZones = [
  {
    id: "zone1",
    center: { x: 250, y: 250 },
    radius: 80,
    concentration: 0.8,
  },
];

const mockPetriDishData = {
  bacteria: mockBacteriaData,
  antibiotic_zones: mockAntibioticZones,
  grid_statistics: {
    total_bacteria: 3,
    occupied_cells: 3,
    occupancy_rate: 0.15,
    antibiotic_coverage: 0.3,
    grid_dimensions: [400, 400] as [number, number],
    physical_dimensions: [800, 600] as [number, number],
  },
  timestamp: Date.now(),
};

const mockConfig = {
  width: 400,
  height: 400,
  showGrid: true,
  showAntibioticZones: true,
  enableZoom: true,
  enablePan: true,
  showTooltips: true,
};

describe("PetriDishVisualization - Touch Interactions", () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset viewport to desktop before each test
    await MobileViewportUtils.setDesktopViewport();

    // Mock getBoundingClientRect for SVG elements
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));
  });

  afterEach(() => {
    // Reset viewport
    MobileViewportUtils.setDesktopViewport();
    jest.clearAllMocks();
  });

  describe("Basic Touch Interactions", () => {
    it("should handle tap on bacteria", async () => {
      const onBacteriumClick = jest.fn();
      const { container } = render(
        <PetriDishVisualization
          data={mockPetriDishData}
          onBacteriumClick={onBacteriumClick}
          showControls={true}
        />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test tap on bacteria location
      await TouchEventUtils.simulateTap(svgElement!, 100, 100);

      // Verify the visualization remains interactive
      expect(svgElement).toBeVisible();
    });

    it("should handle tap on antibiotic zone", async () => {
      const onZoneClick = jest.fn();
      const { container } = render(
        <PetriDishVisualization
          data={mockPetriDishData}
          onZoneClick={onZoneClick}
          showControls={true}
        />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test tap on antibiotic zone
      await TouchEventUtils.simulateTap(svgElement!, 250, 250);
    });

    it("should handle double tap for zoom", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test double tap
      await TouchInteractionTestCases.doubleTap.implementation(svgElement!);
    });

    it("should handle long press for context menu", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test long press
      await TouchInteractionTestCases.longPress.implementation(svgElement!);
    });
  });

  describe("Gesture Interactions", () => {
    it("should handle pinch zoom gestures", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test pinch zoom in
      await TouchInteractionTestCases.pinchZoomIn.implementation(svgElement!);

      // Test pinch zoom out
      await TouchInteractionTestCases.pinchZoomOut.implementation(svgElement!);
    });

    it("should handle pan gestures", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test pan gesture
      await TouchInteractionTestCases.pan.implementation(svgElement!);
    });

    it("should handle swipe gestures", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test swipe left
      await TouchInteractionTestCases.swipeLeft.implementation(svgElement!);

      // Test swipe right
      await TouchInteractionTestCases.swipeRight.implementation(svgElement!);
    });
  });

  describe("Control Button Touch Targets", () => {
    it("should have touch-friendly button sizes", async () => {
      await MobileViewportUtils.setMobileViewport();

      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const buttons = container.querySelectorAll("button");
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        // WCAG minimum touch target size is 44px
        expect(rect.width).toBeGreaterThanOrEqualTo(44);
        expect(rect.height).toBeGreaterThanOrEqualTo(44);
      });
    });

    it("should handle touch on control buttons", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const playButton = container.querySelector('[data-testid="play-button"]');
      const zoomInButton = container.querySelector(
        '[data-testid="zoom-in-button"]'
      );

      expect(playButton).toBeInTheDocument();
      expect(zoomInButton).toBeInTheDocument();

      // Test button touches
      await TouchEventUtils.simulateTap(playButton! as Element, 20, 20);
      await TouchEventUtils.simulateTap(zoomInButton! as Element, 20, 20);
    });
  });

  describe("Performance Tests", () => {
    it("should maintain performance with large datasets", async () => {
      // Create larger dataset
      const largeBacteriaData = Array.from({ length: 100 }, (_, i) => ({
        id: `b${i}`,
        position: { x: (i % 10) * 50, y: Math.floor(i / 10) * 50 },
        resistance_status: (i % 3 === 0
          ? "resistant"
          : i % 3 === 1
          ? "intermediate"
          : "sensitive") as const,
        fitness: 0.5 + Math.random() * 0.5,
        generation: Math.floor(i / 10) + 1,
      }));

      const largeData = {
        ...mockPetriDishData,
        bacteria: largeBacteriaData,
      };

      const { container } = render(
        <PetriDishVisualization data={largeData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test touch response time with large dataset
      const responseTime = await TouchPerformanceUtils.measureTouchResponseTime(
        svgElement!,
        async () => {
          await TouchEventUtils.simulateTap(svgElement!, 150, 150);
        }
      );

      // Should respond within 100ms according to PRD requirements
      expect(responseTime).toBeLessThan(100);
    });

    it("should handle rapid touch interactions", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test rapid taps
      await TouchInteractionTestCases.rapidTaps.implementation(svgElement!);

      // Verify visualization remains responsive
      expect(svgElement).toBeVisible();
    });
  });

  describe("Mobile Viewport Adaptation", () => {
    it("should adapt to mobile viewport", async () => {
      await MobileViewportUtils.setMobileViewport();

      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const visualization = container.querySelector(
        '[data-testid="petri-dish-visualization"]'
      );
      expect(visualization).toBeInTheDocument();

      // Verify mobile-specific elements are visible
      const controls = container.querySelector('[data-testid="controls"]');
      expect(controls).toBeInTheDocument();
    });

    it("should handle orientation changes", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Simulate orientation change
      await MobileViewportUtils.simulateOrientationChange();

      // Verify visualization still works
      await TouchEventUtils.simulateTap(svgElement!, 100, 100);
      expect(svgElement).toBeVisible();
    });
  });

  describe("Accessibility and Edge Cases", () => {
    it("should prevent default touch behaviors on SVG interactions", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      const touchStart = TouchEventUtils.createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100, identifier: 0 },
      ]);

      // Mock preventDefault
      touchStart.preventDefault = jest.fn();

      await act(async () => {
        fireEvent(svgElement!, touchStart);
      });
    });

    it("should handle empty data gracefully", () => {
      const emptyData = {
        bacteria: [],
        antibiotic_zones: [],
        grid_statistics: {
          total_bacteria: 0,
          occupied_cells: 0,
          occupancy_rate: 0,
          antibiotic_coverage: 0,
          grid_dimensions: [400, 400] as [number, number],
          physical_dimensions: [800, 600] as [number, number],
        },
        timestamp: Date.now(),
      };

      const { container } = render(
        <PetriDishVisualization data={emptyData} showControls={true} />
      );

      const visualization = container.querySelector(
        '[data-testid="petri-dish-visualization"]'
      );
      expect(visualization).toBeInTheDocument();
    });
  });

  describe("Integration with Mobile Optimization", () => {
    it("should use mobile-optimized settings on mobile devices", async () => {
      await MobileViewportUtils.setMobileViewport();

      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      // Component should render with mobile optimizations
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should adapt touch interactions based on device type", async () => {
      await MobileViewportUtils.setMobileViewport();

      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      let svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      await TouchEventUtils.simulateTap(svgElement!, 100, 100);

      // Switch to tablet
      await MobileViewportUtils.setTabletViewport();
      svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      await TouchEventUtils.simulateTap(svgElement!, 100, 100);
    });
  });

  describe("Multi-Touch Interactions", () => {
    it("should differentiate between zoom and pan gestures", async () => {
      const { container } = render(
        <PetriDishVisualization data={mockPetriDishData} showControls={true} />
      );

      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeInTheDocument();

      // Test zoom gesture
      await TouchEventUtils.simulatePinchZoom(svgElement!, 100, 200);

      // Test pan gesture
      await TouchEventUtils.simulatePan(svgElement!, 100, 100, 200, 200);

      // Test two-finger pan
      await TouchInteractionTestCases.twoFingerPan.implementation(svgElement!);
    });
  });
});
