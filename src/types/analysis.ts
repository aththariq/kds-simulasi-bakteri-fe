/**
 * TypeScript interfaces for interactive resistance analysis features
 */

import {
  ResistanceDataPoint,
  ResistancePattern,
} from "@/lib/resistance-analysis";
import { SpatialPoint, SpatialCluster } from "@/lib/spatial-clustering";

// ============================
// Filter Types
// ============================

export interface TimeFilter {
  startGeneration?: number;
  endGeneration?: number;
  startDate?: string;
  endDate?: string;
  granularity: "generation" | "day" | "week" | "month";
}

export interface GeographicFilter {
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  selectedRegions?: string[];
  clusterIds?: number[];
  spatialRadius?: {
    center: { x: number; y: number };
    radius: number;
  };
}

export interface ResistanceMetricsFilter {
  minFrequency?: number;
  maxFrequency?: number;
  selectedGenes?: string[];
  resistanceThreshold?: number;
  minPopulation?: number;
  maxPopulation?: number;
  hgtEventRange?: {
    min: number;
    max: number;
  };
  mutationEventRange?: {
    min: number;
    max: number;
  };
}

export interface AnalysisFilters {
  time: TimeFilter;
  geographic: GeographicFilter;
  metrics: ResistanceMetricsFilter;
  active: boolean;
}

// ============================
// Query Builder Types
// ============================

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "between"
  | "not_between"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with";

export type LogicalOperator = "AND" | "OR" | "NOT";

export interface QueryCondition {
  id: string;
  field: keyof ResistanceDataPoint;
  operator: FilterOperator;
  value: unknown;
  secondaryValue?: unknown; // For 'between' operations
  logicalOperator?: LogicalOperator;
}

export interface QueryGroup {
  id: string;
  conditions: QueryCondition[];
  groups: QueryGroup[];
  logicalOperator: LogicalOperator;
  negated?: boolean;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: QueryGroup;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
  author?: string;
}

export interface QueryBuilderState {
  currentQuery: QueryGroup;
  savedQueries: SavedQuery[];
  isBuilding: boolean;
  previewData?: ResistanceDataPoint[];
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// ============================
// Comparison Types
// ============================

export type ComparisonViewMode = "overlay" | "side-by-side";

export interface DatasetInfo {
  id: string;
  name: string;
  data: ResistanceDataPoint[];
}

export interface DatasetComparison {
  id: string;
  name: string;
  datasets: DatasetInfo[];
  viewMode: ComparisonViewMode;
  selectedMetric: string;
  syncBrush: boolean;
  showStatistics: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StatisticalTest {
  name: string;
  statistic: number;
  pValue: number;
  criticalValue?: number;
  significant: boolean;
}

export interface ComparisonMetrics {
  tTest?: StatisticalTest;
  correlation?: number;
  effectSize?: number;
  meanDifference?: number;
  standardError?: number;
  confidenceInterval?: [number, number];
}

// ============================
// Analysis Session Types
// ============================

export interface AnalysisSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  filters: AnalysisFilters;
  activeComparisons: DatasetComparison[];
  savedQueries: string[]; // Query IDs
  visualizationState: {
    activeCharts: string[];
    chartConfigurations: Record<string, unknown>;
    layoutMode: "grid" | "tabs" | "split";
  };
  exportedResults: ExportResult[];
}

export interface ExportResult {
  id: string;
  name: string;
  type: "csv" | "json" | "pdf" | "png" | "svg";
  data: unknown;
  metadata: {
    generatedAt: string;
    filters: AnalysisFilters;
    dataSize: number;
    analysisType: string;
  };
  downloadUrl?: string;
}

// ============================
// UI State Types
// ============================

export interface AnalysisUIState {
  activeTab: "filters" | "comparison" | "query" | "export";
  sidebarExpanded: boolean;
  filterPanelExpanded: boolean;
  comparisonMode: "single" | "multiple";
  loading: {
    filters: boolean;
    data: boolean;
    export: boolean;
    comparison: boolean;
  };
  errors: {
    message: string;
    type: "warning" | "error" | "info";
    timestamp: string;
  }[];
}

export interface FilterPanelState {
  timeExpanded: boolean;
  geographicExpanded: boolean;
  metricsExpanded: boolean;
  quickFilters: {
    name: string;
    filters: Partial<AnalysisFilters>;
  }[];
}

// ============================
// Analysis Hook Types
// ============================

export interface UseResistanceAnalysisOptions {
  autoApplyFilters?: boolean;
  debounceMs?: number;
  enableCaching?: boolean;
  maxCacheSize?: number;
}

export interface UseResistanceAnalysisReturn {
  // Data
  filteredData: ResistanceDataPoint[];
  rawData: ResistanceDataPoint[];
  spatialData: SpatialPoint[];
  clusters: SpatialCluster[];

  // State
  filters: AnalysisFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  updateFilters: (filters: Partial<AnalysisFilters>) => void;
  clearFilters: () => void;
  applyQuickFilter: (name: string) => void;
  exportData: (format: ExportResult["type"]) => Promise<ExportResult>;

  // Query builder
  queryBuilder: QueryBuilderState;
  updateQuery: (query: QueryGroup) => void;
  executeQuery: () => void;
  saveQuery: (name: string, description?: string) => Promise<SavedQuery>;

  // Comparison
  comparisons: DatasetComparison[];
  addComparison: (dataset: ResistanceDataPoint[], name: string) => void;
  removeComparison: (id: string) => void;
  calculateComparisonMetrics: (
    comparisonId: string
  ) => Promise<ComparisonMetrics>;
}

// ============================
// Component Props Types
// ============================

export interface ResistanceAnalysisFiltersProps {
  filters: AnalysisFilters;
  onFiltersChange: (filters: Partial<AnalysisFilters>) => void;
  availableGenes: string[];
  availableRegions: string[];
  dataRange: {
    minGeneration: number;
    maxGeneration: number;
    minDate: string;
    maxDate: string;
  };
  className?: string;
}

export interface ResistanceComparisonProps {
  comparisons: DatasetComparison[];
  onAddComparison: (dataset: ResistanceDataPoint[], name: string) => void;
  onRemoveComparison: (id: string) => void;
  className?: string;
}

export interface ResistanceQueryBuilderProps {
  queryState: QueryBuilderState;
  onQueryChange: (query: QueryGroup) => void;
  onExecuteQuery: () => void;
  onSaveQuery: (name: string, description?: string) => Promise<void>;
  availableFields: Array<{
    key: keyof ResistanceDataPoint;
    label: string;
    type: "number" | "string" | "date" | "boolean";
    options?: unknown[];
  }>;
  className?: string;
}

export interface InteractiveAnalysisDashboardProps {
  initialData: ResistanceDataPoint[];
  sessionId?: string;
  onSessionSave?: (session: AnalysisSession) => void;
  className?: string;
}
