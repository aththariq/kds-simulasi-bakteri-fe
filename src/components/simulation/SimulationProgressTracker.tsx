"use client";

import * as React from "react";
import {
  Play,
  Pause,
  Square,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Download,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ExportDialog,
  ExportDialogTrigger,
} from "@/components/ui/export-dialog";
import { Session } from "@/types/session";
import { SimulationParameters } from "@/lib/validation";

// Define proper types for simulation data
interface SimulationDataPoint {
  generation: number;
  totalPopulation: number;
  resistantPopulation: number;
  sensitivePopulation: number;
  antibioticConcentration: number;
  timestamp?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Update VisualizationData to match ExportDialog expectations
interface VisualizationData {
  id: string;
  name: string;
  chartRef: React.RefObject<HTMLElement>;
  type: string;
}

// Types for simulation state management
interface SimulationState {
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

interface SimulationProgressTrackerProps {
  simulationState: SimulationState;
  onStart: () => void;
  onPause: () => void;
  onCancel: () => void;
  disabled?: boolean;

  // Optional data for export functionality
  simulationData?: SimulationDataPoint[];
  sessionData?: Session;
  parameters?: SimulationParameters;
  visualizations?: VisualizationData[];
}

export default function SimulationProgressTracker({
  simulationState,
  onStart,
  onPause,
  onCancel,
  disabled = false,
  simulationData,
  sessionData,
  parameters,
  visualizations,
}: SimulationProgressTrackerProps) {
  // Format time helper function
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get status badge variant based on simulation status
  const getStatusBadgeVariant = (status: SimulationState["status"]) => {
    switch (status) {
      case "idle":
        return "outline";
      case "running":
        return "default";
      case "paused":
        return "secondary";
      case "completed":
        return "default";
      case "error":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "outline";
    }
  };

  // Get status icon based on simulation status
  const getStatusIcon = (status: SimulationState["status"]) => {
    switch (status) {
      case "idle":
        return <Clock className="h-4 w-4" />;
      case "running":
        return <Activity className="h-4 w-4" />;
      case "paused":
        return <Pause className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "cancelled":
        return <Square className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Get control buttons based on current status
  const renderControlButtons = () => {
    const { status } = simulationState;
    const hasExportData =
      (simulationData && simulationData.length > 0) ||
      parameters ||
      (visualizations && visualizations.length > 0);

    if (status === "idle" || status === "cancelled" || status === "error") {
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={onStart}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Simulation
          </Button>
          {hasExportData && (
            <ExportDialog
              trigger={
                <ExportDialogTrigger variant="outline" size="default">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </ExportDialogTrigger>
              }
              simulationData={simulationData}
              sessionData={sessionData}
              parameters={parameters}
              visualizations={visualizations}
            />
          )}
        </div>
      );
    }

    if (status === "running") {
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onPause} disabled={disabled}>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
          <Button variant="destructive" onClick={onCancel} disabled={disabled}>
            <Square className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      );
    }

    if (status === "paused") {
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={onStart} disabled={disabled}>
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
          <Button variant="destructive" onClick={onCancel} disabled={disabled}>
            <Square className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          {hasExportData && (
            <ExportDialog
              trigger={
                <ExportDialogTrigger variant="outline" size="default">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </ExportDialogTrigger>
              }
              simulationData={simulationData}
              sessionData={sessionData}
              parameters={parameters}
              visualizations={visualizations}
            />
          )}
        </div>
      );
    }

    if (status === "completed") {
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={onStart}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Again
          </Button>
          <ExportDialog
            trigger={
              <ExportDialogTrigger variant="default" size="default">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </ExportDialogTrigger>
            }
            simulationData={simulationData}
            sessionData={sessionData}
            parameters={parameters}
            visualizations={visualizations}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {simulationState.status === "error" && simulationState.errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Simulation Error</AlertTitle>
          <AlertDescription>{simulationState.errorMessage}</AlertDescription>
        </Alert>
      )}

      {simulationState.status === "completed" && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Simulation Completed</AlertTitle>
          <AlertDescription>
            Your bacterial simulation has completed successfully. Check the
            Results & Analysis tab for detailed findings.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Simulation Progress
                <Badge variant={getStatusBadgeVariant(simulationState.status)}>
                  {getStatusIcon(simulationState.status)}
                  {simulationState.status.charAt(0).toUpperCase() +
                    simulationState.status.slice(1)}
                </Badge>
              </CardTitle>
              <CardDescription>
                Monitor the current simulation progress and control execution
              </CardDescription>
            </div>
            {renderControlButtons()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Generation {simulationState.currentGeneration} of{" "}
                {simulationState.totalGenerations}
              </span>
              <span>{Math.round(simulationState.progress)}%</span>
            </div>
            <Progress value={simulationState.progress} className="w-full" />
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Elapsed Time</span>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(simulationState.elapsedTime)}
              </Badge>
            </div>
            {simulationState.status === "running" &&
              simulationState.estimatedTimeRemaining > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Est. Remaining</span>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(simulationState.estimatedTimeRemaining)}
                  </Badge>
                </div>
              )}
          </div>

          {/* Population Statistics */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Current Population Statistics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Total Bacteria</span>
                <Badge variant="outline">
                  {simulationState.bacteriaCount.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Resistant Bacteria</span>
                <Badge
                  variant={
                    simulationState.resistantBacteriaCount > 0
                      ? "destructive"
                      : "outline"
                  }
                >
                  {simulationState.resistantBacteriaCount.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Resistance Rate</span>
                <Badge
                  variant={
                    simulationState.bacteriaCount > 0
                      ? simulationState.resistantBacteriaCount /
                          simulationState.bacteriaCount >
                        0.5
                        ? "destructive"
                        : "secondary"
                      : "outline"
                  }
                >
                  {simulationState.bacteriaCount > 0
                    ? `${Math.round(
                        (simulationState.resistantBacteriaCount /
                          simulationState.bacteriaCount) *
                          100
                      )}%`
                    : "0%"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Environment Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Environment Conditions</h4>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Antibiotic Concentration</span>
              <Badge
                variant={
                  simulationState.antibioticConcentration > 0.5
                    ? "destructive"
                    : "secondary"
                }
              >
                {(simulationState.antibioticConcentration * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>

          {/* Progress Details */}
          {(simulationState.status === "running" ||
            simulationState.status === "paused") && (
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>
                Generation {simulationState.currentGeneration} is currently
                being processed. The simulation will automatically progress
                through each generation until completion.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
