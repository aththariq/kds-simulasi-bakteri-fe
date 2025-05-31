"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Settings,
  Palette,
  Grid,
  Wifi,
  WifiOff,
  Zap,
  ZapOff,
} from "lucide-react";
import { usePetriDishData } from "./hooks/usePetriDishData";
import CanvasPetriDishRenderer, {
  CanvasPetriDishRendererRef,
} from "./CanvasPetriDishRenderer";
import {
  Bacterium,
  AntibioticZone,
  PetriDishData,
} from "./PetriDishVisualization";

// Props interface
interface PetriDishVisualizationProps {
  data?: PetriDishData;
  simulationId?: string;
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
  realTimeUpdates?: boolean;
  onBacteriumClick?: (bacterium: Bacterium) => void;
  onZoneClick?: (zone: AntibioticZone) => void;
}

// Performance monitoring
interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  bacteriaCount: number;
  lastUpdate: number;
  renderMode: "canvas" | "svg";
  lodLevel: number;
}

export const OptimizedPetriDishVisualization: React.FC<
  PetriDishVisualizationProps
> = ({
  data: staticData,
  simulationId,
  width = 800,
  height = 600,
  className = "",
  showControls = true,
  realTimeUpdates = true,
  onBacteriumClick,
  onZoneClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRendererRef = useRef<CanvasPetriDishRendererRef>(null);
  const performanceRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    frameRate: 60,
    bacteriaCount: 0,
    lastUpdate: 0,
    renderMode: "canvas",
    lodLevel: 0,
  });

  const [isPlaying, setIsPlaying] = useState(realTimeUpdates);
  const [showGrid, setShowGrid] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [bacteriumSize, setBacteriumSize] = useState([3]);
  const [selectedBacterium, setSelectedBacterium] = useState<string | null>(
    null
  );
  const [useLiveData, setUseLiveData] = useState(
    !!simulationId && realTimeUpdates
  );
  const [useCanvasRenderer, setUseCanvasRenderer] = useState(true);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);

  // Viewport state for zoom and pan
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    scale: 1,
    width,
    height,
  });

  // Real-time data hook
  const {
    data: liveData,
    isConnected,
    isLoading: liveDataLoading,
    error: liveDataError,
    connect,
    disconnect,
  } = usePetriDishData({
    simulationId,
    autoConnect: useLiveData && !!simulationId,
    updateInterval: 1000,
    enableBuffering: true,
  });

  // Determine which data to use
  const data = useLiveData && liveData ? liveData : staticData;

  // Responsive dimensions
  const [dimensions, setDimensions] = useState({ width, height });

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>(performanceRef.current);

  // Update dimensions on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const newDimensions = {
          width: Math.max(containerWidth || width, 400),
          height: Math.max(containerHeight || height, 300),
        };
        setDimensions(newDimensions);
        setViewport(prev => ({
          ...prev,
          width: newDimensions.width,
          height: newDimensions.height,
        }));
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [width, height]);

  // Determine LOD level based on bacteria count and zoom
  const determineLODLevel = useCallback(
    (bacteriaCount: number, scale: number): number => {
      if (bacteriaCount > 4000) return scale < 0.5 ? 3 : 2;
      if (bacteriaCount > 2000) return scale < 0.8 ? 2 : 1;
      if (bacteriaCount > 1000) return scale < 1.0 ? 1 : 0;
      return 0;
    },
    []
  );

  // Performance monitoring hook
  useEffect(() => {
    if (!data?.bacteria) return;

    const startTime = performance.now();
    const currentTime = Date.now();

    // Update performance metrics
    const newMetrics: PerformanceMetrics = {
      renderTime: 0, // Will be updated after render
      frameRate: performanceRef.current.lastUpdate
        ? 1000 / (currentTime - performanceRef.current.lastUpdate)
        : 60,
      bacteriaCount: data.bacteria.length,
      lastUpdate: currentTime,
      renderMode: useCanvasRenderer ? "canvas" : "svg",
      lodLevel: determineLODLevel(data.bacteria.length, viewport.scale),
    };

    performanceRef.current = newMetrics;
    setPerformanceMetrics({ ...newMetrics });

    // Auto-switch to canvas for large datasets
    if (data.bacteria.length > 500 && !useCanvasRenderer) {
      setUseCanvasRenderer(true);
    }

    const endTime = performance.now();
    performanceRef.current.renderTime = endTime - startTime;
  }, [data?.bacteria, viewport.scale, useCanvasRenderer, determineLODLevel]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!data?.bacteria) return null;

    const resistanceCounts = data.bacteria.reduce(
      (acc, bacterium) => {
        acc[bacterium.resistance_status]++;
        return acc;
      },
      { sensitive: 0, intermediate: 0, resistant: 0 }
    );

    return {
      ...resistanceCounts,
      total: data.bacteria.length,
      occupancy: data.grid_statistics
        ? Math.round(data.grid_statistics.occupancy_rate * 100)
        : 0,
    };
  }, [data?.bacteria, data?.grid_statistics]);

  // Zoom and pan handlers
  const handleZoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.5, 10),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.5, 0.1),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setViewport({
      x: 0,
      y: 0,
      scale: 1,
      width: dimensions.width,
      height: dimensions.height,
    });
    setSelectedBacterium(null);
  }, [dimensions]);

  // Live data toggle
  const handleLiveDataToggle = useCallback(() => {
    if (!simulationId) return;

    if (useLiveData) {
      disconnect();
      setUseLiveData(false);
    } else {
      setUseLiveData(true);
      connect(simulationId);
    }
  }, [useLiveData, simulationId, connect, disconnect]);

  // Canvas event handlers
  const handleBacteriumClick = useCallback(
    (bacterium: Bacterium) => {
      setSelectedBacterium(
        selectedBacterium === bacterium.id ? null : bacterium.id
      );
      onBacteriumClick?.(bacterium);
    },
    [selectedBacterium, onBacteriumClick]
  );

  const handleZoneClick = useCallback(
    (zone: AntibioticZone) => {
      onZoneClick?.(zone);
    },
    [onZoneClick]
  );

  // Renderer toggle
  const handleRendererToggle = useCallback(() => {
    setUseCanvasRenderer(prev => !prev);
  }, []);

  // Mouse wheel zoom for canvas
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    setViewport(prev => {
      const newScale = Math.max(0.1, Math.min(10, prev.scale * zoomFactor));
      const scaleRatio = newScale / prev.scale;

      return {
        ...prev,
        scale: newScale,
        x: mouseX - (mouseX - prev.x) * scaleRatio,
        y: mouseY - (mouseY - prev.y) * scaleRatio,
      };
    });
  }, []);

  // Mouse drag for canvas
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - viewport.x,
        y: event.clientY - viewport.y,
      });
    },
    [viewport.x, viewport.y]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging) return;

      setViewport(prev => ({
        ...prev,
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      }));
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            Petri Dish Visualization
            {useCanvasRenderer && (
              <Badge variant="secondary" className="ml-2">
                Canvas Optimized
              </Badge>
            )}
          </h3>

          {simulationId && (
            <div className="flex items-center gap-2">
              {useLiveData ? (
                isConnected ? (
                  <Badge
                    variant="default"
                    className="text-green-600 border-green-600"
                  >
                    <Wifi className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-orange-600 border-orange-600"
                  >
                    <WifiOff className="w-3 h-3 mr-1" />
                    Connecting...
                  </Badge>
                )
              ) : (
                <Badge
                  variant="outline"
                  className="text-gray-600 border-gray-600"
                >
                  Static
                </Badge>
              )}
            </div>
          )}
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            {/* Performance metrics toggle */}
            <Button
              size="sm"
              variant={showPerformanceMetrics ? "default" : "outline"}
              onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
            >
              📊
            </Button>

            {/* Renderer toggle */}
            <Button
              size="sm"
              variant={useCanvasRenderer ? "default" : "outline"}
              onClick={handleRendererToggle}
              title={`Switch to ${
                useCanvasRenderer ? "SVG" : "Canvas"
              } renderer`}
            >
              {useCanvasRenderer ? (
                <Zap className="w-4 h-4" />
              ) : (
                <ZapOff className="w-4 h-4" />
              )}
            </Button>

            {/* Live data toggle */}
            {simulationId && (
              <Button
                size="sm"
                variant={useLiveData ? "default" : "outline"}
                onClick={handleLiveDataToggle}
                disabled={liveDataLoading}
              >
                {useLiveData ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Control buttons */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {showPerformanceMetrics && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Bacteria:</span>{" "}
              {performanceMetrics.bacteriaCount}
            </div>
            <div>
              <span className="font-medium">FPS:</span>{" "}
              {Math.round(performanceMetrics.frameRate)}
            </div>
            <div>
              <span className="font-medium">Render:</span>{" "}
              {performanceMetrics.renderMode}
            </div>
            <div>
              <span className="font-medium">LOD:</span>{" "}
              {performanceMetrics.lodLevel}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Bar */}
      {stats && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Sensitive: {stats.sensitive}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Intermediate: {stats.intermediate}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Resistant: {stats.resistant}</span>
          </div>
          <span className="text-gray-600">
            Total: {stats.total} | Occupancy: {stats.occupancy}%
          </span>
        </div>
      )}

      {/* Error Display */}
      {liveDataError && useLiveData && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Connection Error:</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{liveDataError}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-red-600 border-red-600"
            onClick={() => simulationId && connect(simulationId)}
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Visualization Container */}
      <div
        ref={containerRef}
        className="relative bg-gray-50 rounded-lg overflow-hidden"
        style={{ height: dimensions.height }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {useCanvasRenderer && data ? (
          <CanvasPetriDishRenderer
            ref={canvasRendererRef}
            data={data}
            width={dimensions.width}
            height={dimensions.height}
            viewport={viewport}
            bacteriumSize={bacteriumSize[0]}
            showGrid={showGrid}
            showZones={showZones}
            selectedBacterium={selectedBacterium || undefined}
            onBacteriumClick={handleBacteriumClick}
            onZoneClick={handleZoneClick}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              {data
                ? "SVG renderer not implemented in this optimized version"
                : "No data available"}
            </p>
          </div>
        )}

        {/* Settings Panel */}
        {showControls && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-3 min-w-[200px]">
            <div className="flex items-center justify-between">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Display Options</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={e => setShowGrid(e.target.checked)}
                  className="rounded"
                />
                <Grid className="w-4 h-4" />
                Show Grid
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showZones}
                  onChange={e => setShowZones(e.target.checked)}
                  className="rounded"
                />
                <Palette className="w-4 h-4" />
                Show Antibiotic Zones
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bacterium Size</label>
              <Slider
                value={bacteriumSize}
                onValueChange={setBacteriumSize}
                min={1}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="pt-2 border-t text-xs text-gray-500">
              Zoom: {(viewport.scale * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {/* Selected Bacterium Details */}
      {selectedBacterium && data && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Selected Bacterium</h4>
          {(() => {
            const bacterium = data.bacteria.find(
              b => b.id === selectedBacterium
            );
            if (!bacterium) return null;

            return (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>ID: {bacterium.id}</div>
                <div>Resistance: {bacterium.resistance_status}</div>
                <div>Fitness: {bacterium.fitness.toFixed(3)}</div>
                <div>Generation: {bacterium.generation}</div>
                <div className="col-span-2">
                  Position: ({bacterium.position.x.toFixed(1)},{" "}
                  {bacterium.position.y.toFixed(1)})
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
};

export default OptimizedPetriDishVisualization;
