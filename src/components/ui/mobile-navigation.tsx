"use client";

import React, { useState } from "react";
import { Menu, Beaker, Settings, BarChart3, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface MobileNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  simulationStatus?: "idle" | "running" | "completed" | "error";
  className?: string;
}

export function MobileNavigation({
  currentTab,
  onTabChange,
  simulationStatus = "idle",
  className,
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false);

  const navigationItems = [
    {
      id: "parameters",
      label: "Parameters",
      shortLabel: "Config",
      icon: Settings,
      description: "Configure simulation settings",
      badge: null,
    },
    {
      id: "simulation",
      label: "Simulation",
      shortLabel: "Run",
      icon: Beaker,
      description: "Start and monitor simulation",
      badge: simulationStatus === "running" ? "Running" : null,
    },
    {
      id: "results",
      label: "Results",
      shortLabel: "Analysis",
      icon: BarChart3,
      description: "View data and visualizations",
      badge: simulationStatus === "completed" ? "Ready" : null,
    },
  ];

  const handleNavigation = (tabId: string) => {
    onTabChange(tabId);
    setOpen(false); // Close sheet after navigation
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500 text-white";
      case "completed":
        return "bg-green-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`md:hidden ${className}`}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
          <span className="ml-2 font-medium">
            {navigationItems.find(item => item.id === currentTab)?.shortLabel ||
              "Menu"}
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-blue-600" />
            Bacterial Simulation
          </SheetTitle>
          <SheetDescription>
            Navigate between simulation sections
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg text-left transition-colors
                  ${
                    isActive
                      ? "bg-blue-50 border-2 border-blue-200 text-blue-700"
                      : "hover:bg-gray-50 border-2 border-transparent"
                  }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? "text-blue-600" : "text-gray-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        isActive ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getStatusColor(
                          simulationStatus
                        )}`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      isActive ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
          <Info className="h-4 w-4" />
          <span>Tap outside to close</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNavigation;
