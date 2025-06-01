"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResponsiveHeader } from "@/components/ui/responsive-header";

// Dynamic imports to prevent SSR issues with browser API access
const SimulationParametersForm = dynamic(
  () => import("@/components/simulation/SimulationParametersForm"),
  { ssr: false }
);
const SimulationController = dynamic(
  () => import("@/components/simulation/SimulationController"),
  { ssr: false }
);
const ResultsDashboard = dynamic(
  () => import("@/components/visualization/ResultsDashboard"),
  { ssr: false }
);

export default function Home() {
  const [currentTab, setCurrentTab] = useState("parameters");
  const [simulationStatus, setSimulationStatus] = useState<
    "idle" | "running" | "completed" | "error"
  >("idle");

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
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

        <ResponsiveHeader
          currentTab={currentTab}
          onTabChange={handleTabChange}
          simulationStatus={simulationStatus}
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
                <SimulationParametersForm />
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
  );
}
