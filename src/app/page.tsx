"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SimulationParametersForm from "@/components/simulation/SimulationParametersForm";
import SimulationController from "@/components/simulation/SimulationController";
import ResultsDashboard from "@/components/visualization/ResultsDashboard";
import { ResponsiveHeader } from "@/components/ui/responsive-header";
import { PageHead } from "@/components/ui/page-head";
import {
  SimulationProvider,
  useSimulation,
} from "@/contexts/SimulationContext";
import {
  ResistanceNetworkGraph,
  type NetworkNode,
} from "@/components/visualization/d3/ResistanceNetworkGraph";
import { usePetriDishData } from "@/components/visualization/hooks/usePetriDishData";

// Helper function to generate mock data for the network graph (similar to ResultsDashboard)
// This should ideally come from the running simulation later
/*
interface ResistanceDataPoint {
  generation: number;
  resistanceFrequency: number;
  mutationRate: number;
  selectedGenes: string[];
  totalMutations: number;
  fitnessAdvantage: number;
  selectionPressure: number;
  timestamp: string;
  totalPopulation: number;
  resistantCount: number;
  geneFrequencies: Record<string, number>;
  hgtEvents: number;
  mutationEvents: number;
}

const getMockNetworkData = (): ResistanceDataPoint[] => {
  return Array.from({ length: 5 }, (_, i) => ({
    generation: i * 10,
    resistanceFrequency: Math.random() * 0.5,
    mutationRate: 0.001,
    selectedGenes: ["ampR", "tetR"],
    totalMutations: Math.floor(Math.random() * 100),
    fitnessAdvantage: Math.random() * 0.2,
    selectionPressure: 1.0,
    timestamp: new Date().toISOString(),
    totalPopulation: 1000 + Math.floor(Math.random() * 500),
    resistantCount: Math.floor(Math.random() * 500),
    geneFrequencies: {
      ampR: Math.random() * 0.3 + 0.1,
      tetR: Math.random() * 0.25 + 0.05,
      strR: Math.random() * 0.2 + 0.1,
      chlR: Math.random() * 0.15 + 0.05,
    },
    hgtEvents: Math.floor(Math.random() * 5) + 1,
    mutationEvents: Math.floor(Math.random() * 20),
  }));
};
*/

function HomePageContent() {
  const [currentTab, setCurrentTab] = useState("parameters");
  const { simulationState } = useSimulation();
  // Use a simple simulation ID - this could be enhanced to use actual simulation IDs from the backend
  const currentSimulationId =
    simulationState.status !== "idle" ? "current-simulation" : undefined;

  const [liveNetworkNodes, setLiveNetworkNodes] = useState<NetworkNode[]>([]);

  const {
    data: petriDishData,
    isConnected: isPetriDishConnected,
    connect: connectPetriDishWs,
    disconnect: disconnectPetriDishWs,
  } = usePetriDishData({
    simulationId: currentSimulationId,
    autoConnect: false,
  });

  useEffect(() => {
    if (
      currentTab === "simulation" &&
      currentSimulationId &&
      !isPetriDishConnected
    ) {
      console.log(
        "Connecting to Petri Dish WebSocket for simulation:",
        currentSimulationId
      );
      connectPetriDishWs(currentSimulationId);
    } else if (currentTab !== "simulation" && isPetriDishConnected) {
      console.log("Disconnecting from Petri Dish WebSocket");
      disconnectPetriDishWs();
    }

    return () => {
      if (isPetriDishConnected) {
        disconnectPetriDishWs();
      }
    };
  }, [
    currentTab,
    currentSimulationId,
    isPetriDishConnected,
    connectPetriDishWs,
    disconnectPetriDishWs,
  ]);

  useEffect(() => {
    if (
      petriDishData &&
      petriDishData.bacteria &&
      currentTab === "simulation"
    ) {
      const transformedNodes: NetworkNode[] = petriDishData.bacteria.map(
        (bacterium: { id?: string; isResistant?: boolean }, index: number) => ({
          id: bacterium.id || `bacterium-${index}`,
          label: bacterium.id
            ? `B-${bacterium.id.substring(0, 4)}`
            : `B-${index}`,
          type: "bacterium",
          frequency: 1,
          size: 5,
          color: bacterium.isResistant ? "#d62728" : "#2ca02c",
          metadata: {
            // Populate with relevant metadata from bacterium object
            // e.g., resistanceGenes: bacterium.resistanceGenes
          },
        })
      );
      setLiveNetworkNodes(transformedNodes.slice(0, 100));
    } else if (currentTab !== "simulation") {
      setLiveNetworkNodes([]);
    }
  }, [petriDishData, currentTab]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
    <SimulationProvider>
      <PageHead
        title="Simulasi Resistensi Antibiotik Bakteri"
        description="Platform simulasi interaktif untuk memodelkan evolusi bakteri dan penyebaran resistensi antibiotik menggunakan biologi komputasional dan visualisasi data"
        keywords={[
          "resistensi antibiotik",
          "evolusi bakteri",
          "simulasi interaktif",
          "visualisasi data",
          "computational biology",
          "bioinformatics",
        ]}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <header className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
              Bacterial Antibiotic Resistance Simulation
            </h1>
            <p className="text-sm md:text-lg text-gray-600 max-w-3xl mx-auto px-2">
              Interactive web simulation modeling bacterial evolution and
              antibiotic resistance spread using computational biology and data
              visualization
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-2 px-2">
              Kelompok 6: Aththariq Lisan Q. D. S., Anthony Bryant Gouw, Richie
              Leonardo
            </p>
          </header>

          <SimulationAwareHeader
            currentTab={currentTab}
            onTabChange={handleTabChange}
            className="mb-6"
          />

          <div className="w-full">
            {currentTab === "parameters" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">
                    Configure Simulation Parameters
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Set up the initial conditions and parameters for your
                    bacterial population simulation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SimulationParametersForm onStartSimulation={setCurrentTab} />
                </CardContent>
              </Card>
            )}

            {currentTab === "simulation" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">
                    Simulation Control
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Start, monitor, and control your bacterial simulation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SimulationController />
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-md md:text-lg font-semibold mb-3">
                      Live Resistance Network
                    </h3>
                    <ResistanceNetworkGraph
                      directNodes={liveNetworkNodes}
                      directLinks={[]}
                      config={{
                        width: 600,
                        height: 400,
                        showLabels: liveNetworkNodes.length < 50,
                        enableZoom: true,
                        enableDrag: true,
                        nodeMinSize: 3,
                        nodeMaxSize: 8,
                        linkMinWidth: 1,
                        linkMaxWidth: 4,
                        chargeForce: -50,
                        linkDistance: 20,
                      }}
                      loading={
                        !isPetriDishConnected &&
                        currentTab === "simulation" &&
                        !!currentSimulationId
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentTab === "results" && (
              <ResultsDashboard
                onRefresh={() => {
                  console.log("Refreshing simulation data...");
                }}
                onExport={(format: string) => {
                  console.log(`Exporting data in ${format} format...`);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </SimulationProvider>
  );
}

// Component that uses simulation context for header
function SimulationAwareHeader({
  currentTab,
  onTabChange,
  className,
}: {
  currentTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}) {
  const { simulationState } = useSimulation();

  return (
    <ResponsiveHeader
      currentTab={currentTab}
      onTabChange={onTabChange}
      simulationStatus={simulationState.status}
      className={className}
    />
  );
}

// Wrapper component to ensure client-side rendering
export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Or a loading spinner
  }

  return (
    <SimulationProvider>
      <HomePageContent />
    </SimulationProvider>
  );
}
