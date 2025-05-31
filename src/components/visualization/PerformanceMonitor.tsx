"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Clock,
  Database,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  Cpu,
  HardDrive,
  Timer,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { PerformanceMetrics, PerformanceConfig } from "./ChartPerformance";

// Performance status levels
type PerformanceStatus = "excellent" | "good" | "fair" | "poor";

// Performance monitor props
export interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  config?: PerformanceConfig;
  showDetailedMetrics?: boolean;
  className?: string;
  onToggleVisibility?: () => void;
  isVisible?: boolean;
}

// Performance thresholds for status determination
const PERFORMANCE_THRESHOLDS = {
  dataProcessingTime: { excellent: 10, good: 50, fair: 150 }, // ms
  renderTime: { excellent: 16, good: 33, fair: 100 }, // ms (60fps, 30fps, 10fps)
  memoryUsage: { excellent: 50, good: 100, fair: 200 }, // MB
  samplingRatio: { excellent: 0.8, good: 0.5, fair: 0.2 }, // ratio
};

// Get performance status based on metric value
const getPerformanceStatus = (
  metric: keyof typeof PERFORMANCE_THRESHOLDS,
  value: number
): PerformanceStatus => {
  const thresholds = PERFORMANCE_THRESHOLDS[metric];

  if (metric === "samplingRatio") {
    // Higher is better for sampling ratio
    if (value >= thresholds.excellent) return "excellent";
    if (value >= thresholds.good) return "good";
    if (value >= thresholds.fair) return "fair";
    return "poor";
  } else {
    // Lower is better for time and memory metrics
    if (value <= thresholds.excellent) return "excellent";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.fair) return "fair";
    return "poor";
  }
};

// Get status color and icon
const getStatusDisplay = (status: PerformanceStatus) => {
  switch (status) {
    case "excellent":
      return {
        color: "bg-green-500",
        textColor: "text-green-700",
        bgColor: "bg-green-50",
        icon: CheckCircle,
        label: "Excellent",
      };
    case "good":
      return {
        color: "bg-blue-500",
        textColor: "text-blue-700",
        bgColor: "bg-blue-50",
        icon: CheckCircle,
        label: "Good",
      };
    case "fair":
      return {
        color: "bg-yellow-500",
        textColor: "text-yellow-700",
        bgColor: "bg-yellow-50",
        icon: Clock,
        label: "Fair",
      };
    case "poor":
      return {
        color: "bg-red-500",
        textColor: "text-red-700",
        bgColor: "bg-red-50",
        icon: AlertTriangle,
        label: "Poor",
      };
  }
};

// Format metric values
const formatMetric = (value: number, type: string): string => {
  switch (type) {
    case "time":
      return `${value.toFixed(1)}ms`;
    case "memory":
      return `${value.toFixed(1)}MB`;
    case "count":
      return value.toLocaleString();
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "timestamp":
      return new Date(value).toLocaleTimeString();
    default:
      return value.toFixed(2);
  }
};

// Performance metric row component
const MetricRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  status?: PerformanceStatus;
  description?: string;
}> = ({ icon: Icon, label, value, status, description }) => {
  const statusDisplay = status ? getStatusDisplay(status) : null;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs text-gray-500" title={description}>
            ⓘ
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono">{value}</span>
        {statusDisplay && (
          <Badge
            variant="outline"
            className={`text-xs ${statusDisplay.textColor} ${statusDisplay.bgColor} border-current`}
          >
            <statusDisplay.icon className="h-3 w-3 mr-1" />
            {statusDisplay.label}
          </Badge>
        )}
      </div>
    </div>
  );
};

// Overall performance score calculation
const calculateOverallScore = (
  metrics: PerformanceMetrics
): {
  score: number;
  status: PerformanceStatus;
  recommendations: string[];
} => {
  const scores = {
    dataProcessing: getPerformanceStatus(
      "dataProcessingTime",
      metrics.dataProcessingTime
    ),
    render: getPerformanceStatus("renderTime", metrics.renderTime),
    memory: getPerformanceStatus("memoryUsage", metrics.memoryUsage),
    sampling: getPerformanceStatus("samplingRatio", metrics.samplingRatio),
  };

  const statusToScore = { excellent: 4, good: 3, fair: 2, poor: 1 };
  const totalScore = Object.values(scores).reduce(
    (sum, status) => sum + statusToScore[status],
    0
  );
  const averageScore = totalScore / Object.keys(scores).length;

  let overallStatus: PerformanceStatus;
  if (averageScore >= 3.5) overallStatus = "excellent";
  else if (averageScore >= 2.5) overallStatus = "good";
  else if (averageScore >= 1.5) overallStatus = "fair";
  else overallStatus = "poor";

  const recommendations: string[] = [];

  if (scores.dataProcessing === "poor") {
    recommendations.push("Enable data sampling to reduce processing time");
  }
  if (scores.render === "poor") {
    recommendations.push(
      "Consider reducing chart complexity or enabling virtualization"
    );
  }
  if (scores.memory === "poor") {
    recommendations.push("Enable progressive loading for large datasets");
  }
  if (scores.sampling === "poor") {
    recommendations.push(
      "Increase sampling rate for better data representation"
    );
  }

  return { score: averageScore, status: overallStatus, recommendations };
};

// Compact performance monitor
const CompactMonitor: React.FC<{
  metrics: PerformanceMetrics;
  onToggleVisibility: () => void;
}> = ({ metrics, onToggleVisibility }) => {
  const { status } = calculateOverallScore(metrics);
  const statusDisplay = getStatusDisplay(status);

  return (
    <div
      className={`p-2 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.textColor}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-medium">Performance</span>
          <Badge variant="outline" className="text-xs">
            {statusDisplay.label}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleVisibility}
          className="h-6 w-6 p-0"
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// Main performance monitor component
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  config = {},
  showDetailedMetrics = true,
  className = "",
  onToggleVisibility,
  isVisible = true,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { score, status, recommendations } = calculateOverallScore(metrics);
  const statusDisplay = getStatusDisplay(status);

  // Don't show monitor if visibility is controlled and set to false
  if (onToggleVisibility && !isVisible) {
    return (
      <CompactMonitor
        metrics={metrics}
        onToggleVisibility={onToggleVisibility}
      />
    );
  }

  // Collapsed view
  if (isCollapsed) {
    return (
      <Card className={`performance-monitor-collapsed ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Performance</span>
              <Badge
                variant="outline"
                className={`text-xs ${statusDisplay.textColor} ${statusDisplay.bgColor}`}
              >
                {statusDisplay.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatMetric(metrics.visibleDataPoints, "count")} pts
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsCollapsed(false)}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
              {onToggleVisibility && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onToggleVisibility}
                  className="h-6 w-6 p-0"
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`performance-monitor ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${statusDisplay.textColor} ${statusDisplay.bgColor}`}
            >
              <statusDisplay.icon className="h-3 w-3 mr-1" />
              {statusDisplay.label}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed(true)}
              className="h-6 w-6 p-0"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Overall Performance Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Overall Score</span>
            <span>{score.toFixed(1)}/4.0</span>
          </div>
          <Progress value={(score / 4) * 100} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core Metrics */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Core Metrics
          </h4>

          <MetricRow
            icon={Cpu}
            label="Data Processing"
            value={formatMetric(metrics.dataProcessingTime, "time")}
            status={getPerformanceStatus(
              "dataProcessingTime",
              metrics.dataProcessingTime
            )}
            description="Time to process and transform data"
          />

          <MetricRow
            icon={Zap}
            label="Render Time"
            value={formatMetric(metrics.renderTime, "time")}
            status={getPerformanceStatus("renderTime", metrics.renderTime)}
            description="Time to render chart visualization"
          />

          <MetricRow
            icon={HardDrive}
            label="Memory Usage"
            value={formatMetric(metrics.memoryUsage, "memory")}
            status={getPerformanceStatus("memoryUsage", metrics.memoryUsage)}
            description="Current JavaScript heap memory usage"
          />
        </div>

        <Separator />

        {/* Data Metrics */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Data Metrics
          </h4>

          <MetricRow
            icon={Database}
            label="Total Data Points"
            value={formatMetric(metrics.totalDataPoints, "count")}
            description="Total number of data points in dataset"
          />

          <MetricRow
            icon={BarChart3}
            label="Visible Points"
            value={formatMetric(metrics.visibleDataPoints, "count")}
            description="Number of data points currently rendered"
          />

          <MetricRow
            icon={TrendingUp}
            label="Sampling Ratio"
            value={formatMetric(metrics.samplingRatio, "percentage")}
            status={getPerformanceStatus(
              "samplingRatio",
              metrics.samplingRatio
            )}
            description="Percentage of original data being displayed"
          />
        </div>

        {showDetailedMetrics && (
          <>
            <Separator />

            {/* Additional Metrics */}
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Additional Info
              </h4>

              <MetricRow
                icon={Timer}
                label="Last Update"
                value={formatMetric(metrics.lastUpdateTime, "timestamp")}
                description="Timestamp of last performance measurement"
              />
            </div>
          </>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Recommendations
              </h4>
              <div className="space-y-1">
                {recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500" />
                    <span>{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Configuration Info */}
        {config && Object.keys(config).length > 0 && showDetailedMetrics && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Configuration
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {config.enableSampling && (
                  <div className="flex justify-between">
                    <span>Sampling:</span>
                    <Badge variant="outline" className="text-xs">
                      {config.samplingStrategy || "adaptive"}
                    </Badge>
                  </div>
                )}
                {config.maxDataPoints && (
                  <div className="flex justify-between">
                    <span>Max Points:</span>
                    <span>{config.maxDataPoints.toLocaleString()}</span>
                  </div>
                )}
                {config.enableProgressiveLoading && (
                  <div className="flex justify-between">
                    <span>Progressive:</span>
                    <Badge variant="outline" className="text-xs">
                      {config.chunkSize || 100}
                    </Badge>
                  </div>
                )}
                {config.enableWindowing && (
                  <div className="flex justify-between">
                    <span>Windowing:</span>
                    <Badge variant="outline" className="text-xs">
                      {config.windowSize || 500}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
