import "@testing-library/jest-dom";
import "jest-canvas-mock";

// Extend Jest matchers
expect.extend({
  toBeGreaterThanOrEqualTo(received, expected) {
    const pass = received >= expected;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be greater than or equal to ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be greater than or equal to ${expected}`,
        pass: false,
      };
    }
  },
});

// Mock D3.js modules for visualization tests
jest.mock("d3", () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      data: jest.fn(() => ({
        enter: jest.fn(() => ({
          append: jest.fn(() => ({
            attr: jest.fn(() => ({
              style: jest.fn(),
              on: jest.fn(),
            })),
            style: jest.fn(),
            on: jest.fn(),
          })),
        })),
        exit: jest.fn(() => ({
          remove: jest.fn(),
        })),
        attr: jest.fn(),
        style: jest.fn(),
        on: jest.fn(),
      })),
    })),
    append: jest.fn(() => ({
      attr: jest.fn(),
      style: jest.fn(),
    })),
    attr: jest.fn(),
    style: jest.fn(),
    on: jest.fn(),
  })),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  })),
  scaleOrdinal: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  })),
  axisBottom: jest.fn(),
  axisLeft: jest.fn(),
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  })),
  zoomTransform: jest.fn(() => ({
    k: 1,
    x: 0,
    y: 0,
  })),
  drag: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
}));

// Mock Canvas API for D3.js and visualization components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock WebSocket for testing real-time functionality
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
}));

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  })
);

// Mock Response for MSW
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || "OK";
    this.headers = new Map(Object.entries(init.headers || {}));
    this.ok = this.status >= 200 && this.status < 300;
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }

  text() {
    return Promise.resolve(this.body);
  }
};

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance.now for timing tests
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
  };
}

// Mock getBoundingClientRect for SVG elements
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 375,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 375,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

// Suppress console warnings for tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = (...args) => {
    const message = args[0];
    if (typeof message === "string") {
      // Suppress React prop validation warnings that are expected in tests
      if (
        message.includes("Received `true` for a non-boolean attribute") ||
        message.includes("Received `false` for a non-boolean attribute") ||
        message.includes("validateDOMNesting") ||
        message.includes("React does not recognize") ||
        message.includes('Each child in a list should have a unique "key" prop')
      ) {
        return;
      }
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === "string") {
      // Suppress specific warnings
      if (
        message.includes("componentWillReceiveProps") ||
        message.includes("componentWillMount") ||
        message.includes("findDOMNode is deprecated")
      ) {
        return;
      }
    }
    originalWarn.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
