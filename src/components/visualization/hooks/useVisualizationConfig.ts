import { useState, useEffect, useCallback, useMemo } from "react";

// Base configuration types
export interface ThemeConfig {
  mode: "light" | "dark" | "auto";
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    grid: string;
    axis: string;
  };
  chart: {
    totalPopulation: string;
    resistantPopulation: string;
    sensitivePopulation: string;
    antibioticConcentration: string;
    fitnessScore: string;
    mutationRate: string;
  };
}

export interface ChartConfig {
  type: "line" | "area" | "bar" | "scatter";
  height: number;
  responsive: boolean;
  animation: {
    enabled: boolean;
    duration: number;
    easing: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  };
  grid: {
    show: boolean;
    strokeDasharray: string;
    opacity: number;
  };
  legend: {
    show: boolean;
    position: "top" | "bottom" | "left" | "right";
    align: "start" | "center" | "end";
  };
  tooltip: {
    enabled: boolean;
    shared: boolean;
    formatter?: "default" | "scientific" | "percentage";
  };
  axes: {
    x: AxisConfig;
    y: AxisConfig;
  };
}

export interface AxisConfig {
  show: boolean;
  label: string;
  scale: "linear" | "log" | "time";
  domain?: [number, number] | "auto";
  tickCount?: number | "auto";
  tickFormat?: string;
  grid: boolean;
}

export interface LayoutConfig {
  containerSpacing: number;
  cardPadding: number;
  headerHeight: number;
  sidebarWidth: number;
  breakpoints: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  responsive: {
    columns: {
      default: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    aspectRatio: {
      default: number;
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };
}

export interface DataConfig {
  refreshInterval: number;
  maxDataPoints: number;
  bufferSize: number;
  compression: boolean;
  autoSave: boolean;
  autoExport: boolean;
  saveInterval: number;
  exportFormat: "json" | "csv" | "xlsx";
  precision: number;
}

export interface VisualizationConfig {
  theme: ThemeConfig;
  chart: ChartConfig;
  layout: LayoutConfig;
  data: DataConfig;
  features: {
    realTimeUpdates: boolean;
    dataExport: boolean;
    sessionManagement: boolean;
    multiChartSupport: boolean;
    zoomControls: boolean;
    fullscreen: boolean;
  };
  performance: {
    enableOptimizations: boolean;
    frameRate: number;
    debounceMs: number;
    virtualScrolling: boolean;
  };
}

// Default configurations
const defaultTheme: ThemeConfig = {
  mode: "light",
  colors: {
    primary: "#3b82f6",
    secondary: "#64748b",
    accent: "#06b6d4",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    grid: "#f1f5f9",
    axis: "#94a3b8",
  },
  chart: {
    totalPopulation: "#3b82f6",
    resistantPopulation: "#ef4444",
    sensitivePopulation: "#22c55e",
    antibioticConcentration: "#f59e0b",
    fitnessScore: "#8b5cf6",
    mutationRate: "#ec4899",
  },
};

const defaultChart: ChartConfig = {
  type: "line",
  height: 400,
  responsive: true,
  animation: {
    enabled: true,
    duration: 300,
    easing: "ease-out",
  },
  grid: {
    show: true,
    strokeDasharray: "3 3",
    opacity: 0.3,
  },
  legend: {
    show: true,
    position: "bottom",
    align: "center",
  },
  tooltip: {
    enabled: true,
    shared: true,
    formatter: "default",
  },
  axes: {
    x: {
      show: true,
      label: "Generation",
      scale: "linear",
      domain: "auto",
      tickCount: "auto",
      grid: true,
    },
    y: {
      show: true,
      label: "Population",
      scale: "linear",
      domain: "auto",
      tickCount: "auto",
      grid: true,
    },
  },
};

const defaultLayout: LayoutConfig = {
  containerSpacing: 24,
  cardPadding: 16,
  headerHeight: 64,
  sidebarWidth: 280,
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  responsive: {
    columns: {
      default: 1,
      sm: 1,
      md: 2,
      lg: 3,
      xl: 4,
    },
    aspectRatio: {
      default: 16 / 9,
      mobile: 4 / 3,
      tablet: 16 / 10,
      desktop: 16 / 9,
    },
  },
};

const defaultData: DataConfig = {
  refreshInterval: 1000,
  maxDataPoints: 1000,
  bufferSize: 50,
  compression: false,
  autoSave: true,
  autoExport: false,
  saveInterval: 30000,
  exportFormat: "json",
  precision: 2,
};

const defaultConfig: VisualizationConfig = {
  theme: defaultTheme,
  chart: defaultChart,
  layout: defaultLayout,
  data: defaultData,
  features: {
    realTimeUpdates: true,
    dataExport: true,
    sessionManagement: true,
    multiChartSupport: true,
    zoomControls: true,
    fullscreen: true,
  },
  performance: {
    enableOptimizations: true,
    frameRate: 60,
    debounceMs: 100,
    virtualScrolling: false,
  },
};

// Configuration validation
export const validateConfig = (
  config: Partial<VisualizationConfig>
): string[] => {
  const errors: string[] = [];

  if (
    config.chart?.height &&
    (config.chart.height < 100 || config.chart.height > 2000)
  ) {
    errors.push("Chart height must be between 100 and 2000 pixels");
  }

  if (config.data?.maxDataPoints && config.data.maxDataPoints < 10) {
    errors.push("Maximum data points must be at least 10");
  }

  if (config.data?.refreshInterval && config.data.refreshInterval < 100) {
    errors.push("Refresh interval must be at least 100ms");
  }

  if (
    config.performance?.frameRate &&
    (config.performance.frameRate < 1 || config.performance.frameRate > 120)
  ) {
    errors.push("Frame rate must be between 1 and 120 FPS");
  }

  return errors;
};

// Configuration merge utility - deep merge approach
export const mergeConfig = (
  baseConfig: VisualizationConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides: any
): VisualizationConfig => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergeObjects = (base: any, override: any): any => {
    if (!override) return base;

    const result = { ...base };
    for (const key in override) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseValue = (base as any)[key];
      const overrideValue = override[key];

      if (overrideValue !== undefined) {
        if (
          baseValue &&
          typeof baseValue === "object" &&
          !Array.isArray(baseValue) &&
          overrideValue &&
          typeof overrideValue === "object" &&
          !Array.isArray(overrideValue)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result as any)[key] = mergeObjects(baseValue, overrideValue);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result as any)[key] = overrideValue;
        }
      }
    }
    return result;
  };

  return mergeObjects(baseConfig, overrides);
};

// Configuration preset types
export type ConfigPreset =
  | "minimal"
  | "standard"
  | "advanced"
  | "performance"
  | "research";

// Alias for easier import
export type PresetName = ConfigPreset;

// Utility type for deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Configuration presets
export const configPresets: Record<
  ConfigPreset,
  {
    chart?: DeepPartial<ChartConfig>;
    theme?: DeepPartial<ThemeConfig>;
    layout?: DeepPartial<LayoutConfig>;
    data?: Partial<DataConfig>;
    features?: Partial<VisualizationConfig["features"]>;
    performance?: Partial<VisualizationConfig["performance"]>;
  }
> = {
  minimal: {
    features: {
      realTimeUpdates: false,
      dataExport: false,
      sessionManagement: false,
      multiChartSupport: false,
      zoomControls: false,
      fullscreen: false,
    },
  },
  standard: {
    // Uses default configuration
  },
  advanced: {
    chart: {
      height: 500,
    },
    features: {
      realTimeUpdates: true,
      dataExport: true,
      sessionManagement: true,
      multiChartSupport: true,
      zoomControls: true,
      fullscreen: true,
    },
    data: {
      maxDataPoints: 2000,
      compression: true,
    },
  },
  performance: {
    chart: {
      animation: { enabled: false },
    },
    data: {
      bufferSize: 100,
      maxDataPoints: 500,
    },
    performance: {
      enableOptimizations: true,
      frameRate: 30,
      debounceMs: 200,
      virtualScrolling: true,
    },
  },
  research: {
    chart: {
      height: 600,
      tooltip: { formatter: "scientific" as const },
      axes: {
        x: { tickFormat: ".2f" },
        y: { scale: "log" as const },
      },
    },
    data: {
      precision: 4,
      exportFormat: "csv" as const,
      maxDataPoints: 5000,
    },
    features: {
      realTimeUpdates: true,
      dataExport: true,
      sessionManagement: true,
      multiChartSupport: true,
      zoomControls: true,
      fullscreen: true,
    },
  },
};

// Export with better name for component use
export const PRESET_CONFIGS: Record<
  PresetName,
  {
    name: string;
    description: string;
    config: {
      chart?: DeepPartial<ChartConfig>;
      theme?: DeepPartial<ThemeConfig>;
      layout?: DeepPartial<LayoutConfig>;
      data?: Partial<DataConfig>;
      features?: Partial<VisualizationConfig["features"]>;
      performance?: Partial<VisualizationConfig["performance"]>;
    };
  }
> = {
  minimal: {
    name: "Minimal",
    description: "Basic",
    config: configPresets.minimal,
  },
  standard: {
    name: "Standard",
    description: "Balanced",
    config: configPresets.standard,
  },
  advanced: {
    name: "Advanced",
    description: "Feature-rich",
    config: configPresets.advanced,
  },
  performance: {
    name: "Performance",
    description: "Optimized",
    config: configPresets.performance,
  },
  research: {
    name: "Research",
    description: "Analysis",
    config: configPresets.research,
  },
};

// Hook interface
export interface UseVisualizationConfigOptions {
  storageKey?: string;
  initialConfig?: Partial<VisualizationConfig>;
  preset?: ConfigPreset;
  enablePersistence?: boolean;
}

export interface UseVisualizationConfigReturn {
  config: VisualizationConfig;
  updateConfig: (updates: Partial<VisualizationConfig>) => void;
  resetConfig: () => void;
  resetToPreset: (preset: ConfigPreset) => void;
  applyPreset: (preset: ConfigPreset) => void;
  validateConfig: (config?: Partial<VisualizationConfig>) => string[];
  exportConfig: () => string;
  importConfig: (configJson: string) => boolean;
  isDirty: boolean;
  errors: string[];
  isLoading: boolean;
  error: string | null;
}

// Main configuration hook
export const useVisualizationConfig = (
  options: UseVisualizationConfigOptions = {}
): UseVisualizationConfigReturn => {
  const {
    storageKey = "visualization-config",
    initialConfig = {},
    preset = "standard",
    enablePersistence = true,
  } = options;

  // Initialize configuration
  const [config, setConfig] = useState<VisualizationConfig>(() => {
    if (enablePersistence) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedConfig = JSON.parse(stored);
          return mergeConfig(defaultConfig, parsedConfig);
        }
      } catch (error) {
        console.warn("Failed to load stored configuration:", error);
      }
    }

    const presetConfig = configPresets[preset];
    const merged = mergeConfig(defaultConfig, presetConfig);
    return mergeConfig(merged, initialConfig);
  });

  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Memoized validation
  const validationErrors = useMemo(() => {
    return validateConfig(config);
  }, [config]);

  // Update errors when validation changes
  useEffect(() => {
    setErrors(validationErrors);
  }, [validationErrors]);

  // Persist configuration to localStorage
  useEffect(() => {
    if (enablePersistence && isDirty) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
      } catch (error) {
        console.warn("Failed to persist configuration:", error);
      }
    }
  }, [config, isDirty, enablePersistence, storageKey]);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<VisualizationConfig>) => {
    setConfig(prev => {
      const newConfig = mergeConfig(prev, updates);
      setIsDirty(true);
      return newConfig;
    });
  }, []);

  // Reset to default configuration
  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    setIsDirty(false);
    if (enablePersistence) {
      localStorage.removeItem(storageKey);
    }
  }, [enablePersistence, storageKey]);

  // Apply preset configuration
  const applyPreset = useCallback((presetName: ConfigPreset) => {
    const presetConfig = configPresets[presetName];
    const newConfig = mergeConfig(defaultConfig, presetConfig);
    setConfig(newConfig);
    setIsDirty(true);
  }, []);

  // Export configuration as JSON string
  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  // Import configuration from JSON string
  const importConfig = useCallback((configJson: string): boolean => {
    try {
      const importedConfig = JSON.parse(configJson);
      const validationErrors = validateConfig(importedConfig);

      if (validationErrors.length > 0) {
        console.warn("Invalid configuration:", validationErrors);
        return false;
      }

      const newConfig = mergeConfig(defaultConfig, importedConfig);
      setConfig(newConfig);
      setIsDirty(true);
      return true;
    } catch (error) {
      console.error("Failed to import configuration:", error);
      return false;
    }
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    resetToPreset: useCallback((preset: ConfigPreset) => {
      const presetConfig = configPresets[preset];
      const newConfig = mergeConfig(defaultConfig, presetConfig);
      setConfig(newConfig);
      setIsDirty(true);
    }, []),
    applyPreset,
    validateConfig: useCallback(cfg => validateConfig(cfg || config), [config]),
    exportConfig,
    importConfig,
    isDirty,
    errors,
    isLoading: false,
    error: null,
  };
};
