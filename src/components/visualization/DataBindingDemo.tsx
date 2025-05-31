"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import {
  Download,
  Upload,
  Save,
  RotateCcw,
  Database,
  Info,
} from "lucide-react";

// Import our visualization components and hooks
import { PopulationChart } from "./PopulationChart";
import { SimulationDashboard } from "./SimulationDashboard";
import { useVisualizationData, SimulationState } from "./hooks";

// Mock simulation state for demonstration
const createMockSimulationState = (
  overrides: Partial<SimulationState> = {}
): SimulationState => ({
  status: "idle",
  currentGeneration: 0,
  totalGenerations: 100,
  progress: 0,
  elapsedTime: 0,
  estimatedTimeRemaining: 0,
  bacteriaCount: 1000,
  resistantBacteriaCount: 0,
  antibioticConcentration: 0.5,
  ...overrides,
});

export const DataBindingDemo: React.FC = () => {
  const [mockState, setMockState] = useState<SimulationState>(
    createMockSimulationState()
  );

  // Use the visualization data hook
  const {
    data,
    isCollecting,
    dataCount,
    statistics,
    saveSession,
    loadSession,
    exportToFile,
    importFromFile,
    clearAllData,
    getSavedSessions,
    deleteSession,
    isAutoSaving,
    lastSaved,
    storageUsage,
    error,
    clearError,
    reset,
    addDataPoint,
  } = useVisualizationData(mockState, {
    simulation: {
      maxDataPoints: 500,
      autoReset: true,
      bufferSize: 10,
    },
    persistence: {
      maxStoredSessions: 5,
    },
    autoSave: true,
    saveInterval: 10000, // 10 seconds for demo
    realTimeUpdates: true,
  });

  // Simulate data generation
  const generateMockData = () => {
    const generation = mockState.currentGeneration + 1;
    const totalPop = Math.max(
      100,
      Math.floor(mockState.bacteriaCount + (Math.random() - 0.5) * 200)
    );
    const resistantPop = Math.floor(totalPop * (0.1 + Math.random() * 0.4));

    const newState = createMockSimulationState({
      status: "running",
      currentGeneration: generation,
      progress: (generation / mockState.totalGenerations) * 100,
      bacteriaCount: totalPop,
      resistantBacteriaCount: resistantPop,
      antibioticConcentration: 0.5 + Math.random() * 0.3,
      elapsedTime: generation * 2,
    });

    setMockState(newState);

    // Add data point manually to demonstrate API
    addDataPoint({
      generation,
      totalPopulation: totalPop,
      resistantPopulation: resistantPop,
      antibioticConcentration: newState.antibioticConcentration,
    });
  };

  // Start simulation
  const startSimulation = () => {
    setMockState(prev => ({ ...prev, status: "running" }));
    const interval = setInterval(() => {
      setMockState(current => {
        if (current.currentGeneration >= current.totalGenerations) {
          clearInterval(interval);
          return { ...current, status: "completed", progress: 100 };
        }
        generateMockData();
        return current;
      });
    }, 500);
  };

  // Stop simulation
  const stopSimulation = () => {
    setMockState(prev => ({ ...prev, status: "idle" }));
  };

  // Reset simulation
  const resetSimulation = () => {
    setMockState(createMockSimulationState());
    reset();
  };

  // Handle file import
  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const success = await importFromFile(file);
      if (success) {
        console.log("Import successful");
      }
    }
  };

  // Get saved sessions
  const savedSessions = getSavedSessions();

  // Format storage usage
  const formatStorageUsage = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Visualization Data Binding Demo
          </h2>
          <p className="text-muted-foreground">
            Demonstrates real-time data collection, persistence, and
            visualization integration
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isCollecting ? "default" : "secondary"}>
            {isCollecting ? "Collecting" : "Idle"}
          </Badge>
          {isAutoSaving && <Badge variant="outline">Auto-saving...</Badge>}
        </div>
      </div>

      {error && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Simulation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation Controls</CardTitle>
          <CardDescription>
            Start, stop, or reset the mock bacterial simulation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={startSimulation}
              disabled={mockState.status === "running"}
            >
              Start Simulation
            </Button>
            <Button
              variant="outline"
              onClick={stopSimulation}
              disabled={mockState.status !== "running"}
            >
              Stop Simulation
            </Button>
            <Button variant="outline" onClick={resetSimulation}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={generateMockData}
              disabled={mockState.status === "running"}
            >
              Add Data Point
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Status:</span> {mockState.status}
            </div>
            <div>
              <span className="font-medium">Generation:</span>{" "}
              {mockState.currentGeneration}
            </div>
            <div>
              <span className="font-medium">Progress:</span>{" "}
              {mockState.progress.toFixed(1)}%
            </div>
            <div>
              <span className="font-medium">Data Points:</span> {dataCount}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Save, load, export, and import simulation data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => saveSession()} disabled={dataCount === 0}>
              <Save className="w-4 h-4 mr-2" />
              Save Session
            </Button>
            <Button
              variant="outline"
              onClick={() => exportToFile()}
              disabled={dataCount === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
                id="file-import"
              />
              <Button variant="outline" asChild>
                <label htmlFor="file-import">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </label>
              </Button>
            </div>
            <Button variant="destructive" onClick={clearAllData}>
              <Database className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Last Saved:</span>{" "}
              {lastSaved ? lastSaved.toLocaleTimeString() : "Never"}
            </div>
            <div>
              <span className="font-medium">Storage Usage:</span>{" "}
              {formatStorageUsage(storageUsage)}
            </div>
            <div>
              <span className="font-medium">Saved Sessions:</span>{" "}
              {savedSessions.length}
            </div>
          </div>

          {savedSessions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Saved Sessions:</h4>
              <div className="space-y-2">
                {savedSessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="text-sm">
                      <div>Session: {session.id.substring(0, 8)}...</div>
                      <div className="text-muted-foreground">
                        {new Date(session.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadSession(session.id)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSession(session.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="font-medium">Avg Population</div>
              <div className="text-2xl">
                {statistics.averagePopulation.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="font-medium">Peak Population</div>
              <div className="text-2xl">{statistics.peakPopulation}</div>
            </div>
            <div>
              <div className="font-medium">Avg Resistance</div>
              <div className="text-2xl">
                {statistics.averageResistance.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="font-medium">Peak Resistance</div>
              <div className="text-2xl">{statistics.peakResistance}</div>
            </div>
            <div>
              <div className="font-medium">Total Generations</div>
              <div className="text-2xl">{statistics.totalGenerations}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Visualization Components */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Live Visualization</h3>

        {/* Population Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Population Chart</CardTitle>
            <CardDescription>
              Real-time bacterial population dynamics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PopulationChart
              data={data}
              loading={isCollecting && dataCount === 0}
              chartType="line"
              showAntibiotic={true}
              config={{ responsive: true, height: 300 }}
            />
          </CardContent>
        </Card>

        {/* Dashboard View */}
        <SimulationDashboard
          data={data}
          loading={isCollecting && dataCount === 0}
          config={{
            layout: "dashboard",
            autoRefresh: true,
            refreshInterval: 1000,
          }}
        />
      </div>
    </div>
  );
};
