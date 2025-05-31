"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import * as d3 from "d3";
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
  Circle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { usePetriDishData } from "./hooks/usePetriDishData";

// Types for spatial simulation data
export interface Coordinate {
  x: number;
  y: number;
}

export interface Bacterium {
  id: string;
  position: Coordinate;
  resistance_status: "sensitive" | "intermediate" | "resistant";
  fitness: number;
  generation: number;
}

export interface AntibioticZone {
  id: string;
  center: Coordinate;
  radius: number;
  concentration: number;
}

export interface GridStatistics {
  total_bacteria: number;
  occupied_cells: number;
  occupancy_rate: number;
  antibiotic_coverage: number;
  grid_dimensions: [number, number];
  physical_dimensions: [number, number];
}

export interface PetriDishData {
  bacteria: Bacterium[];
  antibiotic_zones: AntibioticZone[];
  grid_statistics: GridStatistics;
  timestamp: number;
}

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

// Color schemes for different resistance status
const RESISTANCE_COLORS = {
  sensitive: "#10b981", // Green
  intermediate: "#f59e0b", // Orange
  resistant: "#ef4444", // Red
} as const;

const ANTIBIOTIC_COLOR = "#6366f1"; // Purple
const BACKGROUND_COLOR = "#f8fafc";
const GRID_COLOR = "#e2e8f0";

export const PetriDishVisualization: React.FC<PetriDishVisualizationProps> = ({
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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(realTimeUpdates);
  const [showGrid, setShowGrid] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [bacteriumSize, setBacteriumSize] = useState([3]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectedBacterium, setSelectedBacterium] = useState<string | null>(
    null
  );
  const [useLiveData, setUseLiveData] = useState(
    !!simulationId && realTimeUpdates
  );

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

  // Update dimensions on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        setDimensions({
          width: Math.max(containerWidth || width, 400),
          height: Math.max(containerHeight || height, 300),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [width, height]);

  // Setup scales for coordinate mapping
  const scales = useMemo(() => {
    const [gridWidth, gridHeight] = data?.grid_statistics
      .physical_dimensions || [0, 0];

    const xScale = d3
      .scaleLinear()
      .domain([0, gridWidth])
      .range([40, dimensions.width - 40]);

    const yScale = d3
      .scaleLinear()
      .domain([0, gridHeight])
      .range([40, dimensions.height - 40]);

    return { xScale, yScale };
  }, [data?.grid_statistics.physical_dimensions, dimensions]);

  // Color scale for fitness
  const fitnessColorScale = useMemo(() => {
    const fitnessExtent = d3.extent(
      data?.bacteria || [],
      d => d.fitness
    ) as unknown as [number, number];
    return d3.scaleSequential(d3.interpolateViridis).domain(fitnessExtent);
  }, [data?.bacteria]);

  // Zoom behavior
  const zoom = useMemo(() => {
    return d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", event => {
        const { transform } = event;
        setZoomLevel(transform.k);
        setPanOffset({ x: transform.x, y: transform.y });
      });
  }, []);

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Setup main group with zoom/pan transforms
    const mainGroup = svg
      .append("g")
      .attr("class", "main-group")
      .attr(
        "transform",
        `translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`
      );

    // Background
    mainGroup
      .append("rect")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("fill", BACKGROUND_COLOR)
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 2)
      .attr("rx", 8);

    // Grid lines (optional)
    if (showGrid) {
      const gridGroup = mainGroup.append("g").attr("class", "grid");

      const [gridCols, gridRows] = data.grid_statistics.grid_dimensions;
      const cellWidth = (dimensions.width - 80) / gridCols;
      const cellHeight = (dimensions.height - 80) / gridRows;

      // Vertical lines
      for (let i = 0; i <= gridCols; i++) {
        gridGroup
          .append("line")
          .attr("x1", 40 + i * cellWidth)
          .attr("y1", 40)
          .attr("x2", 40 + i * cellWidth)
          .attr("y2", dimensions.height - 40)
          .attr("stroke", GRID_COLOR)
          .attr("stroke-width", 0.5)
          .attr("opacity", 0.3);
      }

      // Horizontal lines
      for (let i = 0; i <= gridRows; i++) {
        gridGroup
          .append("line")
          .attr("x1", 40)
          .attr("y1", 40 + i * cellHeight)
          .attr("x2", dimensions.width - 40)
          .attr("y2", 40 + i * cellHeight)
          .attr("stroke", GRID_COLOR)
          .attr("stroke-width", 0.5)
          .attr("opacity", 0.3);
      }
    }

    // Antibiotic zones
    if (showZones && data.antibiotic_zones.length > 0) {
      const zonesGroup = mainGroup
        .append("g")
        .attr("class", "antibiotic-zones");

      data.antibiotic_zones.forEach(zone => {
        const centerX = scales.xScale(zone.center.x);
        const centerY = scales.yScale(zone.center.y);
        const radius = scales.xScale(zone.radius) - scales.xScale(0);

        // Zone background
        zonesGroup
          .append("circle")
          .attr("cx", centerX)
          .attr("cy", centerY)
          .attr("r", radius)
          .attr("fill", ANTIBIOTIC_COLOR)
          .attr("opacity", zone.concentration * 0.3)
          .attr("stroke", ANTIBIOTIC_COLOR)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5")
          .style("cursor", "pointer")
          .on("click", () => onZoneClick?.(zone));

        // Zone label
        zonesGroup
          .append("text")
          .attr("x", centerX)
          .attr("y", centerY - radius - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", 12)
          .attr("font-weight", "bold")
          .attr("fill", ANTIBIOTIC_COLOR)
          .text(`${(zone.concentration * 100).toFixed(0)}%`);
      });
    }

    // Bacteria
    const bacteriaGroup = mainGroup.append("g").attr("class", "bacteria");

    const bacteria = bacteriaGroup
      .selectAll(".bacterium")
      .data(data.bacteria, (d: any) => d.id) // eslint-disable-line @typescript-eslint/no-explicit-any
      .enter()
      .append("g")
      .attr("class", "bacterium")
      .attr(
        "transform",
        d =>
          `translate(${scales.xScale(d.position.x)}, ${scales.yScale(
            d.position.y
          )})`
      )
      .style("cursor", "pointer");

    // Bacterium circles
    bacteria
      .append("circle")
      .attr("r", bacteriumSize[0])
      .attr("fill", d => RESISTANCE_COLORS[d.resistance_status])
      .attr("stroke", d => (selectedBacterium === d.id ? "#1f2937" : "white"))
      .attr("stroke-width", d => (selectedBacterium === d.id ? 3 : 1))
      .attr("opacity", 0.8)
      .on("click", function (event, d) {
        event.stopPropagation();
        setSelectedBacterium(selectedBacterium === d.id ? null : d.id);
        onBacteriumClick?.(d);
      })
      .on("mouseover", function (event, d) {
        // Tooltip
        const tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "petri-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000");

        tooltip.html(`
          <div><strong>ID:</strong> ${d.id}</div>
          <div><strong>Resistance:</strong> ${d.resistance_status}</div>
          <div><strong>Fitness:</strong> ${d.fitness.toFixed(3)}</div>
          <div><strong>Generation:</strong> ${d.generation}</div>
          <div><strong>Position:</strong> (${d.position.x.toFixed(
            1
          )}, ${d.position.y.toFixed(1)})</div>
        `);

        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", function () {
        d3.selectAll(".petri-tooltip").remove();
      });

    // Fitness indicators (optional small rings)
    bacteria
      .append("circle")
      .attr("r", bacteriumSize[0] + 2)
      .attr("fill", "none")
      .attr("stroke", d => fitnessColorScale(d.fitness))
      .attr("stroke-width", 1)
      .attr("opacity", 0.6);

    // Apply zoom behavior
    svg.call(zoom);

    // Handle background clicks to deselect
    svg.on("click", () => {
      setSelectedBacterium(null);
    });
  }, [
    data,
    dimensions,
    scales,
    showGrid,
    showZones,
    bacteriumSize,
    zoomLevel,
    panOffset,
    selectedBacterium,
    zoom,
    fitnessColorScale,
    onBacteriumClick,
    onZoneClick,
  ]);

  // Control handlers
  const handleZoomIn = useCallback(() => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(zoom.scaleBy, 1.5);
    }
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(zoom.scaleBy, 0.75);
    }
  }, [zoom]);

  const handleReset = useCallback(() => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .call(zoom.transform, d3.zoomIdentity);
    }
    setSelectedBacterium(null);
  }, [zoom]);

  // Handle live data toggle
  const handleLiveDataToggle = useCallback(() => {
    const newUseLiveData = !useLiveData;
    setUseLiveData(newUseLiveData);

    if (newUseLiveData && simulationId) {
      connect(simulationId);
    } else {
      disconnect();
    }
  }, [useLiveData, simulationId, connect, disconnect]);

  // Statistics display
  const stats = useMemo(() => {
    if (!data) return null;

    const resistanceCounts = data.bacteria.reduce((acc, b) => {
      acc[b.resistance_status] = (acc[b.resistance_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: data.bacteria.length,
      sensitive: resistanceCounts.sensitive || 0,
      intermediate: resistanceCounts.intermediate || 0,
      resistant: resistanceCounts.resistant || 0,
      occupancy: (data.grid_statistics.occupancy_rate * 100).toFixed(1),
      antibioticCoverage: (
        data.grid_statistics.antibiotic_coverage * 100
      ).toFixed(1),
    };
  }, [data]);

  // Don't render if no data available
  if (!data) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Circle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No spatial data available</p>
            {simulationId && (
              <Button
                className="mt-2"
                onClick={() => handleLiveDataToggle()}
                disabled={liveDataLoading}
              >
                {liveDataLoading ? "Connecting..." : "Connect to Live Data"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Circle className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Petri Dish Visualization</h3>

          {/* Connection Status */}
          {simulationId && (
            <div className="flex items-center gap-2">
              {useLiveData ? (
                isConnected ? (
                  <Badge
                    variant="outline"
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
            {/* Live Data Toggle */}
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

            {/* Existing controls */}
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
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="border border-gray-200"
        />

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
              Zoom: {(zoomLevel * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {/* Selected Bacterium Details */}
      {selectedBacterium && (
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

export default PetriDishVisualization;
