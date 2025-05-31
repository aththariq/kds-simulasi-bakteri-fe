"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SimulationParametersForm from "@/components/simulation/SimulationParametersForm";
import SimulationController from "@/components/simulation/SimulationController";
import ResultsDashboard from "@/components/visualization/ResultsDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bacterial Antibiotic Resistance Simulation
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Interactive web simulation modeling bacterial evolution and
            antibiotic resistance spread using computational biology and data
            visualization
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Kelompok 6: Aththariq Lisan Q. D. S., Anthony Bryant Gouw, Richie
            Leonardo
          </p>
        </header>

        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="parameters">Simulation Parameters</TabsTrigger>
            <TabsTrigger value="simulation">Run Simulation</TabsTrigger>
            <TabsTrigger value="results">Results & Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configure Simulation Parameters</CardTitle>
                <CardDescription>
                  Set up the initial conditions and parameters for your
                  bacterial population simulation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimulationParametersForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulation Control</CardTitle>
                <CardDescription>
                  Start, monitor, and control your bacterial simulation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimulationController />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <ResultsDashboard
              onRefresh={() => {
                console.log("Refreshing simulation data...");
              }}
              onExport={(format: string) => {
                console.log(`Exporting data in ${format} format...`);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
