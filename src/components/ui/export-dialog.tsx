"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Download,
  FileText,
  FileImage,
  Settings,
  Archive,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  PieChart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// Import export services
import {
  DataExportService,
  ExportOptions,
  ExportResult,
  ParameterExportOptions,
  ParameterExportFormat,
  ExportFormat,
} from "@/lib/export-service";
import {
  VisualizationExportService,
  VisualizationExportOptions,
} from "@/lib/visualization-export";
import { PopulationDataPoint } from "@/components/visualization/PopulationChart";
import { Session } from "@/types/session";
import { SimulationParameters } from "@/lib/validation";

// Export item interface for bulk export
export interface ExportItem {
  id: string;
  type: "data" | "visualization" | "parameters" | "session";
  name: string;
  description: string;
  size?: string;
  selected: boolean;
  data?: any;
  options?: any;
}

// Export dialog props
export interface ExportDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Data for exports
  simulationData?: PopulationDataPoint[];
  sessionData?: Session;
  parameters?: SimulationParameters;

  // Available visualizations
  visualizations?: Array<{
    id: string;
    name: string;
    chartRef: React.RefObject<HTMLElement>;
    type: string;
  }>;

  // Callbacks
  onExportComplete?: (result: ExportResult, type: string) => void;
  onError?: (error: string) => void;
}

// Export type configurations
const exportTypeConfigs = {
  data: {
    icon: Database,
    title: "Simulation Data",
    description: "Export raw simulation data and results",
    formats: ["json", "csv", "tsv", "xlsx"] as ExportFormat[],
    defaultFormat: "json" as ExportFormat,
  },
  visualization: {
    icon: PieChart,
    title: "Charts & Visualizations",
    description: "Export charts and graphs as images",
    formats: ["png", "svg", "pdf"],
    defaultFormat: "png",
  },
  parameters: {
    icon: Settings,
    title: "Parameter Sets",
    description: "Export simulation parameter configurations",
    formats: [
      "json",
      "json-simple",
      "csv",
      "template",
    ] as ParameterExportFormat[],
    defaultFormat: "json" as ParameterExportFormat,
  },
  session: {
    icon: Archive,
    title: "Complete Session",
    description: "Export everything: data, parameters, and visualizations",
    formats: ["zip", "json"],
    defaultFormat: "zip",
  },
};

// Export progress state
interface ExportProgress {
  isExporting: boolean;
  progress: number;
  currentItem: string;
  totalItems: number;
  completedItems: number;
  errors: string[];
}

export function ExportDialog({
  trigger,
  open,
  onOpenChange,
  simulationData = [],
  sessionData,
  parameters,
  visualizations = [],
  onExportComplete,
  onError,
}: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState("data");
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    currentItem: "",
    totalItems: 0,
    completedItems: 0,
    errors: [],
  });

  // Export options for each type
  const [dataOptions, setDataOptions] = useState<ExportOptions>({
    format: "json",
    includeMetadata: true,
    includeStatistics: true,
    includeRawData: false,
    filename: `simulation-data-${new Date().toISOString().split("T")[0]}.json`,
  });

  const [visualizationOptions, setVisualizationOptions] =
    useState<VisualizationExportOptions>({
      format: "png",
      quality: {
        width: 1920,
        height: 1080,
        scale: 2,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      },
      filename: `charts-${new Date().toISOString().split("T")[0]}.png`,
    });

  const [parameterOptions, setParameterOptions] =
    useState<ParameterExportOptions>({
      format: "json",
      includeMetadata: true,
      includeDocumentation: true,
      includeValidationRules: true,
      includeExamples: false,
      filename: `parameters-${new Date().toISOString().split("T")[0]}.json`,
    });

  // Bulk export items
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);

  // Initialize export items
  useEffect(() => {
    const items: ExportItem[] = [];

    if (simulationData.length > 0) {
      items.push({
        id: "simulation-data",
        type: "data",
        name: "Simulation Data",
        description: `${simulationData.length} data points`,
        size: `~${Math.round(JSON.stringify(simulationData).length / 1024)}KB`,
        selected: true,
        data: simulationData,
        options: dataOptions,
      });
    }

    if (parameters) {
      items.push({
        id: "parameters",
        type: "parameters",
        name: "Simulation Parameters",
        description: "Current parameter configuration",
        size: `~${Math.round(JSON.stringify(parameters).length / 1024)}KB`,
        selected: true,
        data: parameters,
        options: parameterOptions,
      });
    }

    visualizations.forEach(viz => {
      items.push({
        id: `visualization-${viz.id}`,
        type: "visualization",
        name: viz.name,
        description: `${viz.type} visualization`,
        size: "~2-5MB",
        selected: true,
        data: viz,
        options: visualizationOptions,
      });
    });

    if (sessionData) {
      items.push({
        id: "session",
        type: "session",
        name: "Complete Session",
        description: "All data, parameters, and visualizations",
        size: "~10-50MB",
        selected: false,
        data: sessionData,
      });
    }

    setExportItems(items);
  }, [
    simulationData,
    parameters,
    visualizations,
    sessionData,
    dataOptions,
    parameterOptions,
    visualizationOptions,
  ]);

  // Toggle item selection
  const toggleItemSelection = useCallback((itemId: string) => {
    setExportItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  }, []);

  // Select all items of a type
  const selectAllOfType = useCallback((type: string, selected: boolean) => {
    setExportItems(prev =>
      prev.map(item => (item.type === type ? { ...item, selected } : item))
    );
  }, []);

  // Individual export function
  const performExport = useCallback(
    async (type: string, data: any, options: any): Promise<ExportResult> => {
      switch (type) {
        case "data":
          return await DataExportService.exportSimulationData(data, options);

        case "visualization":
          const vizResult =
            await VisualizationExportService.exportVisualization(
              data.chartRef.current,
              options
            );

          // Convert VisualizationExportResult to ExportResult
          return {
            success: vizResult.success,
            filename: vizResult.filename,
            fileSize: vizResult.fileSize,
            downloadUrl: vizResult.downloadUrl,
            error: vizResult.error,
            metadata: {
              recordsExported: 1, // One visualization exported
              exportTime: vizResult.metadata?.exportTime || 0,
            },
          };

        case "parameters":
          return DataExportService.exportParameterSet(data, options);

        case "session":
          // Comprehensive session export
          const sessionResult = await DataExportService.exportSessionData(
            data,
            { [data.id]: simulationData },
            { format: "json", includeMetadata: true }
          );
          return sessionResult;

        default:
          throw new Error(`Unknown export type: ${type}`);
      }
    },
    [simulationData]
  );

  // Bulk export function
  const handleBulkExport = useCallback(async () => {
    const selectedItems = exportItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to export");
      return;
    }

    setExportProgress({
      isExporting: true,
      progress: 0,
      currentItem: "",
      totalItems: selectedItems.length,
      completedItems: 0,
      errors: [],
    });

    const results: ExportResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];

      setExportProgress(prev => ({
        ...prev,
        currentItem: item.name,
        progress: (i / selectedItems.length) * 100,
      }));

      try {
        const result = await performExport(item.type, item.data, item.options);
        results.push(result);

        if (result.success) {
          toast.success(`Exported ${item.name}`);
        } else {
          errors.push(`${item.name}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`${item.name}: ${errorMessage}`);
        toast.error(`Failed to export ${item.name}`);
      }

      setExportProgress(prev => ({
        ...prev,
        completedItems: i + 1,
        progress: ((i + 1) / selectedItems.length) * 100,
      }));
    }

    setExportProgress(prev => ({
      ...prev,
      isExporting: false,
      currentItem: "",
      errors,
    }));

    // Notify about completion
    const successCount = results.filter(r => r.success).length;
    if (successCount === selectedItems.length) {
      toast.success(`Successfully exported ${successCount} items`);
    } else {
      toast.warning(
        `Exported ${successCount} of ${selectedItems.length} items`
      );
    }

    if (onExportComplete) {
      onExportComplete(
        {
          success: successCount > 0,
          metadata: {
            recordsExported: successCount,
            exportTime: Date.now(),
          },
        },
        "bulk"
      );
    }
  }, [exportItems, performExport, onExportComplete]);

  // Quick export for single type
  const handleQuickExport = useCallback(
    async (type: string) => {
      const config = exportTypeConfigs[type as keyof typeof exportTypeConfigs];
      let data: any;
      let options: any;

      switch (type) {
        case "data":
          data = simulationData;
          options = dataOptions;
          break;
        case "parameters":
          data = parameters;
          options = parameterOptions;
          break;
        case "visualization":
          if (visualizations.length > 0) {
            data = visualizations[0];
            options = visualizationOptions;
          } else {
            toast.error("No visualizations available to export");
            return;
          }
          break;
        case "session":
          data = sessionData;
          options = { format: "json", includeMetadata: true };
          break;
        default:
          toast.error("Unknown export type");
          return;
      }

      if (!data) {
        toast.error(`No ${config.title.toLowerCase()} available to export`);
        return;
      }

      setExportProgress({
        isExporting: true,
        progress: 0,
        currentItem: config.title,
        totalItems: 1,
        completedItems: 0,
        errors: [],
      });

      try {
        const result = await performExport(type, data, options);

        if (result.success) {
          toast.success(`Exported ${config.title.toLowerCase()}`);
          if (onExportComplete) {
            onExportComplete(result, type);
          }
        } else {
          toast.error(result.error || "Export failed");
          if (onError) {
            onError(result.error || "Export failed");
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to export ${config.title.toLowerCase()}`);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setExportProgress({
          isExporting: false,
          progress: 100,
          currentItem: "",
          totalItems: 1,
          completedItems: 1,
          errors: [],
        });
      }
    },
    [
      simulationData,
      parameters,
      visualizations,
      sessionData,
      dataOptions,
      parameterOptions,
      visualizationOptions,
      performExport,
      onExportComplete,
      onError,
    ]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data & Visualizations
          </DialogTitle>
          <DialogDescription>
            Export your simulation data, visualizations, and parameters in
            various formats
          </DialogDescription>
        </DialogHeader>

        {/* Export Progress */}
        {exportProgress.isExporting && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting: {exportProgress.currentItem}</span>
                  <span>{Math.round(exportProgress.progress)}%</span>
                </div>
                <Progress value={exportProgress.progress} className="w-full" />
                <div className="text-xs text-muted-foreground">
                  {exportProgress.completedItems} of {exportProgress.totalItems}{" "}
                  items completed
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Summary */}
        {exportProgress.errors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>Some exports failed:</p>
                <ul className="list-disc list-inside text-xs">
                  {exportProgress.errors.slice(0, 3).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {exportProgress.errors.length > 3 && (
                    <li>... and {exportProgress.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="data" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Data
            </TabsTrigger>
            <TabsTrigger
              value="visualization"
              className="flex items-center gap-1"
            >
              <PieChart className="h-3 w-3" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="parameters" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Parameters
            </TabsTrigger>
            <TabsTrigger value="session" className="flex items-center gap-1">
              <Archive className="h-3 w-3" />
              Session
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Bulk Export
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Data Export Tab */}
            <TabsContent value="data" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Simulation Data Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="data-format">Export Format</Label>
                      <Select
                        value={dataOptions.format}
                        onValueChange={value =>
                          setDataOptions(prev => ({
                            ...prev,
                            format: value as ExportFormat,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {exportTypeConfigs.data.formats.map(format => (
                            <SelectItem key={format} value={format}>
                              {format.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="data-filename">Filename</Label>
                      <Input
                        id="data-filename"
                        value={dataOptions.filename || ""}
                        onChange={e =>
                          setDataOptions(prev => ({
                            ...prev,
                            filename: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Include Options</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-metadata"
                          checked={dataOptions.includeMetadata}
                          onCheckedChange={checked =>
                            setDataOptions(prev => ({
                              ...prev,
                              includeMetadata: checked as boolean,
                            }))
                          }
                        />
                        <Label htmlFor="include-metadata" className="text-sm">
                          Metadata
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-statistics"
                          checked={dataOptions.includeStatistics}
                          onCheckedChange={checked =>
                            setDataOptions(prev => ({
                              ...prev,
                              includeStatistics: checked as boolean,
                            }))
                          }
                        />
                        <Label htmlFor="include-statistics" className="text-sm">
                          Statistics
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-raw-data"
                          checked={dataOptions.includeRawData}
                          onCheckedChange={checked =>
                            setDataOptions(prev => ({
                              ...prev,
                              includeRawData: checked as boolean,
                            }))
                          }
                        />
                        <Label htmlFor="include-raw-data" className="text-sm">
                          Raw Data
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {simulationData.length} data points available
                    </div>
                    <Button
                      onClick={() => handleQuickExport("data")}
                      disabled={
                        exportProgress.isExporting ||
                        simulationData.length === 0
                      }
                    >
                      {exportProgress.isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Visualization Export Tab */}
            <TabsContent value="visualization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Chart & Visualization Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="viz-format">Image Format</Label>
                      <Select
                        value={visualizationOptions.format}
                        onValueChange={value =>
                          setVisualizationOptions(prev => ({
                            ...prev,
                            format: value as any,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {exportTypeConfigs.visualization.formats.map(
                            format => (
                              <SelectItem key={format} value={format}>
                                {format.toUpperCase()}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="viz-quality">Quality</Label>
                      <Select
                        value={
                          visualizationOptions.quality?.quality?.toString() ||
                          "0.95"
                        }
                        onValueChange={value =>
                          setVisualizationOptions(prev => ({
                            ...prev,
                            quality: {
                              ...prev.quality,
                              quality: parseFloat(value),
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.8">Standard (80%)</SelectItem>
                          <SelectItem value="0.9">High (90%)</SelectItem>
                          <SelectItem value="0.95">Very High (95%)</SelectItem>
                          <SelectItem value="1.0">Maximum (100%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="viz-width">Width (px)</Label>
                      <Input
                        id="viz-width"
                        type="number"
                        value={visualizationOptions.quality?.width}
                        onChange={e =>
                          setVisualizationOptions(prev => ({
                            ...prev,
                            quality: {
                              ...prev.quality,
                              width: parseInt(e.target.value) || 1920,
                            },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="viz-height">Height (px)</Label>
                      <Input
                        id="viz-height"
                        type="number"
                        value={visualizationOptions.quality?.height}
                        onChange={e =>
                          setVisualizationOptions(prev => ({
                            ...prev,
                            quality: {
                              ...prev.quality,
                              height: parseInt(e.target.value) || 1080,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {visualizations.length} visualization(s) available
                    </div>
                    <Button
                      onClick={() => handleQuickExport("visualization")}
                      disabled={
                        exportProgress.isExporting ||
                        visualizations.length === 0
                      }
                    >
                      {exportProgress.isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileImage className="h-4 w-4 mr-2" />
                      )}
                      Export Charts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Parameters Export Tab */}
            <TabsContent value="parameters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Parameter Set Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="param-format">Export Format</Label>
                      <Select
                        value={parameterOptions.format}
                        onValueChange={value =>
                          setParameterOptions(prev => ({
                            ...prev,
                            format: value as ParameterExportFormat,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {exportTypeConfigs.parameters.formats.map(format => (
                            <SelectItem key={format} value={format}>
                              {format === "json-simple"
                                ? "JSON (Simple)"
                                : format.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="param-filename">Filename</Label>
                      <Input
                        id="param-filename"
                        value={parameterOptions.filename || ""}
                        onChange={e =>
                          setParameterOptions(prev => ({
                            ...prev,
                            filename: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Include Options</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="param-metadata"
                          checked={parameterOptions.includeMetadata}
                          onCheckedChange={checked =>
                            setParameterOptions(prev => ({
                              ...prev,
                              includeMetadata: checked as boolean,
                            }))
                          }
                        />
                        <Label htmlFor="param-metadata" className="text-sm">
                          Metadata
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="param-documentation"
                          checked={parameterOptions.includeDocumentation}
                          onCheckedChange={checked =>
                            setParameterOptions(prev => ({
                              ...prev,
                              includeDocumentation: checked as boolean,
                            }))
                          }
                        />
                        <Label
                          htmlFor="param-documentation"
                          className="text-sm"
                        >
                          Documentation
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="param-validation"
                          checked={parameterOptions.includeValidationRules}
                          onCheckedChange={checked =>
                            setParameterOptions(prev => ({
                              ...prev,
                              includeValidationRules: checked as boolean,
                            }))
                          }
                        />
                        <Label htmlFor="param-validation" className="text-sm">
                          Validation Rules
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="param-examples"
                          checked={parameterOptions.includeExamples}
                          onCheckedChange={checked =>
                            setParameterOptions(prev => ({
                              ...prev,
                              includeExamples: checked as boolean,
                            }))
                          }
                        />
                        <Label htmlFor="param-examples" className="text-sm">
                          Examples
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {parameters
                        ? "Parameter set available"
                        : "No parameters available"}
                    </div>
                    <Button
                      onClick={() => handleQuickExport("parameters")}
                      disabled={exportProgress.isExporting || !parameters}
                    >
                      {exportProgress.isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4 mr-2" />
                      )}
                      Export Parameters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Session Export Tab */}
            <TabsContent value="session" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Complete Session Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Archive className="h-4 w-4" />
                    <AlertDescription>
                      This will export your complete simulation session
                      including all data, parameters, visualizations, and
                      metadata in a single package.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Session Contents</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between p-2 rounded border">
                        <span>Simulation Data</span>
                        <Badge
                          variant={
                            simulationData.length > 0 ? "default" : "outline"
                          }
                        >
                          {simulationData.length > 0 ? "Available" : "Empty"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded border">
                        <span>Parameters</span>
                        <Badge variant={parameters ? "default" : "outline"}>
                          {parameters ? "Available" : "Not Set"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded border">
                        <span>Visualizations</span>
                        <Badge
                          variant={
                            visualizations.length > 0 ? "default" : "outline"
                          }
                        >
                          {visualizations.length} Charts
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded border">
                        <span>Session Metadata</span>
                        <Badge variant={sessionData ? "default" : "outline"}>
                          {sessionData ? "Available" : "None"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Complete session package (~10-50MB)
                    </div>
                    <Button
                      onClick={() => handleQuickExport("session")}
                      disabled={
                        exportProgress.isExporting ||
                        (!simulationData.length && !parameters)
                      }
                    >
                      {exportProgress.isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Archive className="h-4 w-4 mr-2" />
                      )}
                      Export Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk Export Tab */}
            <TabsContent value="bulk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Bulk Export
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllOfType("", true)}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllOfType("", false)}
                    >
                      Select None
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {exportItems.map(item => {
                      const IconComponent =
                        exportTypeConfigs[
                          item.type as keyof typeof exportTypeConfigs
                        ]?.icon || FileText;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center space-x-3 p-3 rounded border hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                          <Badge variant="outline">{item.size}</Badge>
                        </div>
                      );
                    })}
                  </div>

                  {exportItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No items available for export
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {exportItems.filter(item => item.selected).length} of{" "}
                      {exportItems.length} items selected
                    </div>
                    <Button
                      onClick={handleBulkExport}
                      disabled={
                        exportProgress.isExporting ||
                        exportItems.filter(item => item.selected).length === 0
                      }
                    >
                      {exportProgress.isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export Selected
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Export dialog trigger button component
export function ExportDialogTrigger({
  children,
  variant = "outline",
  size = "default",
  ...props
}: {
  children?: React.ReactNode;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
} & Omit<React.ComponentProps<typeof Button>, "children">) {
  return (
    <Button variant={variant} size={size} {...props}>
      {children || (
        <>
          <Download className="h-4 w-4 mr-2" />
          Export
        </>
      )}
    </Button>
  );
}
