"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Users,
  Clock,
  TrendingUp,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Filter,
} from "lucide-react";
import {
  ErrorMonitoringUtils,
  ErrorReport,
  ErrorAggregation,
  Breadcrumb,
} from "@/lib/error-monitoring";
import { ErrorCategory, ErrorSeverity } from "@/lib/error-handling";
import { toast } from "sonner";

interface ErrorMonitoringDashboardProps {
  className?: string;
}

export function ErrorMonitoringDashboard({
  className,
}: ErrorMonitoringDashboardProps) {
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [errorAggregations, setErrorAggregations] = useState<
    ErrorAggregation[]
  >([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [filterCategory, setFilterCategory] = useState<ErrorCategory | "all">(
    "all"
  );
  const [filterSeverity, setFilterSeverity] = useState<ErrorSeverity | "all">(
    "all"
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load data from monitoring system
  const loadData = () => {
    const monitor = ErrorMonitoringUtils.getInstance();
    if (!monitor) {
      toast.error("Error monitoring system not initialized");
      return;
    }

    setErrorReports(monitor.getErrorReports());
    setErrorAggregations(monitor.getErrorAggregations());
    setBreadcrumbs(monitor.getBreadcrumbs());
  };

  useEffect(() => {
    loadData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Generate report data
  const generateReport = () => {
    const monitor = ErrorMonitoringUtils.getInstance();
    if (!monitor) return null;

    return monitor.generateErrorReport();
  };

  // Filter errors based on selected criteria
  const filteredReports = errorReports.filter(report => {
    const categoryMatch =
      filterCategory === "all" || report.error.category === filterCategory;
    const severityMatch =
      filterSeverity === "all" || report.error.severity === filterSeverity;
    return categoryMatch && severityMatch;
  });

  // Get severity color
  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "destructive";
      case ErrorSeverity.HIGH:
        return "destructive";
      case ErrorSeverity.MEDIUM:
        return "default";
      case ErrorSeverity.LOW:
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <AlertCircle className="h-4 w-4" />;
      case ErrorSeverity.HIGH:
        return <AlertTriangle className="h-4 w-4" />;
      case ErrorSeverity.MEDIUM:
        return <Info className="h-4 w-4" />;
      case ErrorSeverity.LOW:
        return <Bug className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  // Export data
  const exportData = () => {
    const report = generateReport();
    if (!report) return;

    const data = {
      timestamp: Date.now(),
      summary: report.summary,
      topErrors: report.topErrors,
      errorsByCategory: report.errorsByCategory,
      errorsBySeverity: report.errorsBySeverity,
      recentErrors: report.recentErrors,
      allReports: errorReports,
      breadcrumbs: breadcrumbs,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Error report exported successfully");
  };

  // Clear all data
  const clearAllData = () => {
    const monitor = ErrorMonitoringUtils.getInstance();
    if (!monitor) return;

    monitor.clearAllData();
    loadData();
    toast.success("All error monitoring data cleared");
  };

  const report = generateReport();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Error Monitoring Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor and analyze application errors and performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={clearAllData}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Errors
              </CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report.summary.totalErrors}
              </div>
              <p className="text-xs text-muted-foreground">
                {report.summary.uniqueErrors} unique errors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Critical Errors
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {report.summary.criticalErrors}
              </div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Affected Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report.summary.affectedUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Users experiencing errors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Range</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {report.summary.totalErrors > 0
                  ? formatTimeAgo(report.summary.timeRange.start)
                  : "No data"}
              </div>
              <p className="text-xs text-muted-foreground">
                First error recorded
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Reports</TabsTrigger>
          <TabsTrigger value="aggregations">Error Aggregations</TabsTrigger>
          <TabsTrigger value="breadcrumbs">Breadcrumbs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Error Reports Tab */}
        <TabsContent value="errors" className="space-y-4">
          {/* Filters */}
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <label htmlFor="category-filter" className="sr-only">
                Filter by category
              </label>
              <select
                id="category-filter"
                value={filterCategory}
                onChange={e =>
                  setFilterCategory(e.target.value as ErrorCategory | "all")
                }
                className="px-3 py-1 border rounded-md text-sm"
                aria-label="Filter errors by category"
              >
                <option value="all">All Categories</option>
                {Object.values(ErrorCategory).map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="severity-filter" className="sr-only">
                Filter by severity
              </label>
              <select
                id="severity-filter"
                value={filterSeverity}
                onChange={e =>
                  setFilterSeverity(e.target.value as ErrorSeverity | "all")
                }
                className="px-3 py-1 border rounded-md text-sm"
                aria-label="Filter errors by severity"
              >
                <option value="all">All Severities</option>
                {Object.values(ErrorSeverity).map(severity => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error List */}
          <div className="space-y-2">
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Bug className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No errors found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredReports.map(report => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedError(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getSeverityIcon(report.error.severity)}
                          <Badge
                            variant={getSeverityColor(report.error.severity)}
                          >
                            {report.error.severity}
                          </Badge>
                          <Badge variant="outline">
                            {report.error.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeAgo(report.timestamp)}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">
                          {report.error.message}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {report.context.component &&
                            `Component: ${report.context.component}`}
                          {report.context.action &&
                            ` • Action: ${report.context.action}`}
                          {report.userId && ` • User: ${report.userId}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Error Aggregations Tab */}
        <TabsContent value="aggregations" className="space-y-4">
          <div className="space-y-2">
            {errorAggregations.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No aggregated errors found
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              errorAggregations
                .sort((a, b) => b.count - a.count)
                .map(aggregation => (
                  <Card key={aggregation.fingerprint}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getSeverityIcon(aggregation.severity)}
                            <Badge
                              variant={getSeverityColor(aggregation.severity)}
                            >
                              {aggregation.severity}
                            </Badge>
                            <Badge variant="outline">
                              {aggregation.category}
                            </Badge>
                            <Badge variant="secondary">
                              {aggregation.count} occurrences
                            </Badge>
                            <Badge variant="outline">
                              {aggregation.affectedUsers.size} users
                            </Badge>
                          </div>
                          <h4 className="font-medium mb-1">
                            {aggregation.message}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            First seen: {formatTimeAgo(aggregation.firstSeen)} •
                            Last seen: {formatTimeAgo(aggregation.lastSeen)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        {/* Breadcrumbs Tab */}
        <TabsContent value="breadcrumbs" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {breadcrumbs.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        No breadcrumbs found
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                breadcrumbs
                  .slice()
                  .reverse()
                  .map((breadcrumb, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {breadcrumb.category === "error" && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                          {breadcrumb.category === "warning" && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          {breadcrumb.category === "info" && (
                            <Info className="h-4 w-4 text-blue-500" />
                          )}
                          {breadcrumb.category === "user" && (
                            <Users className="h-4 w-4 text-green-500" />
                          )}
                          {breadcrumb.category === "api" && (
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                          )}
                          {breadcrumb.category === "navigation" && (
                            <Clock className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {breadcrumb.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(breadcrumb.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{breadcrumb.message}</p>
                          {breadcrumb.data && (
                            <pre className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(breadcrumb.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Errors by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Errors by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(report.errorsByCategory).map(
                      ([category, count]) => (
                        <div
                          key={category}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm">{category}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Errors by Severity */}
              <Card>
                <CardHeader>
                  <CardTitle>Errors by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(report.errorsBySeverity).map(
                      ([severity, count]) => (
                        <div
                          key={severity}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm">{severity}</span>
                          <Badge
                            variant={getSeverityColor(
                              severity as ErrorSeverity
                            )}
                          >
                            {count}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Errors */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Top Errors</CardTitle>
                  <CardDescription>
                    Most frequently occurring errors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.topErrors.map((error, index) => (
                      <div
                        key={error.fingerprint}
                        className="flex items-center space-x-3 p-3 border rounded-lg"
                      >
                        <div className="flex-shrink-0 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                            <Badge variant="outline">{error.category}</Badge>
                          </div>
                          <p className="text-sm font-medium">{error.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {error.count} occurrences • {error.affectedUsers}{" "}
                            users • Last seen: {formatTimeAgo(error.lastSeen)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Error Details</CardTitle>
                  <CardDescription>
                    {formatTimestamp(selectedError.timestamp)}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedError(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4">
                  {/* Error Info */}
                  <div>
                    <h4 className="font-medium mb-2">Error Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Message:</span>
                        <p>{selectedError.error.message}</p>
                      </div>
                      <div>
                        <span className="font-medium">Category:</span>
                        <p>{selectedError.error.category}</p>
                      </div>
                      <div>
                        <span className="font-medium">Severity:</span>
                        <p>{selectedError.error.severity}</p>
                      </div>
                      <div>
                        <span className="font-medium">Fingerprint:</span>
                        <p className="font-mono text-xs">
                          {selectedError.fingerprint}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Context */}
                  <div>
                    <h4 className="font-medium mb-2">Context</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedError.context, null, 2)}
                    </pre>
                  </div>

                  {/* Stack Trace */}
                  {selectedError.stackTrace && (
                    <div>
                      <h4 className="font-medium mb-2">Stack Trace</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                        {selectedError.stackTrace}
                      </pre>
                    </div>
                  )}

                  {/* Breadcrumbs */}
                  <div>
                    <h4 className="font-medium mb-2">Breadcrumbs</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedError.breadcrumbs.map((breadcrumb, index) => (
                        <div
                          key={index}
                          className="text-xs p-2 bg-muted rounded"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {breadcrumb.message}
                            </span>
                            <span className="text-muted-foreground">
                              {formatTimestamp(breadcrumb.timestamp)}
                            </span>
                          </div>
                          {breadcrumb.data && (
                            <pre className="mt-1 text-muted-foreground">
                              {JSON.stringify(breadcrumb.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
