"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { StagewiseToolbar } from "@stagewise/toolbar-next";
import { NotificationProvider } from "@/components/ui/notification-system";
import { ErrorMonitoringUtils } from "@/lib/error-monitoring";
import { initializeRecoveryMechanisms } from "@/lib/recovery-mechanisms";

// Initialize recovery mechanisms on client side
if (typeof window !== "undefined") {
  import("@/lib/recovery-mechanisms").then(
    ({ initializeRecoveryMechanisms }) => {
      initializeRecoveryMechanisms();
    }
  );
}

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const stagewiseConfig = {
    plugins: [],
  };

  // Initialize error monitoring and recovery mechanisms
  useEffect(() => {
    // Initialize error monitoring system
    ErrorMonitoringUtils.initialize({
      environment: process.env.NODE_ENV as
        | "development"
        | "staging"
        | "production",
      enablePerformanceMonitoring: true,
      enableUserInteractionTracking: true,
      enableNetworkMonitoring: true,
      enableConsoleCapture: process.env.NODE_ENV === "development",
      sampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% sampling in production
      maxBreadcrumbs: 100,
      maxReports: 1000,
      reportingInterval: 300000, // 5 minutes
      release: process.env.REACT_APP_VERSION || "1.0.0",
    });

    // Initialize recovery mechanisms
    initializeRecoveryMechanisms();

    // Add initial breadcrumb
    ErrorMonitoringUtils.addBreadcrumb("Application initialized", "info", {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    });

    // Cleanup function
    return () => {
      // Cleanup is handled by the monitoring system itself
    };
  }, []);

  return (
    <NotificationProvider>
      {children}
      <Toaster />
      {process.env.NODE_ENV === "development" && (
        <StagewiseToolbar config={stagewiseConfig} />
      )}
    </NotificationProvider>
  );
}
