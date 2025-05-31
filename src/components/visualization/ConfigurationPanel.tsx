"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, RotateCcw, Settings } from "lucide-react";
import { useVisualizationConfig } from "./hooks/useVisualizationConfig";
import { PRESET_CONFIGS, PresetName } from "./hooks/useVisualizationConfig";

interface ConfigurationPanelProps {
  onPreview?: () => void;
  className?: string;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  onPreview,
  className = "",
}) => {
  const {
    config,
    updateConfig,
    resetToPreset,
    validateConfig,
    exportConfig,
    importConfig,
    isLoading,
    error,
  } = useVisualizationConfig();

  const [importFile, setImportFile] = useState<File | null>(null);

  const handlePresetChange = (preset: PresetName) => {
    resetToPreset(preset);
    if (onPreview) onPreview();
  };

  const handleThemeUpdate = (updates: Partial<typeof config.theme>) => {
    updateConfig({ theme: { ...config.theme, ...updates } });
    if (onPreview) onPreview();
  };

  const handleChartUpdate = (updates: Partial<typeof config.chart>) => {
    updateConfig({ chart: { ...config.chart, ...updates } });
    if (onPreview) onPreview();
  };

  const handleLayoutUpdate = (updates: Partial<typeof config.layout>) => {
    updateConfig({ layout: { ...config.layout, ...updates } });
    if (onPreview) onPreview();
  };

  const handleDataUpdate = (updates: Partial<typeof config.data>) => {
    updateConfig({ data: { ...config.data, ...updates } });
    if (onPreview) onPreview();
  };

  const handleExport = () => {
    const configData = exportConfig();
    const blob = new Blob([configData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visualization-config-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      await importConfig(text);
      setImportFile(null);
      if (onPreview) onPreview();
    } catch (err) {
      console.error("Failed to import config:", err);
    }
  };

  const validationResult = validateConfig(config);

  return (
    <Card className={`w-full max-w-4xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Visualization Configuration
        </CardTitle>
        <CardDescription>
          Customize the appearance and behavior of your bacterial simulation
          visualizations
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {validationResult.length > 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              Configuration issues: {validationResult.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Preset Selection */}
          <div className="space-y-2">
            <Label>Configuration Preset</Label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PRESET_CONFIGS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetChange(key as PresetName)}
                  className="flex items-center gap-1"
                >
                  {preset.name}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {preset.description}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Import/Export Controls */}
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export Config
            </Button>

            <div className="flex gap-1">
              <Input
                type="file"
                accept=".json"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="w-auto"
                size={10}
              />
              <Button
                onClick={handleImport}
                disabled={!importFile}
                variant="outline"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
            </div>

            <Button
              onClick={() => resetToPreset("standard")}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          <Tabs defaultValue="theme" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="theme">Theme</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
            </TabsList>

            {/* Theme Configuration */}
            <TabsContent value="theme" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color Mode</Label>
                  <Select
                    value={config.theme.mode}
                    onValueChange={(value: "light" | "dark") =>
                      handleThemeUpdate({ mode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={config.theme.colors.primary}
                    onChange={e =>
                      handleThemeUpdate({
                        colors: {
                          ...config.theme.colors,
                          primary: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <Input
                    type="color"
                    value={config.theme.colors.secondary}
                    onChange={e =>
                      handleThemeUpdate({
                        colors: {
                          ...config.theme.colors,
                          secondary: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={config.theme.colors.background}
                    onChange={e =>
                      handleThemeUpdate({
                        colors: {
                          ...config.theme.colors,
                          background: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* Chart Configuration */}
            <TabsContent value="chart" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Chart Type</Label>
                  <Select
                    value={config.chart.type}
                    onValueChange={(
                      value: "line" | "area" | "bar" | "scatter"
                    ) => handleChartUpdate({ type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="scatter">Scatter Plot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Animation Duration (ms)</Label>
                  <Slider
                    value={[config.chart.animation.duration]}
                    onValueChange={([value]) =>
                      handleChartUpdate({
                        animation: {
                          ...config.chart.animation,
                          duration: value,
                        },
                      })
                    }
                    max={2000}
                    min={0}
                    step={100}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.chart.animation.duration}ms
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.chart.animation.enabled}
                    onCheckedChange={checked =>
                      handleChartUpdate({
                        animation: {
                          ...config.chart.animation,
                          enabled: checked,
                        },
                      })
                    }
                  />
                  <Label>Enable Animations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.chart.grid.show}
                    onCheckedChange={checked =>
                      handleChartUpdate({
                        grid: { ...config.chart.grid, show: checked },
                      })
                    }
                  />
                  <Label>Show Grid</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.chart.legend.show}
                    onCheckedChange={checked =>
                      handleChartUpdate({
                        legend: { ...config.chart.legend, show: checked },
                      })
                    }
                  />
                  <Label>Show Legend</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.chart.tooltip.enabled}
                    onCheckedChange={checked =>
                      handleChartUpdate({
                        tooltip: { ...config.chart.tooltip, enabled: checked },
                      })
                    }
                  />
                  <Label>Enable Tooltips</Label>
                </div>
              </div>
            </TabsContent>

            {/* Layout Configuration */}
            <TabsContent value="layout" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Container Padding</Label>
                  <Slider
                    value={[config.layout.containerSpacing]}
                    onValueChange={([value]) =>
                      handleLayoutUpdate({ containerSpacing: value })
                    }
                    max={64}
                    min={0}
                    step={4}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.layout.containerSpacing}px
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Card Padding</Label>
                  <Slider
                    value={[config.layout.cardPadding]}
                    onValueChange={([value]) =>
                      handleLayoutUpdate({ cardPadding: value })
                    }
                    max={32}
                    min={0}
                    step={2}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.layout.cardPadding}px
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Default Aspect Ratio</Label>
                  <Select
                    value={config.layout.responsive.aspectRatio.default.toString()}
                    onValueChange={value =>
                      handleLayoutUpdate({
                        responsive: {
                          ...config.layout.responsive,
                          aspectRatio: {
                            ...config.layout.responsive.aspectRatio,
                            default: parseFloat(value),
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1:1 (Square)</SelectItem>
                      <SelectItem value="1.33">4:3 (Standard)</SelectItem>
                      <SelectItem value="1.78">16:9 (Widescreen)</SelectItem>
                      <SelectItem value="2">2:1 (Ultra-wide)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Data Configuration */}
            <TabsContent value="data" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Refresh Interval (ms)</Label>
                  <Slider
                    value={[config.data.refreshInterval]}
                    onValueChange={([value]) =>
                      handleDataUpdate({ refreshInterval: value })
                    }
                    max={5000}
                    min={100}
                    step={100}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.data.refreshInterval}ms
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Buffer Size</Label>
                  <Slider
                    value={[config.data.bufferSize]}
                    onValueChange={([value]) =>
                      handleDataUpdate({ bufferSize: value })
                    }
                    max={10000}
                    min={100}
                    step={100}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.data.bufferSize} points
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Decimal Precision</Label>
                  <Slider
                    value={[config.data.precision]}
                    onValueChange={([value]) =>
                      handleDataUpdate({ precision: value })
                    }
                    max={6}
                    min={0}
                    step={1}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.data.precision} decimals
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.data.autoExport}
                    onCheckedChange={checked =>
                      handleDataUpdate({ autoExport: checked })
                    }
                  />
                  <Label>Auto Export Data</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Performance Status */}
          {config.performance && (
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium">
                Performance Settings
              </Label>
              <div className="flex gap-2 mt-2">
                <Badge
                  variant={
                    config.performance.enableOptimizations
                      ? "default"
                      : "secondary"
                  }
                >
                  Optimizations:{" "}
                  {config.performance.enableOptimizations ? "ON" : "OFF"}
                </Badge>
                <Badge variant="outline">
                  Buffer: {config.data.bufferSize} points
                </Badge>
                <Badge variant="outline">
                  Debounce: {config.performance.debounceMs}ms
                </Badge>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            Loading configuration...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
