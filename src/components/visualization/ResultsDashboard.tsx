"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Grid3X3,
  Shield,
  TrendingUp,
  Download,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  Target,
  Beaker,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExportDialog,
  ExportDialogTrigger,
} from "@/components/ui/export-dialog";

// Import visualization components
import { PopulationGrowthChart } from "./PopulationGrowthChart";
import { MutationTrackingChart } from "./MutationTrackingChart";
import { ResistanceEvolutionChart } from "./ResistanceEvolutionChart";

// Centralized data interface for synchronization
interface DashboardData {
  population: typeof sampleGrowthData;
  mutations: typeof sampleMutationData;
  resistance: typeof sampleResistanceData;
  spatial: typeof samplePetriData;
  lastUpdated: Date;
  isLive: boolean;
}

// Data state interface
interface DataState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  connectionStatus: "connected" | "disconnected" | "connecting";
}

// Sample data for demonstration - in a real app this would come from props/API
const sampleGrowthData = [
  {
    generation: 0,
    populationSize: 100,
    growthRate: 0.1,
    carryingCapacity: 10000,
    populationDensity: 0.01,
    birthRate: 15,
    deathRate: 5,
    netGrowth: 10,
    environmentalStress: 0.1,
    competitionIndex: 0.05,
  },
  {
    generation: 1,
    populationSize: 110,
    growthRate: 0.09,
    carryingCapacity: 10000,
    populationDensity: 0.011,
    birthRate: 16,
    deathRate: 6,
    netGrowth: 10,
    environmentalStress: 0.12,
    competitionIndex: 0.055,
  },
  {
    generation: 2,
    populationSize: 120,
    growthRate: 0.08,
    carryingCapacity: 10000,
    populationDensity: 0.012,
    birthRate: 17,
    deathRate: 7,
    netGrowth: 10,
    environmentalStress: 0.14,
    competitionIndex: 0.06,
  },
  {
    generation: 3,
    populationSize: 135,
    growthRate: 0.12,
    carryingCapacity: 10000,
    populationDensity: 0.0135,
    birthRate: 19,
    deathRate: 4,
    netGrowth: 15,
    environmentalStress: 0.15,
    competitionIndex: 0.065,
  },
  {
    generation: 4,
    populationSize: 155,
    growthRate: 0.15,
    carryingCapacity: 10000,
    populationDensity: 0.0155,
    birthRate: 23,
    deathRate: 3,
    netGrowth: 20,
    environmentalStress: 0.16,
    competitionIndex: 0.07,
  },
];

const sampleMutationData = [
  {
    generation: 0,
    totalMutations: 5,
    pointMutations: 4,
    insertions: 1,
    deletions: 0,
    beneficialMutations: 1,
    neutralMutations: 3,
    deleteriousMutations: 1,
    lethalMutations: 0,
    mutationRate: 0.001,
    averageFitnessEffect: 0.02,
    mutationSpectrum: 0.3,
    hotspotActivity: 0.1,
  },
  {
    generation: 1,
    totalMutations: 7,
    pointMutations: 5,
    insertions: 1,
    deletions: 1,
    beneficialMutations: 2,
    neutralMutations: 4,
    deleteriousMutations: 1,
    lethalMutations: 0,
    mutationRate: 0.0012,
    averageFitnessEffect: 0.03,
    mutationSpectrum: 0.35,
    hotspotActivity: 0.12,
  },
  {
    generation: 2,
    totalMutations: 9,
    pointMutations: 7,
    insertions: 1,
    deletions: 1,
    beneficialMutations: 3,
    neutralMutations: 5,
    deleteriousMutations: 1,
    lethalMutations: 0,
    mutationRate: 0.0013,
    averageFitnessEffect: 0.04,
    mutationSpectrum: 0.4,
    hotspotActivity: 0.15,
  },
];

const sampleResistanceData = [
  {
    generation: 0,
    resistanceFrequency: 0.1,
    mutationRate: 0.001,
    selectedGenes: 2,
    totalMutations: 5,
    fitnessAdvantage: 0.05,
    selectionPressure: 0.2,
  },
  {
    generation: 1,
    resistanceFrequency: 0.15,
    mutationRate: 0.0012,
    selectedGenes: 3,
    totalMutations: 12,
    fitnessAdvantage: 0.08,
    selectionPressure: 0.25,
  },
  {
    generation: 2,
    resistanceFrequency: 0.22,
    mutationRate: 0.0013,
    selectedGenes: 4,
    totalMutations: 21,
    fitnessAdvantage: 0.12,
    selectionPressure: 0.3,
  },
  {
    generation: 3,
    resistanceFrequency: 0.33,
    mutationRate: 0.0015,
    selectedGenes: 5,
    totalMutations: 36,
    fitnessAdvantage: 0.18,
    selectionPressure: 0.35,
  },
  {
    generation: 4,
    resistanceFrequency: 0.42,
    mutationRate: 0.0018,
    selectedGenes: 6,
    totalMutations: 54,
    fitnessAdvantage: 0.25,
    selectionPressure: 0.4,
  },
];

const samplePetriData = {
  bacteria: [
    {
      id: "1",
      position: { x: 10, y: 10 },
      resistance_status: "sensitive" as const,
      fitness: 1.0,
      generation: 1,
    },
    {
      id: "2",
      position: { x: 20, y: 15 },
      resistance_status: "resistant" as const,
      fitness: 1.2,
      generation: 1,
    },
    {
      id: "3",
      position: { x: 15, y: 25 },
      resistance_status: "intermediate" as const,
      fitness: 1.1,
      generation: 1,
    },
  ],
  antibiotic_zones: [
    { id: "zone1", center: { x: 25, y: 25 }, radius: 10, concentration: 0.8 },
  ],
  grid_statistics: {
    total_bacteria: 3,
    occupied_cells: 3,
    occupancy_rate: 0.1,
    antibiotic_coverage: 0.2,
    grid_dimensions: [50, 50] as [number, number],
    physical_dimensions: [50, 50] as [number, number],
  },
  timestamp: Date.now(),
};

interface ResultsDashboardProps {
  simulationId?: string;
  initialData?: Partial<DashboardData>;
  onRefresh?: () => void;
  onExport?: (format: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function ResultsDashboard({
  simulationId,
  initialData,
  onRefresh,
  onExport,
  autoRefresh = true,
  refreshInterval = 5000,
}: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState("population");
  const [dataState, setDataState] = useState<DataState>({
    data: null,
    loading: false,
    error: null,
    connectionStatus: "disconnected",
  });

  // Initialize data
  useEffect(() => {
    const initializeData = () => {
      const defaultData: DashboardData = {
        population: sampleGrowthData,
        mutations: sampleMutationData,
        resistance: sampleResistanceData,
        spatial: samplePetriData,
        lastUpdated: new Date(),
        isLive: false,
      };

      setDataState(prev => ({
        ...prev,
        data: { ...defaultData, ...initialData },
        loading: false,
        connectionStatus: simulationId ? "connected" : "disconnected",
      }));
    };

    initializeData();
  }, [initialData, simulationId]);

  // Simulate data updates
  const updateData = useCallback(async () => {
    if (!dataState.data) return;

    setDataState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate data evolution
      const currentGen =
        dataState.data.population[dataState.data.population.length - 1]
          ?.generation || 0;
      const newGen = currentGen + 1;

      const newPopulationPoint = {
        generation: newGen,
        populationSize: Math.floor(
          dataState.data.population[dataState.data.population.length - 1]
            .populationSize *
            (1 + Math.random() * 0.2 - 0.05)
        ),
        growthRate: Math.random() * 0.2,
        carryingCapacity: 10000,
        populationDensity: Math.random() * 0.02,
        birthRate: 15 + Math.floor(Math.random() * 10),
        deathRate: 5 + Math.floor(Math.random() * 5),
        netGrowth: Math.floor(Math.random() * 25),
        environmentalStress: Math.random() * 0.3,
        competitionIndex: Math.random() * 0.1,
      };

      const newMutationPoint = {
        generation: newGen,
        totalMutations:
          dataState.data.mutations[dataState.data.mutations.length - 1]
            .totalMutations + Math.floor(Math.random() * 5),
        pointMutations: Math.floor(Math.random() * 8),
        insertions: Math.floor(Math.random() * 3),
        deletions: Math.floor(Math.random() * 2),
        beneficialMutations: Math.floor(Math.random() * 4),
        neutralMutations: Math.floor(Math.random() * 6),
        deleteriousMutations: Math.floor(Math.random() * 2),
        lethalMutations: 0,
        mutationRate: Math.random() * 0.003,
        averageFitnessEffect: Math.random() * 0.1 - 0.02,
        mutationSpectrum: Math.random() * 0.5,
        hotspotActivity: Math.random() * 0.3,
      };

      const newResistancePoint = {
        generation: newGen,
        resistanceFrequency: Math.min(
          1,
          dataState.data.resistance[dataState.data.resistance.length - 1]
            .resistanceFrequency +
            Math.random() * 0.1
        ),
        mutationRate: Math.random() * 0.003,
        selectedGenes: Math.floor(Math.random() * 8) + 2,
        totalMutations: newMutationPoint.totalMutations,
        fitnessAdvantage: Math.random() * 0.3,
        selectionPressure: Math.random() * 0.6,
      };

      setDataState(prev => ({
        ...prev,
        data: prev.data
          ? {
              ...prev.data,
              population: [
                ...prev.data.population.slice(-4),
                newPopulationPoint,
              ],
              mutations: [...prev.data.mutations.slice(-4), newMutationPoint],
              resistance: [
                ...prev.data.resistance.slice(-4),
                newResistancePoint,
              ],
              lastUpdated: new Date(),
              isLive: true,
            }
          : null,
        loading: false,
        connectionStatus: "connected",
      }));
    } catch {
      setDataState(prev => ({
        ...prev,
        loading: false,
        error: "Failed to refresh data",
        connectionStatus: "disconnected",
      }));
    }
  }, [dataState.data]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (autoRefresh && simulationId) {
      const interval = setInterval(updateData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, simulationId, refreshInterval, updateData]);

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await updateData();
    }
  };

  const handleExport = (format: string) => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export logic - now handled by ExportDialog
      console.log(`Exporting data in ${format} format...`, dataState.data);
    }
  };

  // Convert dashboard data to export-compatible format
  const getExportData = () => {
    if (!dataState.data) return [];

    // Convert population data to the expected format
    return dataState.data.population.map(point => ({
      generation: point.generation,
      timestamp: new Date().toISOString(), // You may want to add proper timestamps
      totalPopulation: point.populationSize,
      resistantPopulation: Math.floor(point.populationSize * 0.1), // Approximate
      sensitivePopulation: Math.floor(point.populationSize * 0.9), // Approximate
      antibioticConcentration: 0.5, // You may want to add this to your data
      fitnessScore: 1.0,
      mutationRate: 0.001,
    }));
  };

  // Get visualization references for export
  const getVisualizationRefs = () => {
    // This would be populated with actual chart references in a real implementation
    return [
      {
        id: "population-chart",
        name: "Population Growth Chart",
        chartRef: React.createRef<HTMLElement>(),
        type: "line",
      },
      {
        id: "resistance-chart",
        name: "Resistance Analysis Chart",
        chartRef: React.createRef<HTMLElement>(),
        type: "bar",
      },
    ];
  };

  if (!dataState.data) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Connection Status Alert */}
      {dataState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{dataState.error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Simulation Results Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive analysis of bacterial population dynamics and
            resistance evolution
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs text-gray-500">
            <span>
              Last updated: {dataState.data.lastUpdated.toLocaleTimeString()}
            </span>
            {dataState.data.isLive && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Live data
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <Badge
            variant={
              dataState.connectionStatus === "connected"
                ? "outline"
                : "destructive"
            }
            className="flex items-center space-x-1 w-fit"
          >
            <Activity className="h-3 w-3" />
            <span>
              {dataState.connectionStatus === "connected"
                ? "Connected"
                : "Offline"}
            </span>
          </Badge>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={dataState.loading}
              className="flex items-center space-x-1"
            >
              <RefreshCw
                className={`h-4 w-4 ${dataState.loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <ExportDialog
              trigger={
                <ExportDialogTrigger variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </ExportDialogTrigger>
              }
              simulationData={getExportData()}
              sessionData={{
                sessionId: simulationId || "dashboard-session",
                startTime: new Date().toISOString(),
                parameters: {},
                metadata: {
                  dashboard: "results",
                  dataSource: "simulation",
                },
              }}
              visualizations={getVisualizationRefs()}
            />
          </div>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger
            value="population"
            className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 p-2 sm:p-3"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs sm:text-sm text-center">Population</span>
          </TabsTrigger>
          <TabsTrigger
            value="spatial"
            className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 p-2 sm:p-3"
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="text-xs sm:text-sm text-center">Spatial</span>
          </TabsTrigger>
          <TabsTrigger
            value="resistance"
            className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 p-2 sm:p-3"
          >
            <Shield className="h-4 w-4" />
            <span className="text-xs sm:text-sm text-center">Resistance</span>
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 p-2 sm:p-3"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs sm:text-sm text-center">Summary</span>
          </TabsTrigger>
        </TabsList>

        {/* Population Dynamics Tab */}
        <TabsContent value="population" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  <span>Population Growth</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Real-time bacterial population growth and decline over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <PopulationGrowthChart
                  data={dataState.data.population}
                  title="Population Growth Over Time"
                  showCarryingCapacity={true}
                  showGrowthRate={true}
                  chartType="composed"
                  config={{ height: 300 }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Activity className="h-5 w-5" />
                  <span>Generation Statistics</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Key metrics for each generation
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {dataState.data.population[
                          dataState.data.population.length - 1
                        ]?.generation || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Current Generation
                      </div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {dataState.data.population[
                          dataState.data.population.length - 1
                        ]?.populationSize.toLocaleString() || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Population Size
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600">
                        {(
                          (dataState.data.population[
                            dataState.data.population.length - 1
                          ]?.growthRate || 0) * 100
                        ).toFixed(1)}
                        %
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Growth Rate
                      </div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600">
                        {(
                          (dataState.data.population[
                            dataState.data.population.length - 1
                          ]?.populationDensity || 0) * 100
                        ).toFixed(2)}
                        %
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Density
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Mutation Tracking</CardTitle>
              <CardDescription className="text-sm">
                Track mutation events and their impact on population fitness
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <MutationTrackingChart
                data={dataState.data.mutations}
                title="Mutation Events Over Time"
                showMutationTypes={true}
                showEffects={true}
                chartType="combined"
                config={{ height: 250 }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spatial View Tab */}
        <TabsContent value="spatial" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Grid3X3 className="h-5 w-5" />
                <span>Spatial Distribution Grid</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Interactive grid showing spatial distribution of bacterial
                populations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-auto">
                <SimpleGridVisualization data={dataState.data.spatial} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Spatial Controls</CardTitle>
                <CardDescription className="text-sm">
                  Control spatial visualization parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Zoom Level:</span>
                    <span className="font-medium">1.0x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Grid Visibility:</span>
                    <Badge variant="outline" className="text-xs">
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Antibiotic Zones:</span>
                    <Badge variant="outline" className="text-xs">
                      Visible
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Animation Speed:</span>
                    <span className="font-medium">Normal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Spatial Statistics</CardTitle>
                <CardDescription className="text-sm">
                  Key spatial distribution metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Population density:</span>
                    <span className="font-medium">
                      {(
                        dataState.data.spatial.grid_statistics.occupancy_rate *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Occupied cells:</span>
                    <span className="font-medium">
                      {dataState.data.spatial.grid_statistics.occupied_cells}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Antibiotic coverage:</span>
                    <span className="font-medium">
                      {(
                        dataState.data.spatial.grid_statistics
                          .antibiotic_coverage * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Grid dimensions:</span>
                    <span className="font-medium">
                      {dataState.data.spatial.grid_statistics.grid_dimensions.join(
                        " × "
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resistance Distribution Tab */}
        <TabsContent value="resistance" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Shield className="h-5 w-5" />
                  <span>Resistance Evolution</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Track resistance levels over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[300px] sm:h-[350px] lg:h-[400px] overflow-hidden flex">
                  <ResistanceEvolutionChart
                    data={dataState.data.resistance}
                    title="Resistance Evolution Over Time"
                    config={{
                      responsive: true,
                      height: 280, // Calculated to fit within container minus title/padding
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Resistance Distribution
                </CardTitle>
                <CardDescription className="text-sm">
                  Current distribution of resistance levels
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ResistanceDistributionChart data={dataState.data.resistance} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Resistance Gene Analysis
              </CardTitle>
              <CardDescription className="text-sm">
                Detailed analysis of resistance genes and their frequency
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ResistanceGeneAnalysis data={dataState.data.resistance} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Statistics Tab */}
        <TabsContent value="summary" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Population
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold">
                  {dataState.data.population[
                    dataState.data.population.length - 1
                  ]?.populationSize.toLocaleString() || "--"}
                </div>
                <p className="text-xs text-muted-foreground">
                  bacteria across all generations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold">
                  {dataState.data.population[
                    dataState.data.population.length - 1
                  ]?.generation || "--"}
                </div>
                <p className="text-xs text-muted-foreground">
                  simulation generations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Resistance Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold">33%</div>
                <p className="text-xs text-muted-foreground">
                  of population resistant
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Mutation Events
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold">
                  {dataState.data.mutations[dataState.data.mutations.length - 1]
                    ?.totalMutations || "--"}
                </div>
                <p className="text-xs text-muted-foreground">
                  total mutations recorded
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  <span>Key Performance Indicators</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Fitness</span>
                      <span className="font-medium">
                        {(
                          dataState.data.mutations[
                            dataState.data.mutations.length - 1
                          ]?.averageFitnessEffect || 0
                        ).toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Genetic Diversity</span>
                      <span className="font-medium">
                        {(
                          (dataState.data.mutations[
                            dataState.data.mutations.length - 1
                          ]?.mutationSpectrum || 0) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Selection Pressure</span>
                      <span className="font-medium">
                        {(
                          (dataState.data.population[
                            dataState.data.population.length - 1
                          ]?.environmentalStress || 0) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mutation Rate</span>
                      <span className="font-medium">
                        {(
                          (dataState.data.mutations[
                            dataState.data.mutations.length - 1
                          ]?.mutationRate || 0) * 1000
                        ).toFixed(2)}
                        /1000
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Simulation Timeline</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Start Time</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Duration</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Generations/sec</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status</span>
                      <Badge variant="outline" className="text-xs">
                        Ready
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Detailed Analysis</CardTitle>
              <CardDescription className="text-sm">
                Comprehensive statistical analysis of simulation results
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Population Dynamics
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Peak Population:</span>
                      <span className="font-medium">
                        {Math.max(
                          ...dataState.data.population.map(
                            d => d.populationSize
                          )
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Growth Trend:</span>
                      <span className="font-medium text-green-600">
                        ↗ Increasing
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Carrying Capacity:</span>
                      <span className="font-medium">
                        {dataState.data.population[0]?.carryingCapacity.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Environmental Stress:</span>
                      <span className="font-medium">
                        {(
                          (dataState.data.population[
                            dataState.data.population.length - 1
                          ]?.environmentalStress || 0) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Evolutionary Trends
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Resistance Trend:</span>
                      <span className="font-medium text-red-600">↗ Rising</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mutation Frequency:</span>
                      <span className="font-medium">
                        {(
                          (dataState.data.mutations[
                            dataState.data.mutations.length - 1
                          ]?.mutationRate || 0) * 1000
                        ).toFixed(3)}
                        /1000
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Beneficial Mutations:</span>
                      <span className="font-medium">
                        {dataState.data.mutations[
                          dataState.data.mutations.length - 1
                        ]?.beneficialMutations || "--"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Genetic Diversity:</span>
                      <span className="font-medium">
                        {(
                          (dataState.data.mutations[
                            dataState.data.mutations.length - 1
                          ]?.mutationSpectrum || 0) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Simulation Insights
                </h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    • Population showing steady growth with increasing
                    resistance adaptation
                  </p>
                  <p>
                    • Environmental pressure driving natural selection toward
                    resistance
                  </p>
                  <p>
                    • Mutation events contributing to genetic diversity and
                    fitness improvements
                  </p>
                  <p>
                    • Spatial distribution indicates clustering around favorable
                    conditions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simple grid visualization component to replace PetriDishVisualization
const SimpleGridVisualization = ({
  data,
}: {
  data: typeof samplePetriData;
}) => {
  const gridSize = 20;
  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const renderGrid = () => {
    const cells = [];

    // Get container dimensions for responsive cell sizing
    const containerSize = Math.min(window.innerWidth - 64, 600); // Max 600px, min viewport - padding
    const cellSize = Math.floor(containerSize / gridSize);

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        // Generate realistic cell data
        const hasAntibiotic =
          Math.random() < data.grid_statistics.antibiotic_coverage;
        const hasBacteria = Math.random() < data.grid_statistics.occupancy_rate;
        const resistance = Math.random();

        let cellClass =
          "border border-gray-200 transition-all duration-200 cursor-pointer ";
        let cellContent = null;

        if (hasAntibiotic) {
          cellClass += "bg-red-100 ";
        }

        if (hasBacteria) {
          if (resistance > 0.7) {
            cellClass += "bg-red-500 hover:bg-red-600 ";
            cellContent = "R";
          } else if (resistance > 0.4) {
            cellClass += "bg-yellow-500 hover:bg-yellow-600 ";
            cellContent = "I";
          } else {
            cellClass += "bg-green-500 hover:bg-green-600 ";
            cellContent = "S";
          }
        } else {
          cellClass += "bg-gray-50 hover:bg-gray-100 ";
        }

        if (selectedCell?.x === x && selectedCell?.y === y) {
          cellClass += "ring-2 ring-blue-500 ";
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            className={cellClass}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              fontSize: `${Math.max(8, cellSize * 0.4)}px`,
            }}
            onClick={() =>
              setSelectedCell(
                selectedCell?.x === x && selectedCell?.y === y ? null : { x, y }
              )
            }
            title={`Cell (${x}, ${y}): ${
              hasBacteria
                ? resistance > 0.7
                  ? "Resistant"
                  : resistance > 0.4
                  ? "Intermediate"
                  : "Sensitive"
                : "Empty"
            }`}
          >
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              {cellContent}
            </div>
          </div>
        );
      }
    }

    return cells;
  };

  return (
    <div className="space-y-4">
      {/* Grid Container */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div
            className="grid gap-0 mx-auto border border-gray-300 rounded-lg overflow-hidden shadow-sm"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              maxWidth: "600px",
              aspectRatio: "1",
            }}
          >
            {renderGrid()}
          </div>
        </div>

        {/* Legend and Cell Info */}
        <div className="lg:w-64 space-y-4">
          {/* Legend */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium text-sm mb-3">Legend</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                <span>Resistant (R)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
                <span>Intermediate (I)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                <span>Sensitive (S)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded-sm"></div>
                <span>Antibiotic Zone</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded-sm"></div>
                <span>Empty Space</span>
              </div>
            </div>
          </div>

          {/* Selected Cell Info */}
          {selectedCell && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2">Cell Information</h4>
              <div className="text-xs space-y-1">
                <div>
                  Position: ({selectedCell.x}, {selectedCell.y})
                </div>
                <div>Click cell to view details</div>
              </div>
            </div>
          )}

          {/* Mobile Instructions */}
          <div className="lg:hidden bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">
              Tap cells to view details. Pinch to zoom on mobile devices.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            {data.grid_statistics.occupied_cells}
          </div>
          <div className="text-xs text-gray-600">Occupied Cells</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-red-600">
            {Math.round(data.grid_statistics.occupied_cells * 0.42)}
          </div>
          <div className="text-xs text-gray-600">Resistant</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-yellow-600">
            {Math.round(data.grid_statistics.occupied_cells * 0.08)}
          </div>
          <div className="text-xs text-gray-600">Intermediate</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {Math.round(data.grid_statistics.occupied_cells * 0.5)}
          </div>
          <div className="text-xs text-gray-600">Sensitive</div>
        </div>
      </div>
    </div>
  );
};

// Simple resistance distribution chart
const ResistanceDistributionChart = ({
  data,
}: {
  data: typeof sampleResistanceData;
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {((data[data.length - 1]?.resistanceFrequency || 0) * 100).toFixed(
              1
            )}
            %
          </div>
          <div className="text-sm text-gray-600">Resistant</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {(
              (0.3 - (data[data.length - 1]?.resistanceFrequency || 0)) * 100 ||
              0
            ).toFixed(1)}
            %
          </div>
          <div className="text-sm text-gray-600">Intermediate</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {(
              (0.7 - (data[data.length - 1]?.resistanceFrequency || 0)) * 100 ||
              0
            ).toFixed(1)}
            %
          </div>
          <div className="text-sm text-gray-600">Sensitive</div>
        </div>
      </div>

      <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 mb-2">
            Resistance Distribution
          </div>
          <div className="text-sm text-gray-500">
            Visual pie chart representation will be added here
          </div>
        </div>
      </div>
    </div>
  );
};

// Resistance gene analysis component
const ResistanceGeneAnalysis = ({
  data,
}: {
  data: typeof sampleResistanceData;
}) => {
  const latestData = data[data.length - 1] || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Selected Genes:</span>
            <span className="font-medium">
              {latestData.selectedGenes || "--"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Fitness Advantage:</span>
            <span className="font-medium">
              {((latestData.fitnessAdvantage || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Selection Pressure:</span>
            <span className="font-medium">
              {((latestData.selectionPressure || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Mutations:</span>
            <span className="font-medium">
              {latestData.totalMutations || "--"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Mutation Rate:</span>
            <span className="font-medium">
              {((latestData.mutationRate || 0) * 1000).toFixed(2)}/1000
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Gene Frequency:</span>
            <span className="font-medium">
              {((latestData.resistanceFrequency || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">
          Gene Evolution Summary
        </div>
        <div className="text-xs text-blue-700">
          Resistance genes under positive selection:{" "}
          {latestData.selectedGenes || 0}
          <br />
          Average fitness benefit per resistance gene:{" "}
          {(
            ((latestData.fitnessAdvantage || 0) /
              (latestData.selectedGenes || 1)) *
            100
          ).toFixed(2)}
          %
        </div>
      </div>
    </div>
  );
};
