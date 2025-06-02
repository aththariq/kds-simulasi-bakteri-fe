"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
  mutationRate?: number;
  selectionPressure?: number;
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
    bacteriaCount: 10000,
    resistantBacteriaCount: 100,
    antibioticConcentration: 0.5,
    mutationRate: 0.01,
    selectionPressure: 0.5,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const processWebSocketMessage = useCallback((data: any) => {
    console.log("WebSocket message received:", data);

    // Handle different message types with improved compatibility
    const messageType = data.type?.toUpperCase() || data.type;

    switch (messageType) {
      case "CONNECTION_ESTABLISHED":
        console.log("Connection established:", data);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        break;

      case "SIMULATION_UPDATE":
      case "SIMULATION_STARTED":
      case "STATUS_UPDATE":
        // Handle both "payload" and "data" field names
        const payload = data.payload || data.data || {};

        setSimulationState(prev => {
          // Show notification for significant changes
          const newResistantCount =
            payload.resistantBacteriaCount ||
            payload.resistantCount ||
            payload.resistant_count ||
            0;

          if (newResistantCount > prev.resistantBacteriaCount * 1.5) {
            toast.warning(
              "Significant increase in resistant bacteria detected!"
            );
          }

          return {
            ...prev,
            ...payload,
            // Ensure we get updated bacteria data
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
            // Update progress based on current generation
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
            // Update status if provided
            status: payload.status || prev.status,
          };
        });
        break;

      case "ERROR":
        console.error("WebSocket error message:", data);
        toast.error(data.error || "Simulation error occurred");
        setSimulationState(prev => ({
          ...prev,
          status: "error",
          errorMessage: data.error || "Unknown error",
        }));
        break;

      case "PING":
        // Respond to heartbeat ping
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "PONG",
              timestamp: new Date().toISOString(),
              client_id: "frontend_client",
            })
          );
        }
        break;

      case "PONG":
        // Heartbeat response received
        console.log("Heartbeat response received");
        break;

      default:
        console.log("Unhandled message type:", messageType, data);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/simulation";
      console.log("Connecting to WebSocket:", wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        const isAutoReconnection = reconnectAttempts.current > 0; // Check before resetting

        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset after checking

        if (!isAutoReconnection) {
          toast.success("Connected to simulation server");
        } else {
          // For automatic reconnections, we can log or use a more subtle notification
          console.log("Successfully reconnected to simulation server (toast suppressed).");
          // Optionally, you could use a different, less intrusive toast here, e.g.:
          // toast.info("Reconnected to simulation server");
        }

        // Start heartbeat mechanism
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
        heartbeatRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "PING",
                timestamp: new Date().toISOString(),
                client_id: "frontend_client",
              })
            );
          }
        }, 30000); // Ping every 30 seconds
      };

      wsRef.current.onmessage = event => {
        try {
          let data;

          // Handle both text and binary messages
          if (event.data instanceof Blob) {
            // Convert Blob to text first
            const reader = new FileReader();
            reader.onload = () => {
              try {
                data = JSON.parse(reader.result as string);
                processWebSocketMessage(data);
              } catch (error) {
                console.error("Error parsing Blob as JSON:", error);
              }
            };
            reader.readAsText(event.data);
            return;
          } else if (typeof event.data === "string") {
            data = JSON.parse(event.data);
          } else {
            console.warn("Received unknown data type:", typeof event.data);
            return;
          }

          processWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = event => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);

        // Clear heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          reconnectAttempts.current++;

          console.log(
            `Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          toast.error("Failed to maintain connection to simulation server");
        }
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
  }, [processWebSocketMessage]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return cleanup;
  }, [connectWebSocket, cleanup]);

  // Start simulation
  const sendStartMessage = useCallback(() => {
    try {
      // Generate a unique simulation ID
      const simulationId = `sim_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      wsRef.current?.send(
        JSON.stringify({
          type: "SIMULATION_START", // Use uppercase to match backend protocol
          simulation_id: simulationId,
          data: {
            simulation_id: simulationId,
            initial_population_size: simulationState.bacteriaCount,
            mutation_rate: simulationState.mutationRate,
            selection_pressure: simulationState.selectionPressure,
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
    simulationState.mutationRate,
    simulationState.selectionPressure,
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
        currentGeneration: 0,
        elapsedTime: 0,
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

  return (
    <SimulationContext.Provider
      value={{
        isConnected,
        simulationState,
        handleStart,
        handlePause,
        handleCancel,
        connectWebSocket,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

// Hook to use simulation context
export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
