import { useState, useEffect, useCallback, useRef } from "react";
import { PopulationDataPoint } from "../PopulationChart";

// Types for simulation data from SimulationController
export interface SimulationState {
  status: "idle" | "running" | "paused" | "completed" | "error" | "cancelled";
  currentGeneration: number;
  totalGenerations: number;
  progress: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  bacteriaCount: number;
  resistantBacteriaCount: number;
  antibioticConcentration: number;
  errorMessage?: string;
}

export interface SimulationDataPoint {
  generation: number;
  timestamp: string;
  totalPopulation: number;
  resistantPopulation: number;
  sensitivePopulation: number;
  antibioticConcentration: number;
  fitnessScore?: number;
  mutationRate?: number;
}

export interface UseSimulationDataOptions {
  maxDataPoints?: number;
  autoReset?: boolean;
  transformData?: boolean;
  bufferSize?: number;
}

export interface UseSimulationDataReturn {
  data: PopulationDataPoint[];
  rawData: SimulationDataPoint[];
  latestData: SimulationDataPoint | null;
  isCollecting: boolean;
  dataCount: number;
  addDataPoint: (dataPoint: Partial<SimulationDataPoint>) => void;
  reset: () => void;
  exportData: () => PopulationDataPoint[];
  getStatistics: () => {
    averagePopulation: number;
    peakPopulation: number;
    averageResistance: number;
    peakResistance: number;
    totalGenerations: number;
  };
}

export const useSimulationData = (
  simulationState: SimulationState,
  options: UseSimulationDataOptions = {}
): UseSimulationDataReturn => {
  const {
    maxDataPoints = 1000,
    autoReset = true,
    transformData = true,
    bufferSize = 100,
  } = options;

  const [data, setData] = useState<PopulationDataPoint[]>([]);
  const [rawData, setRawData] = useState<SimulationDataPoint[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const lastGenerationRef = useRef<number>(-1);
  const bufferRef = useRef<SimulationDataPoint[]>([]);

  // Transform raw simulation data to PopulationDataPoint format
  const transformToPopulationData = useCallback(
    (rawDataPoints: SimulationDataPoint[]): PopulationDataPoint[] => {
      return rawDataPoints.map(point => ({
        generation: point.generation,
        totalPopulation: point.totalPopulation,
        resistantPopulation: point.resistantPopulation,
        sensitivePopulation: point.sensitivePopulation,
        antibioticConcentration: point.antibioticConcentration,
        timestamp: point.timestamp,
        fitnessScore: point.fitnessScore,
        mutationRate: point.mutationRate,
      }));
    },
    []
  );

  // Add a new data point from simulation state
  const addDataPoint = useCallback(
    (dataPoint: Partial<SimulationDataPoint>) => {
      const timestamp = new Date().toISOString();
      const generation =
        dataPoint.generation ?? simulationState.currentGeneration;

      // Prevent duplicate data points for the same generation
      if (generation <= lastGenerationRef.current) {
        return;
      }

      const newPoint: SimulationDataPoint = {
        generation,
        timestamp,
        totalPopulation:
          dataPoint.totalPopulation ?? simulationState.bacteriaCount,
        resistantPopulation:
          dataPoint.resistantPopulation ??
          simulationState.resistantBacteriaCount,
        sensitivePopulation:
          (dataPoint.totalPopulation ?? simulationState.bacteriaCount) -
          (dataPoint.resistantPopulation ??
            simulationState.resistantBacteriaCount),
        antibioticConcentration:
          dataPoint.antibioticConcentration ??
          simulationState.antibioticConcentration,
        fitnessScore: dataPoint.fitnessScore,
        mutationRate: dataPoint.mutationRate,
      };

      lastGenerationRef.current = generation;

      // Add to buffer first
      bufferRef.current.push(newPoint);

      // Flush buffer when it reaches the buffer size or when simulation completes
      if (
        bufferRef.current.length >= bufferSize ||
        simulationState.status === "completed"
      ) {
        setRawData(prev => {
          const newData = [...prev, ...bufferRef.current];
          // Limit data points to prevent memory issues
          const trimmedData = newData.slice(-maxDataPoints);
          return trimmedData;
        });

        if (transformData) {
          setData(prev => {
            const newTransformedData = transformToPopulationData(
              bufferRef.current
            );
            const updatedData = [...prev, ...newTransformedData];
            return updatedData.slice(-maxDataPoints);
          });
        }

        // Clear buffer
        bufferRef.current = [];
      }
    },
    [
      simulationState,
      maxDataPoints,
      transformData,
      bufferSize,
      transformToPopulationData,
    ]
  );

  // Auto-update data when simulation state changes
  useEffect(() => {
    if (
      simulationState.status === "running" &&
      simulationState.currentGeneration > lastGenerationRef.current
    ) {
      addDataPoint({
        generation: simulationState.currentGeneration,
        totalPopulation: simulationState.bacteriaCount,
        resistantPopulation: simulationState.resistantBacteriaCount,
        antibioticConcentration: simulationState.antibioticConcentration,
      });
    }
  }, [simulationState, addDataPoint]);

  // Handle simulation status changes
  useEffect(() => {
    const wasCollecting = isCollecting;
    const shouldCollect = simulationState.status === "running";

    setIsCollecting(shouldCollect);

    // Reset data when starting a new simulation
    if (autoReset && !wasCollecting && shouldCollect) {
      setData([]);
      setRawData([]);
      lastGenerationRef.current = -1;
      bufferRef.current = [];
    }

    // Flush any remaining buffer data when simulation stops
    if (wasCollecting && !shouldCollect && bufferRef.current.length > 0) {
      setRawData(prev => [...prev, ...bufferRef.current]);
      if (transformData) {
        setData(prev => [
          ...prev,
          ...transformToPopulationData(bufferRef.current),
        ]);
      }
      bufferRef.current = [];
    }
  }, [
    simulationState.status,
    isCollecting,
    autoReset,
    transformData,
    transformToPopulationData,
  ]);

  // Reset function
  const reset = useCallback(() => {
    setData([]);
    setRawData([]);
    lastGenerationRef.current = -1;
    bufferRef.current = [];
  }, []);

  // Export function for external use
  const exportData = useCallback((): PopulationDataPoint[] => {
    if (transformData) {
      return data;
    }
    return transformToPopulationData(rawData);
  }, [data, rawData, transformData, transformToPopulationData]);

  // Calculate statistics
  const getStatistics = useCallback(() => {
    const dataToAnalyze = rawData.length > 0 ? rawData : [];

    if (dataToAnalyze.length === 0) {
      return {
        averagePopulation: 0,
        peakPopulation: 0,
        averageResistance: 0,
        peakResistance: 0,
        totalGenerations: 0,
      };
    }

    const totalPop = dataToAnalyze.reduce(
      (sum, point) => sum + point.totalPopulation,
      0
    );
    const totalRes = dataToAnalyze.reduce(
      (sum, point) => sum + point.resistantPopulation,
      0
    );
    const maxPop = Math.max(
      ...dataToAnalyze.map(point => point.totalPopulation)
    );
    const maxRes = Math.max(
      ...dataToAnalyze.map(point => point.resistantPopulation)
    );

    return {
      averagePopulation: totalPop / dataToAnalyze.length,
      peakPopulation: maxPop,
      averageResistance: totalRes / dataToAnalyze.length,
      peakResistance: maxRes,
      totalGenerations: dataToAnalyze.length,
    };
  }, [rawData]);

  return {
    data,
    rawData,
    latestData: rawData.length > 0 ? rawData[rawData.length - 1] : null,
    isCollecting,
    dataCount: rawData.length,
    addDataPoint,
    reset,
    exportData,
    getStatistics,
  };
};
