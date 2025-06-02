import { useState, useEffect, useCallback } from "react";
import { PopulationDataPoint } from "../PopulationChart";

export interface DataExportFormat {
  version: string;
  timestamp: string;
  simulationId?: string;
  metadata: {
    totalGenerations: number;
    startTime: string;
    endTime?: string;
    parameters?: Record<string, unknown>;
  };
  data: PopulationDataPoint[];
}

export interface DataPersistenceOptions {
  storageKey?: string;
  maxStoredSessions?: number;
  compress?: boolean;
}

export interface UseDataPersistenceReturn {
  saveData: (
    data: PopulationDataPoint[],
    metadata?: Record<string, unknown>
  ) => void;
  loadData: (sessionId?: string) => PopulationDataPoint[] | null;
  exportData: (data: PopulationDataPoint[], filename?: string) => void;
  importData: (file: File) => Promise<PopulationDataPoint[] | null>;
  clearStorage: () => void;
  getSavedSessions: () => Array<{
    id: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }>;
  deleteSession: (sessionId: string) => void;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  storageUsage: number;
}

export const useDataPersistence = (
  options: DataPersistenceOptions = {}
): UseDataPersistenceReturn => {
  const {
    storageKey = "bacterial-simulation-data",
    maxStoredSessions = 10,
    compress = false,
  } = options;

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState(0);
  // Calculate storage usage
  const calculateStorageUsage = useCallback(() => {
    if (typeof window === "undefined") return 0;

    try {
      let total = 0;
      for (const key in localStorage) {
        if (key.startsWith(storageKey)) {
          total += localStorage[key].length;
        }
      }
      setStorageUsage(total);
      return total;
    } catch (error) {
      console.warn("Error calculating storage usage:", error);
      return 0;
    }
  }, [storageKey]);

  // Generate session ID
  const generateSessionId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Compress data if enabled
  const compressData = useCallback(
    (data: string): string => {
      if (!compress) return data;
      // Simple compression - in production, consider using a proper compression library
      try {
        return btoa(encodeURIComponent(data));
      } catch (error) {
        console.warn("Compression failed, storing uncompressed:", error);
        return data;
      }
    },
    [compress]
  );

  // Decompress data if needed
  const decompressData = useCallback(
    (data: string): string => {
      if (!compress) return data;
      try {
        return decodeURIComponent(atob(data));
      } catch (error) {
        console.warn("Decompression failed, assuming uncompressed:", error);
        return data;
      }
    },
    [compress]
  );
  // Get list of saved sessions
  const getSavedSessions = useCallback(() => {
    if (typeof window === "undefined") return [];

    try {
      const indexData = localStorage.getItem(`${storageKey}-index`);
      if (!indexData) return [];
      return JSON.parse(indexData);
    } catch (error) {
      console.error("Error getting saved sessions:", error);
      return [];
    }
  }, [storageKey]);
  // Save data to localStorage
  const saveData = useCallback(
    (data: PopulationDataPoint[], metadata: Record<string, unknown> = {}) => {
      if (typeof window === "undefined") return;

      try {
        setIsAutoSaving(true);

        const sessionId = generateSessionId();
        const exportData: DataExportFormat = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          simulationId: metadata.simulationId as string,
          metadata: {
            totalGenerations: data.length,
            startTime:
              (metadata.startTime as string) || new Date().toISOString(),
            endTime: metadata.endTime as string,
            parameters: metadata.parameters as Record<string, unknown>,
          },
          data,
        };

        const serializedData = JSON.stringify(exportData);
        const finalData = compressData(serializedData);

        // Save the session
        localStorage.setItem(`${storageKey}-${sessionId}`, finalData);

        // Update session index
        const sessions = getSavedSessions();
        const newSession = {
          id: sessionId,
          timestamp: exportData.timestamp,
          metadata: exportData.metadata,
        };

        const updatedSessions = [newSession, ...sessions].slice(
          0,
          maxStoredSessions
        );
        localStorage.setItem(
          `${storageKey}-index`,
          JSON.stringify(updatedSessions)
        );

        setLastSaved(new Date());
        calculateStorageUsage();

        console.log(`Simulation data saved with session ID: ${sessionId}`);
      } catch (error) {
        console.error("Error saving simulation data:", error);
      } finally {
        setIsAutoSaving(false);
      }
    },
    [
      storageKey,
      maxStoredSessions,
      generateSessionId,
      compressData,
      calculateStorageUsage,
      getSavedSessions,
    ]
  );
  // Load data from localStorage
  const loadData = useCallback(
    (sessionId?: string): PopulationDataPoint[] | null => {
      if (typeof window === "undefined") return null;

      try {
        let dataKey: string;

        if (sessionId) {
          dataKey = `${storageKey}-${sessionId}`;
        } else {
          // Load most recent session
          const sessions = getSavedSessions();
          if (sessions.length === 0) return null;
          dataKey = `${storageKey}-${sessions[0].id}`;
        }

        const rawData = localStorage.getItem(dataKey);
        if (!rawData) return null;

        const decompressedData = decompressData(rawData);
        const parsedData: DataExportFormat = JSON.parse(decompressedData);

        // Validate data structure
        if (!parsedData.data || !Array.isArray(parsedData.data)) {
          throw new Error("Invalid data format");
        }

        console.log(
          `Loaded simulation data from session: ${sessionId || "latest"}`
        );
        return parsedData.data;
      } catch (error) {
        console.error("Error loading simulation data:", error);
        return null;
      }
    },
    [storageKey, decompressData, getSavedSessions]
  );
  // Delete a specific session
  const deleteSession = useCallback(
    (sessionId: string) => {
      if (typeof window === "undefined") return;

      try {
        localStorage.removeItem(`${storageKey}-${sessionId}`);

        const sessions = getSavedSessions();
        const updatedSessions = sessions.filter(
          (session: { id: string }) => session.id !== sessionId
        );
        localStorage.setItem(
          `${storageKey}-index`,
          JSON.stringify(updatedSessions)
        );

        calculateStorageUsage();
        console.log(`Deleted session: ${sessionId}`);
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    },
    [storageKey, getSavedSessions, calculateStorageUsage]
  );
  // Clear all stored data
  const clearStorage = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const keysToRemove: string[] = [];
      for (const key in localStorage) {
        if (key.startsWith(storageKey)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      setStorageUsage(0);
      setLastSaved(null);

      console.log("Cleared all simulation data");
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }, [storageKey]);
  // Export data to file
  const exportData = useCallback(
    (data: PopulationDataPoint[], filename?: string) => {
      if (typeof window === "undefined" || typeof document === "undefined") {
        console.warn("Export not available in server environment");
        return;
      }

      try {
        const exportData: DataExportFormat = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          metadata: {
            totalGenerations: data.length,
            startTime: data[0]?.timestamp || new Date().toISOString(),
            endTime: data[data.length - 1]?.timestamp,
          },
          data,
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const defaultFilename = `bacterial-simulation-${
          new Date().toISOString().split("T")[0]
        }.json`;
        const finalFilename = filename || defaultFilename;

        const link = document.createElement("a");
        link.href = url;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`Exported simulation data to: ${finalFilename}`);
      } catch (error) {
        console.error("Error exporting data:", error);
      }
    },
    []
  );

  // Import data from file
  const importData = useCallback(
    (file: File): Promise<PopulationDataPoint[] | null> => {
      return new Promise(resolve => {
        try {
          const reader = new FileReader();

          reader.onload = event => {
            try {
              const content = event.target?.result as string;
              const parsedData: DataExportFormat = JSON.parse(content);

              // Validate data structure
              if (!parsedData.data || !Array.isArray(parsedData.data)) {
                throw new Error("Invalid file format");
              }

              // Validate data points
              const isValidData = parsedData.data.every(
                point =>
                  typeof point.generation === "number" &&
                  typeof point.totalPopulation === "number" &&
                  typeof point.resistantPopulation === "number"
              );

              if (!isValidData) {
                throw new Error("Invalid data points");
              }

              console.log(`Imported simulation data from file: ${file.name}`);
              resolve(parsedData.data);
            } catch (error) {
              console.error("Error parsing imported file:", error);
              resolve(null);
            }
          };

          reader.onerror = () => {
            console.error("Error reading file");
            resolve(null);
          };

          reader.readAsText(file);
        } catch (error) {
          console.error("Error importing data:", error);
          resolve(null);
        }
      });
    },
    []
  );

  // Calculate storage usage on mount
  useEffect(() => {
    calculateStorageUsage();
  }, [calculateStorageUsage]);

  return {
    saveData,
    loadData,
    exportData,
    importData,
    clearStorage,
    getSavedSessions,
    deleteSession,
    isAutoSaving,
    lastSaved,
    storageUsage,
  };
};
