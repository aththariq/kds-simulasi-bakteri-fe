"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileNavigation } from "./mobile-navigation";

export interface ResponsiveHeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  simulationStatus?:
    | "idle"
    | "running"
    | "paused"
    | "completed"
    | "error"
    | "cancelled";
  className?: string;
}

export function ResponsiveHeader({
  currentTab,
  onTabChange,
  simulationStatus = "idle",
  className,
}: ResponsiveHeaderProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Desktop Navigation - Hidden on mobile */}
      <Tabs
        value={currentTab}
        onValueChange={onTabChange}
        className="hidden md:block"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parameters" className="text-sm lg:text-base">
            Simulation Parameters
          </TabsTrigger>
          <TabsTrigger value="simulation" className="text-sm lg:text-base">
            Run Simulation
          </TabsTrigger>
          <TabsTrigger value="results" className="text-sm lg:text-base">
            Results & Analysis
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mobile Navigation - Shown only on mobile */}
      <div className="md:hidden flex justify-center">
        <MobileNavigation
          currentTab={currentTab}
          onTabChange={onTabChange}
          simulationStatus={simulationStatus}
        />
      </div>
    </div>
  );
}

export default ResponsiveHeader;
