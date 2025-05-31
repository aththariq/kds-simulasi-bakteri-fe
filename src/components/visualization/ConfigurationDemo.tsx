"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ConfigurationPanel } from "./ConfigurationPanel";
import { ConfigurationPreview } from "./ConfigurationPreview";
import { Palette, Monitor, RefreshCw, Info } from "lucide-react";

interface ConfigurationDemoProps {
  className?: string;
}

export const ConfigurationDemo: React.FC<ConfigurationDemoProps> = ({
  className = "",
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("split");

  const handlePreview = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-6 w-6" />
            Visualization Configuration System
          </CardTitle>
          <CardDescription>
            Interactive configuration system for bacterial simulation
            visualizations. Customize themes, chart types, layouts, and data
            processing settings with real-time preview.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This demo showcases the complete configuration system with live
              preview capabilities. Changes made in the configuration panel are
              immediately reflected in the preview chart.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 mt-4">
            <Badge variant="outline">
              <Palette className="h-3 w-3 mr-1" />
              Theme System
            </Badge>
            <Badge variant="outline">
              <Monitor className="h-3 w-3 mr-1" />
              Live Preview
            </Badge>
            <Badge variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" />
              Real-time Updates
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Layout Controls */}
      <div className="flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="split">Split View</TabsTrigger>
            <TabsTrigger value="config">Configuration Only</TabsTrigger>
            <TabsTrigger value="preview">Preview Only</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh Preview
        </Button>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} className="w-full">
        {/* Split View - Configuration and Preview side by side */}
        <TabsContent value="split" className="space-y-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Configuration Panel</h3>
              </div>
              <ConfigurationPanel onPreview={handlePreview} className="h-fit" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Live Preview</h3>
              </div>
              <ConfigurationPreview key={refreshKey} className="h-fit" />
            </div>
          </div>
        </TabsContent>

        {/* Configuration Only */}
        <TabsContent value="config" className="space-y-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Configuration Panel</h3>
            </div>
            <ConfigurationPanel onPreview={handlePreview} />
          </div>
        </TabsContent>

        {/* Preview Only */}
        <TabsContent value="preview" className="space-y-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Configuration Preview</h3>
            </div>
            <ConfigurationPreview key={refreshKey} />
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Configuration System Features
          </CardTitle>
          <CardDescription>
            Complete overview of the visualization configuration capabilities
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Theme Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium">Theme System</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Light/Dark mode support</li>
                <li>• Customizable color schemes</li>
                <li>• Primary, secondary, error colors</li>
                <li>• Background and text colors</li>
                <li>• Real-time theme switching</li>
              </ul>
            </div>

            {/* Chart Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-green-500" />
                <h4 className="font-medium">Chart Settings</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Multiple chart types</li>
                <li>• Animation controls</li>
                <li>• Grid and legend options</li>
                <li>• Tooltip configuration</li>
                <li>• Axis customization</li>
              </ul>
            </div>

            {/* Layout Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-purple-500" />
                <h4 className="font-medium">Layout Control</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Responsive breakpoints</li>
                <li>• Aspect ratio settings</li>
                <li>• Spacing and padding</li>
                <li>• Container sizing</li>
                <li>• Grid system integration</li>
              </ul>
            </div>

            {/* Data Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-orange-500" />
                <h4 className="font-medium">Data Processing</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Refresh intervals</li>
                <li>• Buffer size limits</li>
                <li>• Precision controls</li>
                <li>• Export formats</li>
                <li>• Auto-export options</li>
              </ul>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Configuration Presets */}
          <div className="space-y-3">
            <h4 className="font-medium">Available Configuration Presets</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-sm">Minimal</div>
                <div className="text-xs text-muted-foreground">
                  Basic setup for simple visualizations
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-sm">Standard</div>
                <div className="text-xs text-muted-foreground">
                  Balanced configuration for most use cases
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-sm">Advanced</div>
                <div className="text-xs text-muted-foreground">
                  Feature-rich setup for complex data
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-sm">Performance</div>
                <div className="text-xs text-muted-foreground">
                  Optimized for high-frequency updates
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-sm">Research</div>
                <div className="text-xs text-muted-foreground">
                  Detailed analysis and export capabilities
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Usage Instructions */}
          <div className="space-y-3">
            <h4 className="font-medium">How to Use</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                1. <strong>Select a preset</strong> - Start with one of the
                predefined configurations that best matches your needs
              </p>
              <p>
                2. <strong>Customize settings</strong> - Use the tabs to adjust
                theme, chart, layout, and data processing options
              </p>
              <p>
                3. <strong>Preview changes</strong> - See your modifications
                reflected immediately in the live preview chart
              </p>
              <p>
                4. <strong>Export/Import</strong> - Save your configuration to a
                JSON file or load previously saved settings
              </p>
              <p>
                5. <strong>Apply to visualizations</strong> - Your configuration
                will be automatically applied to all bacterial simulation charts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
