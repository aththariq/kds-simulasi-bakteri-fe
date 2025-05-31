/**
 * Custom hook for resistance analysis functionality
 * Integrates state management, data processing, and analysis features
 */

import { useEffect, useMemo, useCallback } from "react";
import { useAnalysisStore, getFilteredData } from "@/lib/analysis-state";
import {
  UseResistanceAnalysisOptions,
  UseResistanceAnalysisReturn,
  ComparisonMetrics,
  ExportResult,
} from "@/types/analysis";
import { ResistanceDataPoint } from "@/lib/resistance-analysis";
import {
  SpatialClusteringAnalyzer,
  SpatialPoint,
  SpatialCluster,
} from "@/lib/spatial-clustering";
import { useDebounce } from "./useDebounce";

// Statistical analysis utilities
const calculateTTest = (
  sample1: number[],
  sample2: number[]
): {
  statistic: number;
  pValue: number;
  significant: boolean;
  confidenceInterval: [number, number];
} => {
  const n1 = sample1.length;
  const n2 = sample2.length;

  if (n1 === 0 || n2 === 0) {
    return {
      statistic: 0,
      pValue: 1,
      significant: false,
      confidenceInterval: [0, 0],
    };
  }

  const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n1;
  const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n2;

  const var1 =
    sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
  const var2 =
    sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);

  const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  const standardError = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));

  const tStatistic = (mean1 - mean2) / standardError;
  const degreesOfFreedom = n1 + n2 - 2;

  // Simplified p-value calculation (using normal approximation for large samples)
  const pValue = 2 * (1 - normalCDF(Math.abs(tStatistic)));
  const significant = pValue < 0.05;

  // 95% confidence interval
  const criticalValue = 1.96; // Approximate for large samples
  const marginOfError = criticalValue * standardError;
  const confidenceInterval: [number, number] = [
    mean1 - mean2 - marginOfError,
    mean1 - mean2 + marginOfError,
  ];

  return { statistic: tStatistic, pValue, significant, confidenceInterval };
};

const normalCDF = (x: number): number => {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
};

const erf = (x: number): number => {
  // Approximation of error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
};

const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;

  for (let i = 0; i < n; i++) {
    const deltaX = x[i] - meanX;
    const deltaY = y[i] - meanY;
    numerator += deltaX * deltaY;
    sumXSquared += deltaX * deltaX;
    sumYSquared += deltaY * deltaY;
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  return denominator === 0 ? 0 : numerator / denominator;
};

export const useResistanceAnalysis = (
  initialData: ResistanceDataPoint[] = [],
  options: UseResistanceAnalysisOptions = {}
): UseResistanceAnalysisReturn => {
  const {
    autoApplyFilters = true,
    debounceMs = 300,
    enableCaching = true,
    maxCacheSize = 100,
  } = options;

  // Zustand store
  const {
    rawData,
    filteredData,
    filters,
    queryBuilder,
    comparisons,
    setRawData,
    updateFilters,
    clearFilters,
    applyQuickFilter,
    updateQuery,
    saveQuery,
    addComparison,
    removeComparison,
    setLoading,
    addError,
    clearErrors,
    addExportResult,
  } = useAnalysisStore();

  // Debounced filters for performance
  const debouncedFilters = useDebounce(filters, debounceMs);

  // Initialize data
  useEffect(() => {
    if (initialData.length > 0 && rawData.length === 0) {
      setRawData(initialData);
    }
  }, [initialData, rawData.length, setRawData]);

  // Apply filters to data
  const currentFilteredData = useMemo(() => {
    if (!autoApplyFilters) return rawData;
    return getFilteredData(rawData, debouncedFilters);
  }, [rawData, debouncedFilters, autoApplyFilters]);

  // Convert to spatial data for clustering analysis
  const spatialData = useMemo((): SpatialPoint[] => {
    if (currentFilteredData.length === 0) return [];

    const analyzer = new SpatialClusteringAnalyzer();
    return analyzer.convertResistanceToSpatial(currentFilteredData, {
      useGeneration: true,
      valueExtractor: data => data.resistantCount,
    });
  }, [currentFilteredData]);

  // Perform spatial clustering
  const clusters = useMemo((): SpatialCluster[] => {
    if (spatialData.length < 3) return [];

    try {
      const analyzer = new SpatialClusteringAnalyzer();
      return analyzer.dbscan(spatialData, {
        epsilon: 5,
        minPoints: 3,
      });
    } catch (error) {
      console.warn("Clustering failed:", error);
      return [];
    }
  }, [spatialData]);

  // Loading state management
  const isLoading = useMemo(() => {
    const { loading } = useAnalysisStore.getState().uiState;
    return Object.values(loading).some(Boolean);
  }, []);

  // Error state management
  const error = useMemo(() => {
    const { errors } = useAnalysisStore.getState().uiState;
    return errors.length > 0 ? errors[errors.length - 1].message : null;
  }, []);

  // Filter update function with validation
  const handleUpdateFilters = useCallback(
    (newFilters: Partial<typeof filters>) => {
      try {
        setLoading("filters", true);
        clearErrors();
        updateFilters(newFilters);
      } catch (error) {
        addError(
          `Failed to update filters: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading("filters", false);
      }
    },
    [updateFilters, setLoading, addError, clearErrors]
  );

  // Query execution
  const executeQuery = useCallback(() => {
    try {
      setLoading("data", true);
      clearErrors();
      // Query execution logic would go here
      // For now, we'll just validate the query structure
      const { currentQuery } = queryBuilder;
      if (
        currentQuery.conditions.length === 0 &&
        currentQuery.groups.length === 0
      ) {
        addError("Query is empty. Please add conditions or groups.", "warning");
        return;
      }
      // In a real implementation, this would execute the query against the data
    } catch (error) {
      addError(
        `Query execution failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading("data", false);
    }
  }, [queryBuilder, setLoading, addError, clearErrors]);

  // Save query function
  const handleSaveQuery = useCallback(
    async (name: string, description?: string) => {
      try {
        const savedQuery = saveQuery(name, description);
        return savedQuery;
      } catch (error) {
        addError(
          `Failed to save query: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        throw error;
      }
    },
    [saveQuery, addError]
  );

  // Calculate comparison metrics
  const calculateComparisonMetrics = useCallback(
    async (comparisonId: string): Promise<ComparisonMetrics> => {
      try {
        setLoading("comparison", true);

        const comparison = comparisons.find(c => c.id === comparisonId);
        if (!comparison) {
          throw new Error("Comparison not found");
        }

        const primary =
          comparison.datasets[0]?.data.map(d => d.resistanceFrequency) || [];
        const secondary =
          comparison.datasets[1]?.data.map(d => d.resistanceFrequency) || [];

        // Calculate statistical tests
        const tTestResult = calculateTTest(primary, secondary);
        const tTest = {
          ...tTestResult,
          name: "Two-sample t-test",
        };

        // Calculate descriptive statistics
        const primaryMean =
          primary.reduce((sum, val) => sum + val, 0) / primary.length;
        const secondaryMean =
          secondary.reduce((sum, val) => sum + val, 0) / secondary.length;
        const difference = primaryMean - secondaryMean;
        const percentChange =
          secondaryMean !== 0 ? (difference / secondaryMean) * 100 : 0;
        const correlation = calculateCorrelation(primary, secondary);

        // Calculate variances for effect size
        const variance1 =
          primary.reduce(
            (sum, val) => sum + Math.pow(val - primaryMean, 2),
            0
          ) /
          (primary.length - 1);
        const variance2 =
          secondary.reduce(
            (sum, val) => sum + Math.pow(val - secondaryMean, 2),
            0
          ) /
          (secondary.length - 1);
        const pooledStdDev = Math.sqrt((variance1 + variance2) / 2);
        const effectSize =
          pooledStdDev > 0 ? Math.abs(difference) / pooledStdDev : 0;

        const metrics: ComparisonMetrics = {
          tTest,
          correlation,
          meanDifference: difference,
          effectSize,
        };

        return metrics;
      } catch (error) {
        addError(
          `Failed to calculate comparison metrics: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        throw error;
      } finally {
        setLoading("comparison", false);
      }
    },
    [comparisons, setLoading, addError]
  );

  // Export functionality
  const exportData = useCallback(
    async (format: ExportResult["type"]): Promise<ExportResult> => {
      try {
        setLoading("export", true);

        let data: unknown;
        let mimeType: string;

        switch (format) {
          case "json":
            data = {
              filteredData: currentFilteredData,
              filters: debouncedFilters,
              spatialData,
              clusters,
              comparisons,
              metadata: {
                exportedAt: new Date().toISOString(),
                totalRecords: currentFilteredData.length,
                filterActive: debouncedFilters.active,
              },
            };
            mimeType = "application/json";
            break;

          case "csv":
            const csvHeader =
              "generation,resistanceFrequency,totalPopulation,resistantCount,hgtEvents,mutationEvents,timestamp\n";
            const csvRows = currentFilteredData
              .map(
                row =>
                  `${row.generation},${row.resistanceFrequency},${row.totalPopulation},${row.resistantCount},${row.hgtEvents},${row.mutationEvents},${row.timestamp}`
              )
              .join("\n");
            data = csvHeader + csvRows;
            mimeType = "text/csv";
            break;

          default:
            throw new Error(`Export format ${format} not supported yet`);
        }

        const result: ExportResult = {
          id: crypto.randomUUID(),
          name: `resistance_analysis_${
            new Date().toISOString().split("T")[0]
          }.${format}`,
          type: format,
          data,
          metadata: {
            generatedAt: new Date().toISOString(),
            filters: debouncedFilters,
            dataSize: currentFilteredData.length,
            analysisType: "resistance_distribution",
          },
        };

        // Create download URL for browser
        const blob = new Blob(
          [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
          {
            type: mimeType,
          }
        );
        result.downloadUrl = URL.createObjectURL(blob);

        addExportResult(result);
        return result;
      } catch (error) {
        addError(
          `Export failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        throw error;
      } finally {
        setLoading("export", false);
      }
    },
    [
      currentFilteredData,
      debouncedFilters,
      spatialData,
      clusters,
      comparisons,
      setLoading,
      addError,
      addExportResult,
    ]
  );

  return {
    // Data
    filteredData: currentFilteredData,
    rawData,
    spatialData,
    clusters,

    // State
    filters: debouncedFilters,
    isLoading,
    error,

    // Actions
    updateFilters: handleUpdateFilters,
    clearFilters,
    applyQuickFilter,
    exportData,

    // Query builder
    queryBuilder,
    updateQuery,
    executeQuery,
    saveQuery: handleSaveQuery,

    // Comparison
    comparisons,
    addComparison,
    removeComparison,
    calculateComparisonMetrics,
  };
};
