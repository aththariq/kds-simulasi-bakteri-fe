/**
 * State management utilities for resistance analysis features
 * Using Zustand for efficient state management with persistence
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  AnalysisFilters,
  AnalysisSession,
  DatasetComparison,
  QueryBuilderState,
  SavedQuery,
  AnalysisUIState,
  FilterPanelState,
  ExportResult,
  TimeFilter,
  GeographicFilter,
  ResistanceMetricsFilter,
  QueryGroup,
} from "@/types/analysis";
import { ResistanceDataPoint } from "@/lib/resistance-analysis";

// ============================
// Default Values
// ============================

export const createDefaultTimeFilter = (): TimeFilter => ({
  granularity: "generation",
});

export const createDefaultGeographicFilter = (): GeographicFilter => ({});

export const createDefaultResistanceMetricsFilter =
  (): ResistanceMetricsFilter => ({});

export const createDefaultAnalysisFilters = (): AnalysisFilters => ({
  time: createDefaultTimeFilter(),
  geographic: createDefaultGeographicFilter(),
  metrics: createDefaultResistanceMetricsFilter(),
  active: false,
});

export const createDefaultQueryGroup = (): QueryGroup => ({
  id: crypto.randomUUID(),
  conditions: [],
  groups: [],
  logicalOperator: "AND",
});

export const createDefaultQueryBuilderState = (): QueryBuilderState => ({
  currentQuery: createDefaultQueryGroup(),
  savedQueries: [],
  isBuilding: false,
  validation: {
    isValid: true,
    errors: [],
    warnings: [],
  },
});

// ============================
// Analysis State Store
// ============================

interface AnalysisState {
  // Current session
  currentSession: AnalysisSession | null;

  // Data
  rawData: ResistanceDataPoint[];
  filteredData: ResistanceDataPoint[];

  // Filters
  filters: AnalysisFilters;
  quickFilters: Array<{ name: string; filters: Partial<AnalysisFilters> }>;

  // Query builder
  queryBuilder: QueryBuilderState;

  // Comparisons
  comparisons: DatasetComparison[];

  // UI state
  uiState: AnalysisUIState;
  filterPanelState: FilterPanelState;

  // Export results
  exportResults: ExportResult[];

  // Actions
  setRawData: (data: ResistanceDataPoint[]) => void;
  updateFilters: (filters: Partial<AnalysisFilters>) => void;
  clearFilters: () => void;
  applyQuickFilter: (name: string) => void;
  addQuickFilter: (name: string, filters: Partial<AnalysisFilters>) => void;
  removeQuickFilter: (name: string) => void;

  // Query builder actions
  updateQuery: (query: QueryGroup) => void;
  addQueryCondition: (groupId: string) => void;
  removeQueryCondition: (groupId: string, conditionId: string) => void;
  addQueryGroup: (parentGroupId: string) => void;
  removeQueryGroup: (parentGroupId: string, groupId: string) => void;
  saveQuery: (name: string, description?: string) => SavedQuery;
  loadSavedQuery: (queryId: string) => void;
  deleteQuery: (queryId: string) => void;

  // Comparison actions
  addComparison: (dataset: ResistanceDataPoint[], name: string) => void;
  removeComparison: (id: string) => void;
  updateComparison: (id: string, updates: Partial<DatasetComparison>) => void;

  // UI actions
  setActiveTab: (tab: AnalysisUIState["activeTab"]) => void;
  toggleSidebar: () => void;
  toggleFilterPanel: () => void;
  setLoading: (key: keyof AnalysisUIState["loading"], loading: boolean) => void;
  addError: (message: string, type?: "warning" | "error" | "info") => void;
  clearErrors: () => void;

  // Filter panel actions
  toggleTimeFilter: () => void;
  toggleGeographicFilter: () => void;
  toggleMetricsFilter: () => void;

  // Session management
  createSession: (name: string) => AnalysisSession;
  loadSession: (session: AnalysisSession) => void;
  saveSession: () => void;
  clearSession: () => void;

  // Export actions
  addExportResult: (result: ExportResult) => void;
  removeExportResult: (id: string) => void;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentSession: null,
      rawData: [],
      filteredData: [],
      filters: createDefaultAnalysisFilters(),
      quickFilters: [
        {
          name: "High Resistance",
          filters: {
            metrics: { minFrequency: 0.7 },
          },
        },
        {
          name: "Recent Data",
          filters: {
            time: { granularity: "generation" as const },
          },
        },
        {
          name: "Active HGT",
          filters: {
            metrics: { hgtEventRange: { min: 1, max: Infinity } },
          },
        },
      ],
      queryBuilder: createDefaultQueryBuilderState(),
      comparisons: [],
      uiState: {
        activeTab: "filters",
        sidebarExpanded: true,
        filterPanelExpanded: true,
        comparisonMode: "single",
        loading: {
          filters: false,
          data: false,
          export: false,
          comparison: false,
        },
        errors: [],
      },
      filterPanelState: {
        timeExpanded: true,
        geographicExpanded: false,
        metricsExpanded: false,
        quickFilters: [],
      },
      exportResults: [],

      // Data actions
      setRawData: data =>
        set(state => {
          state.rawData = data;
          state.filteredData = data;
        }),

      // Filter actions
      updateFilters: newFilters =>
        set(state => {
          state.filters = { ...state.filters, ...newFilters };
          state.filters.active = true;
        }),

      clearFilters: () =>
        set(state => {
          state.filters = createDefaultAnalysisFilters();
        }),

      applyQuickFilter: name =>
        set(state => {
          const quickFilter = state.quickFilters.find(
            (f: { name: string; filters: Partial<AnalysisFilters> }) =>
              f.name === name
          );
          if (quickFilter) {
            state.filters = { ...state.filters, ...quickFilter.filters };
            state.filters.active = true;
          }
        }),

      addQuickFilter: (name, filters) =>
        set(state => {
          const existingIndex = state.quickFilters.findIndex(
            (f: { name: string; filters: Partial<AnalysisFilters> }) =>
              f.name === name
          );
          if (existingIndex >= 0) {
            state.quickFilters[existingIndex] = { name, filters };
          } else {
            state.quickFilters.push({ name, filters });
          }
        }),

      removeQuickFilter: name =>
        set(state => {
          state.quickFilters = state.quickFilters.filter(
            (f: { name: string; filters: Partial<AnalysisFilters> }) =>
              f.name !== name
          );
        }),

      // Query builder actions
      updateQuery: query =>
        set(state => {
          state.queryBuilder.currentQuery = query;
        }),

      addQueryCondition: groupId =>
        set(state => {
          const addConditionToGroup = (group: QueryGroup): boolean => {
            if (group.id === groupId) {
              group.conditions.push({
                id: crypto.randomUUID(),
                field: "generation",
                operator: "equals",
                value: "",
              });
              return true;
            }
            return group.groups.some(addConditionToGroup);
          };
          addConditionToGroup(state.queryBuilder.currentQuery);
        }),

      removeQueryCondition: (groupId, conditionId) =>
        set(state => {
          const removeConditionFromGroup = (group: QueryGroup): boolean => {
            if (group.id === groupId) {
              group.conditions = group.conditions.filter(
                c => c.id !== conditionId
              );
              return true;
            }
            return group.groups.some(removeConditionFromGroup);
          };
          removeConditionFromGroup(state.queryBuilder.currentQuery);
        }),

      addQueryGroup: parentGroupId =>
        set(state => {
          const addGroupToParent = (group: QueryGroup): boolean => {
            if (group.id === parentGroupId) {
              group.groups.push(createDefaultQueryGroup());
              return true;
            }
            return group.groups.some(addGroupToParent);
          };
          addGroupToParent(state.queryBuilder.currentQuery);
        }),

      removeQueryGroup: (parentGroupId, groupId) =>
        set(state => {
          const removeGroupFromParent = (group: QueryGroup): boolean => {
            if (group.id === parentGroupId) {
              group.groups = group.groups.filter(g => g.id !== groupId);
              return true;
            }
            return group.groups.some(removeGroupFromParent);
          };
          removeGroupFromParent(state.queryBuilder.currentQuery);
        }),

      saveQuery: (name, description) => {
        const query: SavedQuery = {
          id: crypto.randomUUID(),
          name,
          description,
          query: { ...get().queryBuilder.currentQuery },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isPublic: false,
        };

        set(state => {
          state.queryBuilder.savedQueries.push(query);
        });

        return query;
      },

      loadSavedQuery: queryId =>
        set(state => {
          const savedQuery = state.queryBuilder.savedQueries.find(
            (q: SavedQuery) => q.id === queryId
          );
          if (savedQuery) {
            state.queryBuilder.currentQuery = { ...savedQuery.query };
          }
        }),

      deleteQuery: queryId =>
        set(state => {
          state.queryBuilder.savedQueries =
            state.queryBuilder.savedQueries.filter(
              (q: SavedQuery) => q.id !== queryId
            );
        }),

      // Comparison actions
      addComparison: (dataset, name) =>
        set(state => {
          const comparison: DatasetComparison = {
            id: crypto.randomUUID(),
            name,
            datasets: [
              {
                id: crypto.randomUUID(),
                name: "Primary Dataset",
                data: state.filteredData,
              },
              {
                id: crypto.randomUUID(),
                name,
                data: dataset,
              },
            ],
            viewMode: "side-by-side",
            selectedMetric: "resistance_frequency",
            syncBrush: true,
            showStatistics: true,
            createdAt: new Date().toISOString(),
          };
          state.comparisons.push(comparison);
        }),

      removeComparison: id =>
        set(state => {
          state.comparisons = state.comparisons.filter(
            (c: DatasetComparison) => c.id !== id
          );
        }),

      updateComparison: (id, updates) =>
        set(state => {
          const index = state.comparisons.findIndex(
            (c: DatasetComparison) => c.id === id
          );
          if (index >= 0) {
            state.comparisons[index] = {
              ...state.comparisons[index],
              ...updates,
            };
          }
        }),

      // UI actions
      setActiveTab: tab =>
        set(state => {
          state.uiState.activeTab = tab;
        }),

      toggleSidebar: () =>
        set(state => {
          state.uiState.sidebarExpanded = !state.uiState.sidebarExpanded;
        }),

      toggleFilterPanel: () =>
        set(state => {
          state.uiState.filterPanelExpanded =
            !state.uiState.filterPanelExpanded;
        }),

      setLoading: (key, loading) =>
        set(state => {
          state.uiState.loading[key] = loading;
        }),

      addError: (message, type = "error") =>
        set(state => {
          state.uiState.errors.push({
            message,
            type,
            timestamp: new Date().toISOString(),
          });
        }),

      clearErrors: () =>
        set(state => {
          state.uiState.errors = [];
        }),

      // Filter panel actions
      toggleTimeFilter: () =>
        set(state => {
          state.filterPanelState.timeExpanded =
            !state.filterPanelState.timeExpanded;
        }),

      toggleGeographicFilter: () =>
        set(state => {
          state.filterPanelState.geographicExpanded =
            !state.filterPanelState.geographicExpanded;
        }),

      toggleMetricsFilter: () =>
        set(state => {
          state.filterPanelState.metricsExpanded =
            !state.filterPanelState.metricsExpanded;
        }),

      // Session management
      createSession: name => {
        const session: AnalysisSession = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          filters: { ...get().filters },
          activeComparisons: [...get().comparisons],
          savedQueries: get().queryBuilder.savedQueries.map(
            (q: SavedQuery) => q.id
          ),
          visualizationState: {
            activeCharts: [],
            chartConfigurations: {},
            layoutMode: "grid",
          },
          exportedResults: [...get().exportResults],
        };

        set(state => {
          state.currentSession = session;
        });

        return session;
      },

      loadSession: session =>
        set(state => {
          state.currentSession = session;
          state.filters = { ...session.filters };
          state.comparisons = [...session.activeComparisons];
          state.exportResults = [...session.exportedResults];
        }),

      saveSession: () =>
        set(state => {
          if (state.currentSession) {
            state.currentSession.updatedAt = new Date().toISOString();
            state.currentSession.filters = { ...state.filters };
            state.currentSession.activeComparisons = [...state.comparisons];
            state.currentSession.exportedResults = [...state.exportResults];
          }
        }),

      clearSession: () =>
        set(state => {
          state.currentSession = null;
          state.filters = createDefaultAnalysisFilters();
          state.comparisons = [];
          state.queryBuilder = createDefaultQueryBuilderState();
          state.exportResults = [];
        }),

      // Export actions
      addExportResult: result =>
        set(state => {
          state.exportResults.push(result);
        }),

      removeExportResult: id =>
        set(state => {
          state.exportResults = state.exportResults.filter(
            (r: ExportResult) => r.id !== id
          );
        }),
    })),
    {
      name: "resistance-analysis-store",
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        filters: state.filters,
        quickFilters: state.quickFilters,
        queryBuilder: {
          ...state.queryBuilder,
          previewData: undefined, // Don't persist preview data
        },
        uiState: {
          ...state.uiState,
          loading: {
            filters: false,
            data: false,
            export: false,
            comparison: false,
          },
          errors: [],
        },
        filterPanelState: state.filterPanelState,
        currentSession: state.currentSession,
      }),
    }
  )
);

// ============================
// Utility Functions
// ============================

export const getFilteredData = (
  data: ResistanceDataPoint[],
  filters: AnalysisFilters
): ResistanceDataPoint[] => {
  if (!filters.active) return data;

  return data.filter(point => {
    // Time filtering
    const { time } = filters;
    if (
      time.startGeneration !== undefined &&
      point.generation < time.startGeneration
    ) {
      return false;
    }
    if (
      time.endGeneration !== undefined &&
      point.generation > time.endGeneration
    ) {
      return false;
    }
    if (time.startDate && point.timestamp < time.startDate) {
      return false;
    }
    if (time.endDate && point.timestamp > time.endDate) {
      return false;
    }

    // Metrics filtering
    const { metrics } = filters;
    if (
      metrics.minFrequency !== undefined &&
      point.resistanceFrequency < metrics.minFrequency
    ) {
      return false;
    }
    if (
      metrics.maxFrequency !== undefined &&
      point.resistanceFrequency > metrics.maxFrequency
    ) {
      return false;
    }
    if (
      metrics.minPopulation !== undefined &&
      point.totalPopulation < metrics.minPopulation
    ) {
      return false;
    }
    if (
      metrics.maxPopulation !== undefined &&
      point.totalPopulation > metrics.maxPopulation
    ) {
      return false;
    }
    if (metrics.hgtEventRange) {
      const { min, max } = metrics.hgtEventRange;
      if (point.hgtEvents < min || point.hgtEvents > max) {
        return false;
      }
    }
    if (metrics.mutationEventRange) {
      const { min, max } = metrics.mutationEventRange;
      if (point.mutationEvents < min || point.mutationEvents > max) {
        return false;
      }
    }
    if (metrics.selectedGenes && metrics.selectedGenes.length > 0) {
      const hasSelectedGenes = metrics.selectedGenes.some(
        gene => point.geneFrequencies[gene] && point.geneFrequencies[gene] > 0
      );
      if (!hasSelectedGenes) {
        return false;
      }
    }

    return true;
  });
};
