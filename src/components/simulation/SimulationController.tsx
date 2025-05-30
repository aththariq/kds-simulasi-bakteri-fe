"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import SimulationProgressTracker from "./SimulationProgressTracker";

// Types for simulation state management
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

// Types for WebSocket communication
interface SimulationUpdateData {
  generation?: number;
  progress?: number;
  population_size?: number;
  resistant_count?: number;
  antibiotic_concentration?: number;
}

interface WebSocketMessage {
  type:
    | "simulation_update"
    | "simulation_complete"
    | "error"
    | "connection_status";
  data?: SimulationUpdateData;
  message?: string;
  timestamp?: string;
}

// Simulation parameters interface
interface SimulationParameters {
  initial_population_size: number;
  num_generations: number;
  mutation_rate: number;
  antibiotic_concentration: number;
  resistance_cost: number;
  // Add other parameters as needed
}

export default function SimulationController() {
  const [isConnected, setIsConnected] = useState(false);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    status: "idle",
    currentGeneration: 0,
    totalGenerations: 100,
    progress: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    bacteriaCount: 0,
    resistantBacteriaCount: 0,
    antibioticConcentration: 0,
    errorMessage: undefined,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simulationStateRef = useRef(simulationState);

  // Update the ref whenever state changes
  useEffect(() => {
    simulationStateRef.current = simulationState;
  }, [simulationState]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "simulation_update":
        if (message.data) {
          setSimulationState(prev => ({
            ...prev,
            status: "running",
            currentGeneration:
              message.data?.generation || prev.currentGeneration,
            progress: message.data?.progress || prev.progress,
            bacteriaCount: message.data?.population_size || prev.bacteriaCount,
            resistantBacteriaCount:
              message.data?.resistant_count || prev.resistantBacteriaCount,
            antibioticConcentration:
              message.data?.antibiotic_concentration ||
              prev.antibioticConcentration,
            errorMessage: undefined,
          }));

          // Update estimated time remaining
          if (
            startTimeRef.current &&
            message.data?.progress &&
            message.data.progress > 0
          ) {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const estimatedTotal = (elapsed / message.data.progress) * 100;
            const remaining = Math.max(0, estimatedTotal - elapsed);

            setSimulationState(prev => ({
              ...prev,
              estimatedTimeRemaining: remaining,
            }));
          }
        }
        break;

      case "simulation_complete":
        setSimulationState(prev => ({
          ...prev,
          status: "completed",
          progress: 100,
          estimatedTimeRemaining: 0,
        }));

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        toast.success("Simulation completed successfully!");
        break;

      case "error":
        setSimulationState(prev => ({
          ...prev,
          status: "error",
          errorMessage: message.message || "An unknown error occurred",
        }));

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        toast.error(message.message || "Simulation error occurred");
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }, []);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      // Use environment variable or fallback to localhost
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/simulation";
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        toast.success("Connected to simulation server");
      };

      wsRef.current.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
          toast.error("Error processing server message");
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        toast.info("Disconnected from simulation server");

        // Auto-reconnect after a delay if simulation is running
        if (simulationStateRef.current.status === "running") {
          setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current.onerror = error => {
        console.error("WebSocket error:", error);
        toast.error("Connection error with simulation server");
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      toast.error("Failed to connect to simulation server");
    }
  }, [handleWebSocketMessage]);

  // Start simulation
  const handleStart = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Not connected to simulation server");
      return;
    }

    // Get simulation parameters from localStorage or use defaults
    const parameters: SimulationParameters = {
      initial_population_size: 1000,
      num_generations: 100,
      mutation_rate: 1e-6,
      antibiotic_concentration: 0.5,
      resistance_cost: 0.1,
      // Add other parameters as needed
    };

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "start_simulation",
          parameters,
        })
      );

      setSimulationState(prev => ({
        ...prev,
        status: "running",
        currentGeneration: 0,
        progress: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
        totalGenerations: parameters.num_generations,
        errorMessage: undefined,
      }));

      // Start timing
      startTimeRef.current = Date.now();

      // Start elapsed time counter
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          setSimulationState(prev => ({
            ...prev,
            elapsedTime: elapsed,
          }));
        }
      }, 1000);

      toast.success("Simulation started");
    } catch (error) {
      console.error("Error starting simulation:", error);
      toast.error("Failed to start simulation");
    }
  }, []);

  // Pause simulation
  const handlePause = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Not connected to simulation server");
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "pause_simulation",
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
          type: "cancel_simulation",
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
    connectWebSocket();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                Connecting to simulation server...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Tracker */}
      <SimulationProgressTracker
        simulationState={simulationState}
        onStart={handleStart}
        onPause={handlePause}
        onCancel={handleCancel}
        disabled={!isConnected}
      />
    </div>
  );
}
