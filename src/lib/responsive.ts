// Responsive utility system for consistent mobile optimization

// Breakpoint definitions (matching Tailwind defaults)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// Touch target sizes for mobile accessibility
export const touchTargets = {
  minimum: 44, // WCAG minimum touch target size
  comfortable: 48, // Comfortable touch target size
  large: 56, // Large touch target for primary actions
} as const;

// Responsive spacing system
export const spacing = {
  mobile: {
    xs: "space-y-2",
    sm: "space-y-3",
    md: "space-y-4",
    lg: "space-y-6",
    xl: "space-y-8",
  },
  desktop: {
    xs: "space-y-3",
    sm: "space-y-4",
    md: "space-y-6",
    lg: "space-y-8",
    xl: "space-y-12",
  },
} as const;

// Responsive padding system
export const padding = {
  card: {
    mobile: "p-4",
    desktop: "p-6",
    responsive: "p-4 md:p-6",
  },
  form: {
    mobile: "p-3",
    desktop: "p-4",
    responsive: "p-3 md:p-4",
  },
  section: {
    mobile: "px-4 py-3",
    desktop: "px-6 py-4",
    responsive: "px-4 py-3 md:px-6 md:py-4",
  },
} as const;

// Responsive typography system
export const typography = {
  heading: {
    h1: "text-2xl md:text-3xl font-bold",
    h2: "text-xl md:text-2xl font-bold",
    h3: "text-lg md:text-xl font-semibold",
    h4: "text-base md:text-lg font-semibold",
  },
  body: {
    large: "text-base md:text-lg",
    normal: "text-sm md:text-base",
    small: "text-xs md:text-sm",
  },
  label: {
    normal: "text-sm md:text-base font-medium",
    small: "text-xs md:text-sm font-medium",
  },
} as const;

// Touch-friendly button classes
export const buttons = {
  touch: {
    small: `h-11 px-4 text-sm`, // 44px minimum height
    medium: `h-12 px-6 text-base`, // 48px comfortable height
    large: `h-14 px-8 text-lg`, // 56px large height
  },
  preset: {
    mobile: `h-11 px-3 text-xs`, // Touch-friendly preset buttons
    desktop: `h-8 px-2 text-xs`, // Original compact size for desktop
    responsive: `h-11 px-3 text-xs md:h-8 md:px-2`, // Responsive preset buttons
  },
} as const;

// Grid system utilities
export const grids = {
  form: {
    single: "grid grid-cols-1 gap-4 md:gap-6",
    double: "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6",
    triple: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6",
  },
  stats: {
    responsive: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4",
  },
  dashboard: {
    charts: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6",
  },
} as const;

// Responsive hook for JavaScript breakpoint detection
export const useResponsiveBreakpoint = () => {
  if (typeof window === "undefined") return "lg"; // SSR fallback

  const width = window.innerWidth;
  if (width >= breakpoints["2xl"]) return "2xl";
  if (width >= breakpoints.xl) return "xl";
  if (width >= breakpoints.lg) return "lg";
  if (width >= breakpoints.md) return "md";
  if (width >= breakpoints.sm) return "sm";
  return "xs";
};

// Utility function to check if current viewport is mobile
export const isMobile = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoints.md;
};

// Utility function to check if current viewport is tablet
export const isTablet = () => {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg
  );
};

// Utility function to check if current viewport is desktop
export const isDesktop = () => {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= breakpoints.lg;
};

// Collapsible section utilities
export const collapsible = {
  trigger: "flex items-center justify-between w-full p-3 md:p-4 text-left",
  content: "overflow-hidden transition-all duration-200 ease-in-out",
  icon: "h-5 w-5 transition-transform duration-200",
} as const;

// Form field spacing
export const formField = {
  container: "space-y-2 md:space-y-3",
  label: "flex items-center gap-2 text-sm md:text-base font-medium",
  input: "w-full",
  help: "text-xs md:text-sm text-muted-foreground",
  error: "text-xs md:text-sm text-red-600",
} as const;

// Mobile visualization optimization utilities
export const visualization = {
  // Chart dimensions for different screen sizes
  dimensions: {
    mobile: {
      width: 320,
      height: 200,
      margin: { top: 20, right: 20, bottom: 40, left: 40 },
    },
    tablet: {
      width: 600,
      height: 350,
      margin: { top: 30, right: 30, bottom: 50, left: 60 },
    },
    desktop: {
      width: 800,
      height: 450,
      margin: { top: 40, right: 40, bottom: 60, left: 80 },
    },
  },
  // Touch-friendly interaction settings
  touch: {
    minTouchTarget: 44, // Minimum touch target size in pixels
    tapRadius: 20, // Touch detection radius
    longPressDelay: 500, // Long press detection delay
    swipeThreshold: 50, // Minimum swipe distance
  },
  // Performance settings for mobile
  performance: {
    mobile: {
      maxDataPoints: 100,
      animationDuration: 300,
      debounceDelay: 150,
      enableVirtualization: true,
    },
    tablet: {
      maxDataPoints: 500,
      animationDuration: 500,
      debounceDelay: 100,
      enableVirtualization: false,
    },
    desktop: {
      maxDataPoints: 1000,
      animationDuration: 750,
      debounceDelay: 50,
      enableVirtualization: false,
    },
  },
  // Simplified view configurations
  simplified: {
    mobile: {
      showLegend: false,
      showTooltips: true,
      showAxes: true,
      showGrid: false,
      maxCategories: 5,
      fontSize: "12px",
    },
    tablet: {
      showLegend: true,
      showTooltips: true,
      showAxes: true,
      showGrid: true,
      maxCategories: 10,
      fontSize: "14px",
    },
    desktop: {
      showLegend: true,
      showTooltips: true,
      showAxes: true,
      showGrid: true,
      maxCategories: 20,
      fontSize: "14px",
    },
  },
} as const;

// Mobile-specific chart configurations
export const chartConfig = {
  mobile: {
    heatmap: {
      cellSize: 15,
      maxGenes: 8,
      maxGenerations: 20,
      showLabels: false,
    },
    network: {
      nodeSize: 8,
      maxNodes: 50,
      showLabels: false,
      enableZoom: true,
    },
    petriDish: {
      gridSize: 20,
      showGrid: false,
      enablePanZoom: true,
      simplifiedRendering: true,
    },
    line: {
      strokeWidth: 2,
      maxDataPoints: 100,
      showPoints: false,
      showGrid: false,
      enableZoom: true,
    },
    bar: {
      barWidth: 20,
      maxBars: 20,
      showValues: false,
      spacing: 2,
    },
  },
  tablet: {
    heatmap: {
      cellSize: 20,
      maxGenes: 15,
      maxGenerations: 50,
      showLabels: true,
    },
    network: {
      nodeSize: 12,
      maxNodes: 100,
      showLabels: true,
      enableZoom: true,
    },
    petriDish: {
      gridSize: 50,
      showGrid: true,
      enablePanZoom: true,
      simplifiedRendering: false,
    },
    line: {
      strokeWidth: 2,
      maxDataPoints: 500,
      showPoints: true,
      showGrid: true,
      enableZoom: true,
    },
    bar: {
      barWidth: 30,
      maxBars: 50,
      showValues: true,
      spacing: 4,
    },
  },
  desktop: {
    heatmap: {
      cellSize: 25,
      maxGenes: 20,
      maxGenerations: 100,
      showLabels: true,
    },
    network: {
      nodeSize: 16,
      maxNodes: 200,
      showLabels: true,
      enableZoom: true,
    },
    petriDish: {
      gridSize: 100,
      showGrid: true,
      enablePanZoom: true,
      simplifiedRendering: false,
    },
    line: {
      strokeWidth: 3,
      maxDataPoints: 1000,
      showPoints: true,
      showGrid: true,
      enableZoom: true,
    },
    bar: {
      barWidth: 40,
      maxBars: 100,
      showValues: true,
      spacing: 6,
    },
  },
} as const;

// Touch gesture utilities
export const gestures = {
  // Detect touch gestures
  detectSwipe: (startX: number, startY: number, endX: number, endY: number) => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < visualization.touch.swipeThreshold) return null;

    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    if (angle >= -45 && angle <= 45) return "right";
    if (angle >= 45 && angle <= 135) return "down";
    if (angle >= 135 || angle <= -135) return "left";
    if (angle >= -135 && angle <= -45) return "up";

    return null;
  },

  // Detect pinch gesture
  detectPinch: (
    touch1: Touch,
    touch2: Touch,
    prevTouch1: Touch,
    prevTouch2: Touch
  ) => {
    const currentDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );

    const prevDistance = Math.sqrt(
      Math.pow(prevTouch2.clientX - prevTouch1.clientX, 2) +
        Math.pow(prevTouch2.clientY - prevTouch1.clientY, 2)
    );

    return currentDistance / prevDistance;
  },
} as const;
