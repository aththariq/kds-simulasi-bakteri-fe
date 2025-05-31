import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock data generators for testing
export const mockSimulationData = {
  generations: Array.from({ length: 100 }, (_, i) => ({
    generation: i,
    totalPopulation: 1000 + Math.random() * 500,
    resistantCount: Math.floor(Math.random() * 100),
    susceptibleCount: 1000 - Math.floor(Math.random() * 100),
    timestamp: new Date(Date.now() + i * 1000).toISOString(),
  })),
};

export const mockBacteriumData = {
  id: "test-bacterium-1",
  position: { x: 50, y: 50 },
  fitness: 0.8,
  resistance: {
    ampicillin: true,
    tetracycline: false,
  },
  generation: 5,
};

export const mockSpatialData = {
  bacteria: Array.from({ length: 50 }, (_, i) => ({
    id: `bacterium-${i}`,
    position: {
      x: Math.random() * 100,
      y: Math.random() * 100,
    },
    fitness: Math.random(),
    resistance: {
      ampicillin: Math.random() > 0.5,
      tetracycline: Math.random() > 0.7,
    },
    generation: Math.floor(Math.random() * 10),
  })),
  antibioticZones: [
    {
      center: { x: 25, y: 25 },
      radius: 10,
      concentration: 0.8,
      type: "ampicillin",
    },
  ],
};

// Common test helpers
export const createMockWebSocket = () => {
  const mockWs = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };
  return mockWs;
};

export const waitForNextTick = () =>
  new Promise(resolve => setTimeout(resolve, 0));

// Custom user event setup
export const createUser = () => userEvent.setup();

// Re-export everything
export * from "@testing-library/react";
export { userEvent };
