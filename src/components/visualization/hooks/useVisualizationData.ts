import { useEffect, useCallback, useState } from "react";
import {
  useSimulationData,
  SimulationState,
  UseSimulationDataOptions,
  SimulationDataPoint,
} from "./useSimulationData";
import {
  useDataPersistence,
  DataPersistenceOptions,
} from "./useDataPersistence";
import { PopulationDataPoint } from "../PopulationChart";

export interface VisualizationDataOptions {
  simulation?: UseSimulationDataOptions;
  persistence?: DataPersistenceOptions;
  autoSave?: boolean;
  saveInterval?: number;
  realTimeUpdates?: boolean;
}

export interface UseVisualizationDataReturn {
  // Data state
  data: PopulationDataPoint[];
  latestData: SimulationDataPoint | null;
  isCollecting: boolean;
  dataCount: number;

  // Statistics
  statistics: {
    averagePopulation: number;
    peakPopulation: number;
    averageResistance: number;
    peakResistance: number;
    totalGenerations: number;
  };

  // Data management
  reset: () => void;
  addDataPoint: (dataPoint: Partial<SimulationDataPoint>) => void;
  exportData: () => PopulationDataPoint[];

  // Persistence
  saveSession: (metadata?: Record<string, unknown>) => void;
  loadSession: (sessionId?: string) => boolean;
  exportToFile: (filename?: string) => void;
  importFromFile: (file: File) => Promise<boolean>;
  clearAllData: () => void;
  getSavedSessions: () => Array<{
    id: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }>;
  deleteSession: (sessionId: string) => void;

  // Status
  isAutoSaving: boolean;
  lastSaved: Date | null;
  storageUsage: number;

  // Error handling
  error: string | null;
  clearError: () => void;
}

export const useVisualizationData = (
  simulationState: SimulationState,
  options: VisualizationDataOptions = {}
): UseVisualizationDataReturn => {
  const {
    simulation: simulationOptions = {},
    persistence: persistenceOptions = {},
    autoSave = true,
    saveInterval = 60000, // 1 minute
    realTimeUpdates = true,
  } = options;

  const [error, setError] = useState<string | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  // Initialize hooks
  const simulationData = useSimulationData(simulationState, simulationOptions);
  const persistence = useDataPersistence(persistenceOptions);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle errors with user-friendly messages
  const handleError = useCallback((error: unknown, context: string) => {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    const fullMessage = `${context}: ${message}`;
    setError(fullMessage);
    console.error(fullMessage, error);
  }, []);

  // Enhanced save session with error handling
  const saveSession = useCallback(
    (metadata: Record<string, unknown> = {}) => {
      try {
        if (simulationData.data.length === 0) {
          setError("No data to save");
          return;
        }

        const enrichedMetadata = {
          ...metadata,
          simulationStatus: simulationState.status,
          totalGenerations: simulationState.totalGenerations,
          currentGeneration: simulationState.currentGeneration,
          bacteriaCount: simulationState.bacteriaCount,
          resistantCount: simulationState.resistantBacteriaCount,
          antibioticConcentration: simulationState.antibioticConcentration,
          progress: simulationState.progress,
          elapsedTime: simulationState.elapsedTime,
          timestamp: new Date().toISOString(),
        };

        persistence.saveData(simulationData.data, enrichedMetadata);
        clearError();
      } catch (error) {
        handleError(error, "Failed to save session");
      }
    },
    [simulationData.data, simulationState, persistence, clearError, handleError]
  );

  // Enhanced load session with error handling
  const loadSession = useCallback(
    (sessionId?: string): boolean => {
      try {
        const loadedData = persistence.loadData(sessionId);
        if (!loadedData) {
          setError("No session data found");
          return false;
        }

        // Reset current data and load the session data
        simulationData.reset();

        // Add each data point to maintain proper state
        loadedData.forEach(dataPoint => {
          simulationData.addDataPoint(dataPoint);
        });

        clearError();
        return true;
      } catch (error) {
        handleError(error, "Failed to load session");
        return false;
      }
    },
    [persistence, simulationData, clearError, handleError]
  );

  // Enhanced export to file
  const exportToFile = useCallback(
    (filename?: string) => {
      try {
        if (simulationData.data.length === 0) {
          setError("No data to export");
          return;
        }

        persistence.exportData(simulationData.data, filename);
        clearError();
      } catch (error) {
        handleError(error, "Failed to export data");
      }
    },
    [simulationData.data, persistence, clearError, handleError]
  );

  // Enhanced import from file
  const importFromFile = useCallback(
    async (file: File): Promise<boolean> => {
      try {
        const importedData = await persistence.importData(file);
        if (!importedData) {
          setError("Failed to import data from file");
          return false;
        }

        // Reset current data and load imported data
        simulationData.reset();

        // Add each imported data point
        importedData.forEach(dataPoint => {
          simulationData.addDataPoint(dataPoint);
        });

        clearError();
        return true;
      } catch (error) {
        handleError(error, "Failed to import file");
        return false;
      }
    },
    [persistence, simulationData, clearError, handleError]
  );

  // Clear all data (both memory and storage)
  const clearAllData = useCallback(() => {
    try {
      simulationData.reset();
      persistence.clearStorage();
      clearError();
    } catch (error) {
      handleError(error, "Failed to clear all data");
    }
  }, [simulationData, persistence, clearError, handleError]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !realTimeUpdates) return;

    // Clear existing timer
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
    }

    // Only start auto-save if we have data and simulation is running
    if (simulationData.isCollecting && simulationData.dataCount > 0) {
      const timer = setInterval(() => {
        saveSession({
          autoSave: true,
          saveTimestamp: new Date().toISOString(),
        });
      }, saveInterval);

      setAutoSaveTimer(timer);

      return () => {
        clearInterval(timer);
      };
    }
  }, [
    autoSave,
    realTimeUpdates,
    saveInterval,
    simulationData.isCollecting,
    simulationData.dataCount,
    saveSession,
    autoSaveTimer,
  ]);

  // Save data when simulation completes
  useEffect(() => {
    if (
      simulationState.status === "completed" &&
      simulationData.dataCount > 0
    ) {
      saveSession({
        completedAt: new Date().toISOString(),
        finalGeneration: simulationState.currentGeneration,
        finalProgress: simulationState.progress,
      });
    }
  }, [
    simulationState.status,
    simulationState.currentGeneration,
    simulationState.progress,
    simulationData.dataCount,
    saveSession,
  ]);

  // Enhanced delete session
  const deleteSessionEnhanced = useCallback(
    (sessionId: string) => {
      try {
        persistence.deleteSession(sessionId);
        clearError();
      } catch (error) {
        handleError(error, "Failed to delete session");
      }
    },
    [persistence, clearError, handleError]
  );

  // Get sessions with error handling
  const getSavedSessionsEnhanced = useCallback(() => {
    try {
      return persistence.getSavedSessions();
    } catch (error) {
      handleError(error, "Failed to get saved sessions");
      return [];
    }
  }, [persistence, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return {
    // Data state
    data: simulationData.data,
    latestData: simulationData.latestData,
    isCollecting: simulationData.isCollecting,
    dataCount: simulationData.dataCount,

    // Statistics
    statistics: simulationData.getStatistics(),

    // Data management
    reset: simulationData.reset,
    addDataPoint: simulationData.addDataPoint,
    exportData: simulationData.exportData,

    // Persistence
    saveSession,
    loadSession,
    exportToFile,
    importFromFile,
    clearAllData,
    getSavedSessions: getSavedSessionsEnhanced,
    deleteSession: deleteSessionEnhanced,

    // Status
    isAutoSaving: persistence.isAutoSaving,
    lastSaved: persistence.lastSaved,
    storageUsage: persistence.storageUsage,

    // Error handling
    error,
    clearError,
  };
};
