"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, RotateCcw, Zap } from "lucide-react";
import OptimizedPetriDishVisualization from "./OptimizedPetriDishVisualization";
import {
  PetriDishData,
  Bacterium,
  AntibioticZone,
} from "./PetriDishVisualization";

interface PerformanceTestProps {
  className?: string;
}

// Generate synthetic test data
const generateTestData = (bacteriaCount: number): PetriDishData => {
  const bacteria: Bacterium[] = [];
  const gridWidth = 100;
  const gridHeight = 100;

  // Generate bacteria with random positions and properties
  for (let i = 0; i < bacteriaCount; i++) {
    const resistance_status =
      Math.random() < 0.3
        ? "resistant"
        : Math.random() < 0.5
        ? "intermediate"
        : "sensitive";

    bacteria.push({
      id: `bacteria_${i}`,
      position: {
        x: Math.random() * gridWidth,
        y: Math.random() * gridHeight,
      },
      resistance_status: resistance_status as
        | "sensitive"
        | "intermediate"
        | "resistant",
      fitness: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
      generation: Math.floor(Math.random() * 50),
    });
  }

  // Generate some antibiotic zones
  const antibiotic_zones: AntibioticZone[] = [
    {
      id: "zone_1",
      center: { x: 25, y: 25 },
      radius: 15,
      concentration: 0.8,
    },
    {
      id: "zone_2",
      center: { x: 75, y: 75 },
      radius: 12,
      concentration: 0.6,
    },
  ];

  return {
    bacteria,
    antibiotic_zones,
    grid_statistics: {
      total_bacteria: bacteriaCount,
      occupied_cells: Math.floor(bacteriaCount * 0.7),
      occupancy_rate: Math.min(bacteriaCount / 1000, 1.0),
      antibiotic_coverage: 0.3,
      grid_dimensions: [50, 50],
      physical_dimensions: [gridWidth, gridHeight],
    },
    timestamp: Date.now(),
  };
};

const PRESET_SIZES = [
  { label: "Small (100)", value: 100 },
  { label: "Medium (500)", value: 500 },
  { label: "Large (1K)", value: 1000 },
  { label: "Very Large (2K)", value: 2000 },
  { label: "Huge (5K)", value: 5000 },
  { label: "Extreme (10K)", value: 10000 },
];

export const PerformanceTest: React.FC<PerformanceTestProps> = ({
  className = "",
}) => {
  const [bacteriaCount, setBacteriaCount] = useState([1000]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testData, setTestData] = useState<PetriDishData | null>(null);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);

  // Generate test data
  const generateData = useCallback(async () => {
    setIsGenerating(true);
    const startTime = performance.now();

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const data = generateTestData(bacteriaCount[0]);
      const endTime = performance.now();

      setTestData(data);
      setLastGenerationTime(endTime - startTime);
      setIsGenerating(false);
    }, 10);
  }, [bacteriaCount]);

  // Performance metrics
  const performanceInfo = useMemo(() => {
    if (!testData) return null;

    const count = testData.bacteria.length;
    let expectedPerformance = "Excellent";
    const renderMode = "Canvas (Optimized)";
    let lodLevel = "Full Detail";

    if (count > 4000) {
      expectedPerformance = "Good (LOD Active)";
      lodLevel = "Low Detail";
    } else if (count > 2000) {
      expectedPerformance = "Very Good";
      lodLevel = "Medium Detail";
    } else if (count > 1000) {
      expectedPerformance = "Excellent";
      lodLevel = "Simplified";
    }

    return {
      count,
      expectedPerformance,
      renderMode,
      lodLevel,
      generationTime: lastGenerationTime,
    };
  }, [testData, lastGenerationTime]);

  // Preset size handlers
  const handlePresetSize = useCallback((size: number) => {
    setBacteriaCount([size]);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Control Panel */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Canvas Renderer Performance Test
            </h2>
            <Badge variant="secondary">
              <Zap className="w-3 h-3 mr-1" />
              Optimized Rendering
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Bacteria Count Slider */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Bacteria Count: {bacteriaCount[0].toLocaleString()}
              </label>
              <Slider
                value={bacteriaCount}
                onValueChange={setBacteriaCount}
                min={100}
                max={10000}
                step={100}
                className="w-full"
              />
            </div>

            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              {PRESET_SIZES.map(preset => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant={
                    bacteriaCount[0] === preset.value ? "default" : "outline"
                  }
                  onClick={() => handlePresetSize(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button
                onClick={generateData}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate Test Data"}
              </Button>

              {testData && (
                <Button variant="outline" onClick={() => setTestData(null)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Info */}
      {performanceInfo && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="font-medium">Bacteria:</span>
              <div className="text-lg font-bold text-blue-600">
                {performanceInfo.count.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="font-medium">Generation:</span>
              <div className="text-lg font-bold text-green-600">
                {performanceInfo.generationTime.toFixed(1)}ms
              </div>
            </div>
            <div>
              <span className="font-medium">Render Mode:</span>
              <div className="text-sm font-medium text-purple-600">
                {performanceInfo.renderMode}
              </div>
            </div>
            <div>
              <span className="font-medium">LOD Level:</span>
              <div className="text-sm font-medium text-orange-600">
                {performanceInfo.lodLevel}
              </div>
            </div>
            <div>
              <span className="font-medium">Expected:</span>
              <div className="text-sm font-medium text-emerald-600">
                {performanceInfo.expectedPerformance}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Visualization */}
      {testData && (
        <OptimizedPetriDishVisualization
          data={testData}
          width={800}
          height={600}
          showControls={true}
          realTimeUpdates={false}
        />
      )}

      {/* Performance Notes */}
      <Card className="p-4 bg-blue-50">
        <h3 className="font-medium text-blue-900 mb-2">
          Performance Optimization Features
        </h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div>
            • <strong>Canvas Rendering:</strong> Eliminates DOM overhead for
            thousands of elements
          </div>
          <div>
            • <strong>Spatial Indexing:</strong> QuadTree for O(log n) hit
            testing vs O(n) linear search
          </div>
          <div>
            • <strong>Level-of-Detail:</strong> Adaptive rendering based on zoom
            and dataset size
          </div>
          <div>
            • <strong>Viewport Culling:</strong> Only renders visible bacteria
            with padding
          </div>
          <div>
            • <strong>Frame Throttling:</strong> Smooth 60fps with
            requestAnimationFrame
          </div>
          <div>
            • <strong>Auto-switching:</strong> Automatically uses Canvas for
            datasets &gt; 500 bacteria
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceTest;
