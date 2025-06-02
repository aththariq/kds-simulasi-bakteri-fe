"use client";

import * as React from "react";
import SimulationProgressTracker from "./SimulationProgressTracker";
import { useSimulation } from "@/contexts/SimulationContext";

export default function SimulationController() {
  const {
    isConnected,
    simulationState,
    handleStart,
    handlePause,
    handleCancel,
    connectWebSocket,
  } = useSimulation();

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
              <button
                onClick={connectWebSocket}
                className="text-xs text-yellow-600 hover:text-yellow-800 underline mt-1"
              >
                Retry connection
              </button>
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
      />
    </div>
  );
}
