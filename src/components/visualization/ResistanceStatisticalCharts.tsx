"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Download,
  RefreshCw,
  BarChart3,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { ResistanceDataPoint } from "@/lib/resistance-analysis";
import { BaseChart, ChartConfig } from "./BaseChart";

// ============================
// Types and Interfaces
// ============================

export interface HistogramBin {
  range: string;
  count: number;
  frequency: number;
  cumulative: number;
  minValue: number;
  maxValue: number;
}

export interface BoxPlotData {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  mean: number;
  stdDev: number;
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface ComparativeDataset {
  id: string;
  name: string;
  data: ResistanceDataPoint[];
  color: string;
  visible: boolean;
}

export interface SynchronizedChartState {
  selectedGeneration: number | null;
  brushRange: [number, number] | null;
  zoomLevel: number;
  highlightedSeries: string | null;
}

export interface ResistanceStatisticalChartsProps {
  data: ResistanceDataPoint[];
  comparativeDatasets?: ComparativeDataset[];
  config?: ChartConfig;
  className?: string;
  onExport?: (chartType: string, data: unknown) => void;
}

// ============================
// Statistical Calculation Utilities
// ============================

const calculateHistogram = (
  values: number[],
  binCount: number = 20
): HistogramBin[] => {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / binCount;

  const bins: HistogramBin[] = [];
  let cumulative = 0;

  for (let i = 0; i < binCount; i++) {
    const minValue = min + i * binWidth;
    const maxValue = min + (i + 1) * binWidth;
    const count = values.filter(
      v => v >= minValue && (i === binCount - 1 ? v <= maxValue : v < maxValue)
    ).length;
    const frequency = count / values.length;
    cumulative += frequency;

    bins.push({
      range: `${minValue.toFixed(3)}-${maxValue.toFixed(3)}`,
      count,
      frequency,
      cumulative,
      minValue,
      maxValue,
    });
  }

  return bins;
};

const calculateBoxPlotData = (
  data: ResistanceDataPoint[],
  groupBy: "generation" | "gene" = "generation"
): BoxPlotData[] => {
  if (data.length === 0) return [];

  const groups = new Map<string, number[]>();

  data.forEach(point => {
    if (groupBy === "generation") {
      const genGroup = Math.floor(point.generation / 10) * 10; // Group by decades
      const key = `Gen ${genGroup}-${genGroup + 9}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(point.resistanceFrequency);
    } else {
      Object.entries(point.geneFrequencies).forEach(([gene, freq]) => {
        if (!groups.has(gene)) groups.set(gene, []);
        groups.get(gene)!.push(freq);
      });
    }
  });

  return Array.from(groups.entries()).map(([category, values]) => {
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    const outliers = sorted.filter(v => v < lowerFence || v > upperFence);
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      category,
      min: Math.max(sorted[0], lowerFence),
      q1,
      median,
      q3,
      max: Math.min(sorted[n - 1], upperFence),
      outliers,
      mean,
      stdDev,
    };
  });
};

const calculateStatisticalSummary = (values: number[]): StatisticalSummary => {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      variance: 0,
      stdDev: 0,
      skewness: 0,
      kurtosis: 0,
      min: 0,
      max: 0,
      range: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
    };
  }

  const sorted = values.sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const median = sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];

  // Calculate mode (most frequent value)
  const frequency = new Map<number, number>();
  values.forEach(v => frequency.set(v, (frequency.get(v) || 0) + 1));
  const mode = Array.from(frequency.entries()).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Calculate skewness and kurtosis
  const skewness =
    values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n;
  const kurtosis =
    values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n -
    3;

  return {
    mean,
    median,
    mode,
    variance,
    stdDev,
    skewness,
    kurtosis,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    q1,
    q3,
    iqr: q3 - q1,
  };
};

// ============================
// Chart Components
// ============================

const DistributionHistogram: React.FC<{
  data: ResistanceDataPoint[];
  binCount: number;
  showCumulative: boolean;
  metric: "resistanceFrequency" | "totalPopulation" | "resistantCount";
}> = ({ data, binCount, showCumulative, metric }) => {
  const histogramData = useMemo(() => {
    const values = data.map(d => d[metric]);
    return calculateHistogram(values, binCount);
  }, [data, binCount, metric]);

  const maxCount = Math.max(...histogramData.map(d => d.count));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={histogramData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="range"
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={10}
        />
        <YAxis yAxisId="count" orientation="left" />
        {showCumulative && (
          <YAxis yAxisId="cumulative" orientation="right" domain={[0, 1]} />
        )}
        <Tooltip
          formatter={(value: number, name: string) => [
            name === "count" ? value : `${(value * 100).toFixed(1)}%`,
            name === "count"
              ? "Frequency"
              : name === "frequency"
              ? "Relative Frequency"
              : "Cumulative",
          ]}
        />
        <Legend />

        <Bar
          yAxisId="count"
          dataKey="count"
          fill="#3b82f6"
          name="Frequency"
          opacity={0.7}
        />

        {showCumulative && (
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulative"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Cumulative"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const StatisticalBoxPlot: React.FC<{
  data: ResistanceDataPoint[];
  groupBy: "generation" | "gene";
}> = ({ data, groupBy }) => {
  const boxPlotData = useMemo(
    () => calculateBoxPlotData(data, groupBy),
    [data, groupBy]
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={boxPlotData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="category"
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={10}
        />
        <YAxis />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${(value * 100).toFixed(2)}%`,
            name.charAt(0).toUpperCase() + name.slice(1),
          ]}
        />

        {/* Box plot elements using bars and lines */}
        <Bar dataKey="q1" fill="transparent" stroke="#3b82f6" strokeWidth={2} />
        <Bar
          dataKey="q3"
          fill="rgba(59, 130, 246, 0.3)"
          stroke="#3b82f6"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="median"
          stroke="#ef4444"
          strokeWidth={3}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="mean"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const ComparativeAnalysisView: React.FC<{
  datasets: ComparativeDataset[];
  metric: string;
  viewType: "overlay" | "sideBySide" | "difference";
}> = ({ datasets, metric, viewType }) => {
  const visibleDatasets = datasets.filter(d => d.visible);

  if (viewType === "overlay") {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="generation" />
          <YAxis />
          <Tooltip />
          <Legend />

          {visibleDatasets.map(dataset => (
            <Line
              key={dataset.id}
              data={dataset.data}
              type="monotone"
              dataKey={metric}
              stroke={dataset.color}
              strokeWidth={2}
              dot={false}
              name={dataset.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (viewType === "difference" && visibleDatasets.length >= 2) {
    const baseDataset = visibleDatasets[0];
    const compareDataset = visibleDatasets[1];

    const differenceData = baseDataset.data.map((point, index) => {
      const comparePoint = compareDataset.data[index];
      return {
        generation: point.generation,
        difference: comparePoint
          ? (comparePoint as any)[metric] - (point as any)[metric]
          : 0,
      };
    });

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={differenceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="generation" />
          <YAxis />
          <Tooltip />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
          <Line
            type="monotone"
            dataKey="difference"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name={`${compareDataset.name} - ${baseDataset.name}`}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Side by side view
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {visibleDatasets.map(dataset => (
        <div key={dataset.id} className="h-64">
          <h4 className="text-sm font-medium mb-2">{dataset.name}</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataset.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="generation" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={dataset.color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
};

const SynchronizedCharts: React.FC<{
  data: ResistanceDataPoint[];
  syncState: SynchronizedChartState;
  onSyncStateChange: (state: Partial<SynchronizedChartState>) => void;
}> = ({ data, syncState, onSyncStateChange }) => {
  const handleBrushChange = useCallback(
    (range: [number, number] | null) => {
      onSyncStateChange({ brushRange: range });
    },
    [onSyncStateChange]
  );

  const filteredData = useMemo(() => {
    if (!syncState.brushRange) return data;
    const [start, end] = syncState.brushRange;
    return data.filter(d => d.generation >= start && d.generation <= end);
  }, [data, syncState.brushRange]);

  return (
    <div className="space-y-4">
      {/* Main time series chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="generation" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="resistanceFrequency"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Resistance Frequency"
            />
            <Line
              type="monotone"
              dataKey="totalPopulation"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Total Population"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Population distribution chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="generation" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="resistantCount" fill="#ef4444" name="Resistant" />
            <Bar dataKey="sensitiveCount" fill="#10b981" name="Sensitive" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================
// Main Component
// ============================

export const ResistanceStatisticalCharts: React.FC<
  ResistanceStatisticalChartsProps
> = ({
  data,
  comparativeDatasets = [],
  config = {},
  className = "",
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState("histogram");
  const [binCount, setBinCount] = useState(20);
  const [showCumulative, setShowCumulative] = useState(false);
  const [histogramMetric, setHistogramMetric] = useState<
    "resistanceFrequency" | "totalPopulation" | "resistantCount"
  >("resistanceFrequency");
  const [boxPlotGroupBy, setBoxPlotGroupBy] = useState<"generation" | "gene">(
    "generation"
  );
  const [comparativeMetric, setComparativeMetric] = useState(
    "resistanceFrequency"
  );
  const [comparativeViewType, setComparativeViewType] = useState<
    "overlay" | "sideBySide" | "difference"
  >("overlay");
  const [syncState, setSyncState] = useState<SynchronizedChartState>({
    selectedGeneration: null,
    brushRange: null,
    zoomLevel: 1,
    highlightedSeries: null,
  });

  const statisticalSummary = useMemo(() => {
    const values = data.map(d => d.resistanceFrequency);
    return calculateStatisticalSummary(values);
  }, [data]);

  const handleExport = useCallback(
    (chartType: string) => {
      const exportData = {
        chartType,
        data,
        config: { binCount, showCumulative, histogramMetric, boxPlotGroupBy },
        summary: statisticalSummary,
      };
      onExport?.(chartType, exportData);
    },
    [
      data,
      binCount,
      showCumulative,
      histogramMetric,
      boxPlotGroupBy,
      statisticalSummary,
      onExport,
    ]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistical Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {(statisticalSummary.mean * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Mean Resistance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {(statisticalSummary.median * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Median Resistance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {(statisticalSummary.stdDev * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Std Deviation</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {statisticalSummary.skewness.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Skewness</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart Tabs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Statistical Analysis</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(activeTab)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="histogram">
                <BarChart3 className="h-4 w-4 mr-2" />
                Histogram
              </TabsTrigger>
              <TabsTrigger value="boxplot">
                <TrendingUp className="h-4 w-4 mr-2" />
                Box Plot
              </TabsTrigger>
              <TabsTrigger value="comparative">
                <PieChart className="h-4 w-4 mr-2" />
                Comparative
              </TabsTrigger>
              <TabsTrigger value="synchronized">
                <RefreshCw className="h-4 w-4 mr-2" />
                Synchronized
              </TabsTrigger>
            </TabsList>

            <TabsContent value="histogram" className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="bins">Bins:</Label>
                  <Slider
                    id="bins"
                    min={5}
                    max={50}
                    step={1}
                    value={[binCount]}
                    onValueChange={value => setBinCount(value[0])}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600">{binCount}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="metric">Metric:</Label>
                  <Select
                    value={histogramMetric}
                    onValueChange={(value: any) => setHistogramMetric(value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resistanceFrequency">
                        Resistance Frequency
                      </SelectItem>
                      <SelectItem value="totalPopulation">
                        Total Population
                      </SelectItem>
                      <SelectItem value="resistantCount">
                        Resistant Count
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="cumulative"
                    checked={showCumulative}
                    onCheckedChange={setShowCumulative}
                  />
                  <Label htmlFor="cumulative">Show Cumulative</Label>
                </div>
              </div>

              <DistributionHistogram
                data={data}
                binCount={binCount}
                showCumulative={showCumulative}
                metric={histogramMetric}
              />
            </TabsContent>

            <TabsContent value="boxplot" className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label>Group By:</Label>
                <Select
                  value={boxPlotGroupBy}
                  onValueChange={(value: any) => setBoxPlotGroupBy(value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generation">Generation</SelectItem>
                    <SelectItem value="gene">Gene</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <StatisticalBoxPlot data={data} groupBy={boxPlotGroupBy} />
            </TabsContent>

            <TabsContent value="comparative" className="space-y-4">
              {comparativeDatasets.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center space-x-2">
                      <Label>Metric:</Label>
                      <Select
                        value={comparativeMetric}
                        onValueChange={setComparativeMetric}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resistanceFrequency">
                            Resistance Frequency
                          </SelectItem>
                          <SelectItem value="totalPopulation">
                            Total Population
                          </SelectItem>
                          <SelectItem value="resistantCount">
                            Resistant Count
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label>View:</Label>
                      <Select
                        value={comparativeViewType}
                        onValueChange={(value: any) =>
                          setComparativeViewType(value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overlay">Overlay</SelectItem>
                          <SelectItem value="sideBySide">
                            Side by Side
                          </SelectItem>
                          <SelectItem value="difference">Difference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ComparativeAnalysisView
                    datasets={comparativeDatasets}
                    metric={comparativeMetric}
                    viewType={comparativeViewType}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No comparative datasets available
                </div>
              )}
            </TabsContent>

            <TabsContent value="synchronized" className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Synchronized charts allow you to explore multiple metrics
                simultaneously with linked interactions.
              </div>

              <SynchronizedCharts
                data={data}
                syncState={syncState}
                onSyncStateChange={newState =>
                  setSyncState(prev => ({ ...prev, ...newState }))
                }
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResistanceStatisticalCharts;
