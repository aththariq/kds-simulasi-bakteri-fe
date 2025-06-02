/**
 * ResistanceComparison Component
 *
 * Provides comprehensive dataset comparison capabilities for resistance analysis,
 * including side-by-side views, statistical comparisons, and synchronized brushing.
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Brush,
} from "recharts";
import { Plus, GitCompare, Download, Settings } from "lucide-react";
import {
  DatasetComparison,
  ComparisonMetrics,
  ComparisonViewMode,
} from "@/types/analysis";
import { ResistanceDataPoint } from "@/lib/resistance-analysis";
import { useAnalysisStore } from "@/lib/analysis-state";

// ============================
// Component Props
// ============================

export interface ResistanceComparisonProps {
  datasets: ResistanceDataPoint[][];
  datasetNames?: string[];
  onComparisonChange?: (comparison: DatasetComparison) => void;
  onExport?: (format: "json" | "csv" | "png") => void;
  className?: string;
}

// ============================
// Comparison Chart Components
// ============================

interface ComparisonChartProps {
  datasets: ResistanceDataPoint[][];
  datasetNames: string[];
  viewMode: ComparisonViewMode;
  syncBrush: boolean;
  brushDomain?: [number, number];
  onBrushChange?: (domain: [number, number] | null) => void;
  showStatistics: boolean;
  selectedMetric: string;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  datasets,
  datasetNames,
  viewMode,
  syncBrush,
  brushDomain,
  onBrushChange,
  showStatistics,
  selectedMetric,
}) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    if (datasets.length === 0) return [];

    const maxLength = Math.max(...datasets.map(d => d.length));
    const data: Array<Record<string, unknown>> = [];

    for (let i = 0; i < maxLength; i++) {
      const point: Record<string, unknown> = { index: i };

      datasets.forEach((dataset, idx) => {
        if (dataset[i]) {
          const value =
            selectedMetric === "resistance_frequency"
              ? dataset[i].resistanceFrequency
              : selectedMetric === "population_size"
              ? dataset[i].totalPopulation
              : selectedMetric === "generation"
              ? dataset[i].generation
              : dataset[i].resistanceFrequency;

          point[`dataset_${idx}`] = value;
          point[`dataset_${idx}_name`] =
            datasetNames[idx] || `Dataset ${idx + 1}`;
        }
      });

      data.push(point);
    }

    return data;
  }, [datasets, datasetNames, selectedMetric]);

  // Color scheme for datasets
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"];

  if (viewMode === "side-by-side") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((dataset, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {datasetNames[idx] || `Dataset ${idx + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={dataset.map((d, i) => ({
                    index: i,
                    value:
                      selectedMetric === "resistance_frequency"
                        ? d.resistanceFrequency
                        : selectedMetric === "population_size"
                        ? d.totalPopulation
                        : d.generation,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" />
                  <YAxis />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                  {syncBrush && (
                    <Brush
                      dataKey="index"
                      height={30}
                      stroke={colors[idx % colors.length]}
                      onChange={domain =>
                        onBrushChange?.(domain as [number, number])
                      }
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Overlay view
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Dataset Comparison - Overlay View
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Legend />
            {datasets.map((_, idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={`dataset_${idx}`}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                name={datasetNames[idx] || `Dataset ${idx + 1}`}
                dot={false}
              />
            ))}
            {syncBrush && (
              <Brush
                dataKey="index"
                height={30}
                stroke="#8884d8"
                onChange={domain => onBrushChange?.(domain as [number, number])}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// ============================
// Statistical Comparison Component
// ============================

interface StatisticalComparisonProps {
  datasets: ResistanceDataPoint[][];
  datasetNames: string[];
  selectedMetric: string;
  comparisonMetrics: ComparisonMetrics | null;
}

const StatisticalComparison: React.FC<StatisticalComparisonProps> = ({
  datasets,
  datasetNames,
  selectedMetric,
  comparisonMetrics,
}) => {
  const statisticalData = useMemo(() => {
    return datasets.map((dataset, idx) => {
      const values = dataset.map(d =>
        selectedMetric === "resistance_frequency"
          ? d.resistanceFrequency
          : selectedMetric === "population_size"
          ? d.totalPopulation
          : d.generation
      );

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...values);
      const max = Math.max(...values);

      return {
        name: datasetNames[idx] || `Dataset ${idx + 1}`,
        mean: mean.toFixed(3),
        stdDev: stdDev.toFixed(3),
        min: min.toFixed(3),
        max: max.toFixed(3),
        count: values.length,
      };
    });
  }, [datasets, datasetNames, selectedMetric]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statisticalData.map((stats, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{stats.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Mean:</span>
                <span className="text-sm font-medium">{stats.mean}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Std Dev:</span>
                <span className="text-sm font-medium">{stats.stdDev}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Range:</span>
                <span className="text-sm font-medium">
                  {stats.min} - {stats.max}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Count:</span>
                <span className="text-sm font-medium">{stats.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistical Tests */}
      {comparisonMetrics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statistical Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                T-Test p-value:
              </span>
              <span className="text-sm font-medium">
                {comparisonMetrics.tTest?.pValue?.toFixed(6) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Correlation:
              </span>
              <span className="text-sm font-medium">
                {comparisonMetrics.correlation?.toFixed(3) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Effect Size:
              </span>
              <span className="text-sm font-medium">
                {comparisonMetrics.effectSize?.toFixed(3) || "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================
// Main Component
// ============================

export const ResistanceComparison: React.FC<ResistanceComparisonProps> = ({
  datasets,
  datasetNames = [],
  onComparisonChange,
  onExport,
  className,
}) => {
  // State
  const [viewMode, setViewMode] = useState<ComparisonViewMode>("overlay");
  const [selectedMetric, setSelectedMetric] = useState("resistance_frequency");
  const [syncBrush, setSyncBrush] = useState(true);
  const [brushDomain, setBrushDomain] = useState<[number, number] | undefined>(
    undefined
  );
  const [showStatistics, setShowStatistics] = useState(true);
  const [activeTab, setActiveTab] = useState("charts");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Store
  const { comparisons, addComparison } = useAnalysisStore();

  // Handlers
  const handleBrushChange = useCallback((domain: [number, number] | null) => {
    setBrushDomain(domain || undefined);
  }, []);

  const handleAddComparison = useCallback(() => {
    // Save the primary dataset (first dataset) as a comparison in the store
    const primaryDataset = datasets[0] || [];
    const comparisonName = `Comparison ${comparisons.length + 1}`;

    addComparison(primaryDataset, comparisonName);

    // Create a DatasetComparison object for the external callback
    const newComparison: DatasetComparison = {
      id: `comparison_${Date.now()}`,
      name: comparisonName,
      datasets: datasets.map((_, idx) => ({
        id: `dataset_${idx}`,
        name: datasetNames[idx] || `Dataset ${idx + 1}`,
        data: datasets[idx],
      })),
      viewMode,
      selectedMetric,
      syncBrush,
      showStatistics,
      createdAt: new Date().toISOString(),
    };

    onComparisonChange?.(newComparison);
  }, [
    datasets,
    datasetNames,
    viewMode,
    selectedMetric,
    syncBrush,
    showStatistics,
    comparisons.length,
    addComparison,
    onComparisonChange,
  ]);

  const handleExport = useCallback(
    (format: "json" | "csv" | "png") => {
      onExport?.(format);
    },
    [onExport]
  );

  // Compute comparison metrics
  const comparisonMetrics = useMemo(() => {
    if (datasets.length < 2) return null;

    // Simple local comparison function
    const dataset1 = datasets[0];
    const dataset2 = datasets[1];

    if (
      !dataset1 ||
      !dataset2 ||
      dataset1.length === 0 ||
      dataset2.length === 0
    )
      return null;

    // Extract values for the selected metric
    const getMetricValue = (data: ResistanceDataPoint) => {
      switch (selectedMetric) {
        case "resistance_frequency":
          return data.resistanceFrequency;
        case "population_size":
          return data.totalPopulation;
        case "generation":
          return data.generation;
        default:
          return data.resistanceFrequency;
      }
    };

    const values1 = dataset1.map(getMetricValue);
    const values2 = dataset2.map(getMetricValue);

    // Calculate basic statistics
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
    const difference = mean1 - mean2;

    // Calculate correlation if same length
    let correlation = 0;
    if (values1.length === values2.length) {
      const n = values1.length;
      const meanX = mean1;
      const meanY = mean2;

      let numerator = 0;
      let sumXSquared = 0;
      let sumYSquared = 0;

      for (let i = 0; i < n; i++) {
        const deltaX = values1[i] - meanX;
        const deltaY = values2[i] - meanY;
        numerator += deltaX * deltaY;
        sumXSquared += deltaX * deltaX;
        sumYSquared += deltaY * deltaY;
      }

      const denominator = Math.sqrt(sumXSquared * sumYSquared);
      correlation = denominator === 0 ? 0 : numerator / denominator;
    }

    // Calculate variances for effect size
    const variance1 =
      values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) /
      (values1.length - 1);
    const variance2 =
      values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) /
      (values2.length - 1);
    const pooledStdDev = Math.sqrt((variance1 + variance2) / 2);
    const effectSize =
      pooledStdDev > 0 ? Math.abs(difference) / pooledStdDev : 0;

    return {
      correlation,
      meanDifference: difference,
      effectSize: effectSize,
      tTest: {
        name: "Two-sample t-test",
        statistic: 0, // Would need proper t-test implementation
        pValue: 0.5, // Placeholder
        significant: false,
      },
    };
  }, [datasets, selectedMetric]);

  if (datasets.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">
            No datasets available for comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Dataset Comparison
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddComparison}>
                <Plus className="h-4 w-4" />
                Save Comparison
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Settings Panel */}
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <CollapsibleContent>
            <CardContent className="border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>View Mode</Label>
                  <Select
                    value={viewMode}
                    onValueChange={(value: ComparisonViewMode) =>
                      setViewMode(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overlay">Overlay</SelectItem>
                      <SelectItem value="side-by-side">Side by Side</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select
                    value={selectedMetric}
                    onValueChange={setSelectedMetric}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resistance_frequency">
                        Resistance Frequency
                      </SelectItem>
                      <SelectItem value="population_size">
                        Population Size
                      </SelectItem>
                      <SelectItem value="generation">Generation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sync-brush"
                      checked={syncBrush}
                      onCheckedChange={setSyncBrush}
                    />
                    <Label htmlFor="sync-brush">Sync Brushing</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-stats"
                      checked={showStatistics}
                      onCheckedChange={setShowStatistics}
                    />
                    <Label htmlFor="show-stats">Show Statistics</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Dataset Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((dataset, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    {datasetNames[idx] || `Dataset ${idx + 1}`}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {dataset.length} data points
                  </p>
                </div>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: `${
                      ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"][
                        idx % 5
                      ]
                    }20`,
                  }}
                >
                  Dataset {idx + 1}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <ComparisonChart
            datasets={datasets}
            datasetNames={datasetNames}
            viewMode={viewMode}
            syncBrush={syncBrush}
            brushDomain={brushDomain}
            onBrushChange={handleBrushChange}
            showStatistics={showStatistics}
            selectedMetric={selectedMetric}
          />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <StatisticalComparison
            datasets={datasets}
            datasetNames={datasetNames}
            selectedMetric={selectedMetric}
            comparisonMetrics={comparisonMetrics}
          />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleExport("json")}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("png")}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export PNG
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResistanceComparison;
