// D3.js Visualization Components for Resistance Distribution Analysis
export { ResistanceHeatmap } from "./ResistanceHeatmap";
export { ResistanceNetworkGraph } from "./ResistanceNetworkGraph";
export { ResistanceChoroplethMap } from "./ResistanceChoroplethMap";

// Re-export types for external use
export type {
  HeatmapData,
  HeatmapConfig,
  HeatmapTooltipData,
  ResistanceHeatmapRef,
  ResistanceHeatmapProps,
} from "./ResistanceHeatmap";

export type {
  NetworkNode,
  NetworkLink,
  NetworkGraphConfig,
  NetworkGraphTooltipData,
  ResistanceNetworkGraphRef,
  ResistanceNetworkGraphProps,
} from "./ResistanceNetworkGraph";

export type {
  SpatialDataPoint,
  ChoroplethRegion,
  ChoroplethConfig,
  ChoroplethTooltipData,
  ResistanceChoroplethMapRef,
  ResistanceChoroplethMapProps,
} from "./ResistanceChoroplethMap";
