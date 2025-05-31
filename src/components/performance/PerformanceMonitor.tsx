"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from "web-vitals";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Cpu,
  HardDrive,
  Zap,
} from "lucide-react";

interface WebVitalsData {
  cls: number | null;
  fid: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  timestamp: string;
}

interface ComponentRenderMetric {
  id: string;
  phase: "mount" | "update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

interface BackendPerformanceData {
  type: string;
  data?: {
    type?: string;
    metrics?: Record<string, unknown>;
    summary?: Record<string, unknown>;
    alerts?: PerformanceAlert[];
    function_name?: string;
    baseline?: Record<string, unknown>;
  };
}

interface PerformanceAlert {
  function_name: string;
  metric_type: string;
  baseline_value: number;
  current_value: number;
  deviation_percent: number;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
}

interface BackendMetrics {
  memory_rss?: number;
  memory_vms?: number;
  cpu_percent?: number;
  thread_count?: number;
  fd_count?: number;
}

// Web Vitals thresholds
const WEB_VITALS_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
};

const PerformanceMonitor: React.FC = () => {
  // State management
  const [webVitals, setWebVitals] = useState<WebVitalsData>({
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    timestamp: new Date().toISOString(),
  });

  const [componentMetrics, setComponentMetrics] = useState<
    ComponentRenderMetric[]
  >([]);
  const [backendMetrics, setBackendMetrics] = useState<BackendMetrics | null>(
    null
  );
  const [performanceAlerts, setPerformanceAlerts] = useState<
    PerformanceAlert[]
  >([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // WebSocket connection for real-time backend metrics
  const { isConnected, sendMessage, lastMessage } = useWebSocket({
    url: `ws://localhost:8000/ws/performance`,
    reconnectAttempts: 5,
    reconnectInterval: 1000,
  });

  // Web Vitals collection
  useEffect(() => {
    if (!isMonitoring) return;

    const handleMetric = (metric: Metric) => {
      setWebVitals(prev => ({
        ...prev,
        [metric.name.toLowerCase()]: metric.value,
        timestamp: new Date().toISOString(),
      }));
    };

    // Collect Web Vitals
    onCLS(handleMetric);
    onINP(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);

    // Performance observer for custom metrics
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log("Navigation timing:", {
              domContentLoaded:
                navEntry.domContentLoadedEventEnd -
                navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              totalTime: navEntry.loadEventEnd - navEntry.fetchStart,
            });
          }
        }
      });

      observer.observe({
        entryTypes: ["navigation", "paint", "largest-contentful-paint"],
      });

      return () => observer.disconnect();
    }
  }, [isMonitoring]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data: BackendPerformanceData = JSON.parse(lastMessage.data);

        if (data.type === "performance_update" && data.data) {
          switch (data.data.type) {
            case "system_metrics":
              setBackendMetrics(data.data.metrics as BackendMetrics);
              break;
            case "performance_summary":
              // Update performance summary
              break;
            case "recent_alerts":
              setPerformanceAlerts(data.data.alerts || []);
              break;
          }
        } else if (data.type === "performance_alert") {
          // Add new alert
          if (data.data) {
            setPerformanceAlerts(prev => [
              data.data as PerformanceAlert,
              ...prev.slice(0, 9),
            ]);
          }
        }
      } catch (error) {
        console.error("Error parsing performance message:", error);
      }
    }
  }, [lastMessage]);

  // Component render profiling
  const onRenderCallback: ProfilerOnRenderCallback = useCallback(
    (
      id: string,
      phase: "mount" | "update" | "nested-update",
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      // Only track mount and update phases for our metrics
      if (phase === "nested-update") return;

      const metric: ComponentRenderMetric = {
        id,
        phase: phase as "mount" | "update",
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      };

      setComponentMetrics(prev => [...prev.slice(-19), metric]);
    },
    []
  );

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(!isMonitoring);

    if (!isMonitoring && isConnected) {
      // Subscribe to performance updates
      sendMessage(
        JSON.stringify({
          type: "subscribe",
          timestamp: new Date().toISOString(),
          data: { subscription_type: "alerts" },
        })
      );
    }
  }, [isMonitoring, isConnected, sendMessage]);

  // Helper functions for performance evaluation
  const getWebVitalStatus = (
    metric: keyof typeof WEB_VITALS_THRESHOLDS,
    value: number | null
  ): string => {
    if (value === null) return "unknown";
    const thresholds = WEB_VITALS_THRESHOLDS[metric];
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.poor) return "needs-improvement";
    return "poor";
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "good":
        return "bg-green-500";
      case "needs-improvement":
        return "bg-yellow-500";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "low":
        return "bg-blue-500";
      case "medium":
        return "bg-yellow-500";
      case "high":
        return "bg-orange-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Calculate average render time for components
  const avgComponentRenderTime = useMemo(() => {
    if (componentMetrics.length === 0) return 0;
    const total = componentMetrics.reduce(
      (sum, metric) => sum + metric.actualDuration,
      0
    );
    return total / componentMetrics.length;
  }, [componentMetrics]);

  return (
    <Profiler id="PerformanceMonitor" onRender={onRenderCallback}>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Performance Monitor</h2>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
        </div>

        {/* Performance Alerts */}
        {performanceAlerts.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              Performance Alerts ({performanceAlerts.length})
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {performanceAlerts.slice(0, 3).map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <span>
                      {alert.function_name}: {alert.metric_type} increased by{" "}
                      {alert.deviation_percent.toFixed(1)}%
                    </span>
                  </div>
                ))}
                {performanceAlerts.length > 3 && (
                  <div className="text-sm text-muted-foreground">
                    ...and {performanceAlerts.length - 3} more alerts
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Performance Tabs */}
        <Tabs defaultValue="web-vitals" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="backend">Backend</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* Web Vitals Tab */}
          <TabsContent value="web-vitals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* LCP */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Largest Contentful Paint
                  </CardTitle>
                  <CardDescription>Loading performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        getWebVitalStatus("lcp", webVitals.lcp)
                      )}`}
                    />
                    <span className="text-2xl font-bold">
                      {webVitals.lcp ? `${webVitals.lcp}ms` : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      webVitals.lcp
                        ? Math.min((webVitals.lcp / 4000) * 100, 100)
                        : 0
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {/* FID */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    First Input Delay
                  </CardTitle>
                  <CardDescription>Interactivity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        getWebVitalStatus("fid", webVitals.fid)
                      )}`}
                    />
                    <span className="text-2xl font-bold">
                      {webVitals.fid ? `${webVitals.fid}ms` : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      webVitals.fid
                        ? Math.min((webVitals.fid / 300) * 100, 100)
                        : 0
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {/* CLS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Cumulative Layout Shift
                  </CardTitle>
                  <CardDescription>Visual stability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        getWebVitalStatus("cls", webVitals.cls)
                      )}`}
                    />
                    <span className="text-2xl font-bold">
                      {webVitals.cls ? webVitals.cls.toFixed(3) : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      webVitals.cls
                        ? Math.min((webVitals.cls / 0.25) * 100, 100)
                        : 0
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {/* FCP */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    First Contentful Paint
                  </CardTitle>
                  <CardDescription>Loading</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        getWebVitalStatus("fcp", webVitals.fcp)
                      )}`}
                    />
                    <span className="text-2xl font-bold">
                      {webVitals.fcp ? `${webVitals.fcp}ms` : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      webVitals.fcp
                        ? Math.min((webVitals.fcp / 3000) * 100, 100)
                        : 0
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {/* TTFB */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Time to First Byte
                  </CardTitle>
                  <CardDescription>Server response</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        getWebVitalStatus("ttfb", webVitals.ttfb)
                      )}`}
                    />
                    <span className="text-2xl font-bold">
                      {webVitals.ttfb ? `${webVitals.ttfb}ms` : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      webVitals.ttfb
                        ? Math.min((webVitals.ttfb / 1800) * 100, 100)
                        : 0
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Render Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Average render time:</span>
                      <Badge>{avgComponentRenderTime.toFixed(2)}ms</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Components tracked:</span>
                      <Badge>{componentMetrics.length}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Renders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {componentMetrics
                      .slice(-5)
                      .reverse()
                      .map((metric, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="font-mono">{metric.id}</span>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                metric.phase === "mount"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {metric.phase}
                            </Badge>
                            <span>{metric.actualDuration.toFixed(2)}ms</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Backend Tab */}
          <TabsContent value="backend" className="space-y-4">
            {backendMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <HardDrive className="h-5 w-5" />
                      <span>Memory Usage</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>RSS:</span>
                        <Badge>
                          {backendMetrics.memory_rss?.toFixed(1)} MB
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>VMS:</span>
                        <Badge>
                          {backendMetrics.memory_vms?.toFixed(1)} MB
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Cpu className="h-5 w-5" />
                      <span>CPU Usage</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>CPU:</span>
                        <Badge>{backendMetrics.cpu_percent?.toFixed(1)}%</Badge>
                      </div>
                      <Progress
                        value={backendMetrics.cpu_percent || 0}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>System Info</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Threads:</span>
                        <Badge>{backendMetrics.thread_count}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>File descriptors:</span>
                        <Badge>{backendMetrics.fd_count}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <div className="text-center text-muted-foreground">
                    {isConnected
                      ? "Waiting for backend metrics..."
                      : "Connect to backend for real-time metrics"}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Performance Score</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">92</div>
                    <div className="text-sm text-muted-foreground">
                      Overall Performance
                    </div>
                    <Progress value={92} className="mt-4" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monitoring:</span>
                      <Badge variant={isMonitoring ? "default" : "secondary"}>
                        {isMonitoring ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Backend connection:</span>
                      <Badge variant={isConnected ? "default" : "destructive"}>
                        {isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active alerts:</span>
                      <Badge
                        variant={
                          performanceAlerts.length > 0
                            ? "destructive"
                            : "default"
                        }
                      >
                        {performanceAlerts.length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Profiler>
  );
};

export default PerformanceMonitor;
