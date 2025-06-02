"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { toast } from "sonner";

// Types
type SimulationStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

interface SimulationState {
  status: SimulationStatus;
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

interface SimulationContextType {
  isConnected: boolean;
  simulationState: SimulationState;
  handleStart: () => void;
  handlePause: () => void;
  handleCancel: () => void;
  connectWebSocket: () => void;
}

// Context
const SimulationContext = createContext<SimulationContextType | undefined>(
  undefined
);

// Provider component
export function SimulationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    status: "idle",
    currentGeneration: 0,
    totalGenerations: 100,
    progress: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    bacteriaCount: 1000,
    resistantBacteriaCount: 0,
    antibioticConcentration: 0.5,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    // Only connect WebSocket in browser environment
    if (typeof window === "undefined") return;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      wsRef.current = new WebSocket(`${wsUrl}/ws/simulation`);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        toast.success("Connected to simulation server");
      };

      wsRef.current.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);

          // Handle both "SIMULATION_UPDATE" and "simulation_update" message types
          if (data.type === "SIMULATION_UPDATE" || data.type === "simulation_update") {
            // Handle both "payload" and "data" field names
            const payload = data.payload || data.data || {};
            
            setSimulationState(prev => {
              // Tampilkan notifikasi saat ada perubahan signifikan
              const newResistantCount = payload.resistantBacteriaCount || 
                                      payload.resistantCount || 
                                      payload.resistant_count || 0;
              
              if (newResistantCount > prev.resistantBacteriaCount * 1.5) {
                toast.warning(
                  "Significant increase in resistant bacteria detected!"
                );
              }

              return {
                ...prev,
                ...payload,
                // Memastikan kita mendapatkan data bakteri yang diperbarui
                bacteriaCount:
                  payload.bacteriaCount ||
                  payload.totalPopulation ||
                  payload.total_population ||
                  prev.bacteriaCount,
                resistantBacteriaCount:
                  payload.resistantBacteriaCount ||
                  payload.resistantCount ||
                  payload.resistant_count ||
                  prev.resistantBacteriaCount,
                // Perbarui juga progress berdasarkan generasi saat ini
                progress:
                  payload.progress ||
                  (payload.currentGeneration && payload.totalGenerations
                    ? (payload.currentGeneration / payload.totalGenerations) * 100
                    : payload.generation && payload.max_generations
                    ? (payload.generation / payload.max_generations) * 100
                    : prev.progress),
                // Update current generation
                currentGeneration:
                  payload.currentGeneration ||
                  payload.generation ||
                  prev.currentGeneration,
                // Update total generations if provided
                totalGenerations:
                  payload.totalGenerations ||
                  payload.max_generations ||
                  prev.totalGenerations,
              };
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        toast.error("Disconnected from simulation server");
      };

      wsRef.current.onerror = error => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        toast.error("WebSocket connection error");
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      toast.error("Failed to connect to simulation server");
    }
  }, []);
  // Start simulation
  const sendStartMessage = useCallback(() => {
    try {
      // Generate a unique simulation ID
      const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      wsRef.current?.send(
        JSON.stringify({
          type: "simulation_start",
          simulation_id: simulationId,
          data: {
            simulation_id: simulationId,
            initial_population_size: simulationState.bacteriaCount,
            mutation_rate: 0.01,
            selection_pressure: 0.5,
            antibiotic_concentration: simulationState.antibioticConcentration,
            simulation_time: simulationState.totalGenerations,
          },
        })
      );

      setSimulationState(prev => ({
        ...prev,
        status: "running",
        currentGeneration: 0,
        progress: 0,
        elapsedTime: 0,
      }));

      // Start timer for elapsed time
      timerRef.current = setInterval(() => {
        setSimulationState(prev => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1,
        }));
      }, 1000);

      toast.success("Simulation started!");
    } catch (error) {
      console.error("Failed to start simulation:", error);
      toast.error("Failed to start simulation");
    }
  }, [
    simulationState.totalGenerations,
    simulationState.bacteriaCount,
    simulationState.antibioticConcentration,
  ]);

  const handleStart = useCallback(() => {
    // Ensure WebSocket is connected before starting
    if (
      typeof window !== "undefined" &&
      (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
    ) {
      connectWebSocket();
      // Wait a bit for connection to establish
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          toast.error(
            "Failed to connect to simulation server. Please try again."
          );
          return;
        }
        sendStartMessage();
      }, 1000);
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendStartMessage();
    }
  }, [connectWebSocket, sendStartMessage]);

  // Pause simulation
  const handlePause = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Not connected to simulation server");
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "PAUSE_SIMULATION",
        })
      );

      setSimulationState(prev => ({
        ...prev,
        status: "paused",
      }));

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast.info("Simulation paused");
    } catch (error) {
      console.error("Error pausing simulation:", error);
      toast.error("Failed to pause simulation");
    }
  }, []);

  // Cancel simulation
  const handleCancel = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Not connected to simulation server");
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "STOP_SIMULATION",
        })
      );

      setSimulationState(prev => ({
        ...prev,
        status: "cancelled",
        progress: 0,
        estimatedTimeRemaining: 0,
      }));

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast.info("Simulation cancelled");
    } catch (error) {
      console.error("Error cancelling simulation:", error);
      toast.error("Failed to cancel simulation");
    }
  }, []);

  // Initialize WebSocket connection on mount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const contextValue: SimulationContextType = {
    isConnected,
    simulationState,
    handleStart,
    handlePause,
    handleCancel,
    connectWebSocket,
  };

  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  );
}

// Hook to use simulation context
export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
