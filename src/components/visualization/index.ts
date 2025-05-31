// Export all visualization components for bacterial simulation charts

// Core chart components
export { BaseChart } from "./BaseChart";
export type { ChartDataPoint, ChartConfig } from "./BaseChart";

export { PopulationChart } from "./PopulationChart";
export { ResistanceEvolutionChart } from "./ResistanceEvolutionChart";
export { PopulationGrowthChart } from "./PopulationGrowthChart";
export { MutationTrackingChart } from "./MutationTrackingChart";

// Spatial visualization
export { default as PetriDishVisualization } from "./PetriDishVisualization";
export type {
  PetriDishData,
  Bacterium as SpatialBacterium,
  AntibioticZone,
  GridStatistics,
} from "./PetriDishVisualization";

// Data processing and transformation
export * from "./DataTransformers";

// Interactive features and controls
export { ChartControls } from "./ChartControls";
export type {
  ChartControlsProps,
  ChartViewMode,
  TimeRange,
  SeriesVisibility,
} from "./ChartControls";

export { ChartTooltip } from "./ChartTooltip";
export { InteractiveChart } from "./InteractiveChart";
export type {
  InteractiveChartProps,
  InteractiveChartConfig,
} from "./InteractiveChart";

// Performance optimization
export {
  useHighPerformanceChartData,
  usePerformanceMonitor,
  PerformanceUtils,
  default as ChartPerformance,
} from "./ChartPerformance";
export type {
  PerformanceConfig,
  PerformanceMetrics,
  SamplingStrategy,
} from "./ChartPerformance";

export {
  AdvancedPerformanceOptimizer,
  default as AdvancedPerformanceOptimizerExport,
} from "./AdvancedPerformanceOptimizer";
export type {
  AdvancedPerformanceConfig,
  OptimizationMode,
  DeviceCapabilities,
} from "./AdvancedPerformanceOptimizer";

export {
  HighPerformanceChart,
  withHighPerformance,
  HighPerformancePopulationChart,
  HighPerformanceResistanceChart,
  HighPerformanceGrowthChart,
  HighPerformanceMutationChart,
} from "./HighPerformanceChart";
export type {
  HighPerformanceChartProps,
  HighPerformanceChartType,
} from "./HighPerformanceChart";

// Theming and styling
export {
  ThemeProvider,
  useTheme,
  themePresets,
  colorUtils,
  responsive,
  chartStyles,
} from "./ChartTheme";
export type { ChartTheme } from "./ChartTheme";

export {
  ResponsiveChartContainer,
  useResponsiveChart,
} from "./ResponsiveChartContainer";
export type {
  ResponsiveChartContainerProps,
  DeviceType,
  Orientation,
  ResponsiveConfig,
} from "./ResponsiveChartContainer";

// Additional components
export { default as ResultsDashboard } from "./ResultsDashboard";
export type { ResultsDashboardProps } from "./ResultsDashboard";
export { PerformanceMonitor } from "./PerformanceMonitor";
export { ConfigurationPreview } from "./ConfigurationPreview";
export type { ConfigurationPreviewProps } from "./ConfigurationPreview";
export { ConfigurationPanel } from "./ConfigurationPanel";
export { ConfigurationDemo } from "./ConfigurationDemo";
export { DataBindingDemo } from "./DataBindingDemo";
export { default as SimulationDashboard } from "./SimulationDashboard";
export { default as ResponsiveTest } from "./ResponsiveTest";
export { default as TestChart } from "./TestChart";

// Canvas-based optimized visualization components
export { default as CanvasPetriDishRenderer } from "./CanvasPetriDishRenderer";
export type { CanvasPetriDishRendererRef } from "./CanvasPetriDishRenderer";
export { default as OptimizedPetriDishVisualization } from "./OptimizedPetriDishVisualization";
export { default as PerformanceTest } from "./PerformanceTest";

// Statistical visualization components
export { ResistanceStatisticalCharts } from "./ResistanceStatisticalCharts";
export type {
  ResistanceStatisticalChartsProps,
  HistogramBin,
  BoxPlotData,
  StatisticalSummary,
  ComparativeDataset,
  SynchronizedChartState,
} from "./ResistanceStatisticalCharts";

// D3.js visualization components
export * from "./d3";
