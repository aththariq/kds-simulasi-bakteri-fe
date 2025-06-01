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
import { useMobileVisualization } from "./hooks/useMobileVisualization";

// Types for spatial simulation data
export interface Coordinate {
  x: number;
  y: number;
}

interface ZoomState {
  level: number;
  startDistance?: number;
  startZoom?: number;
}

interface PanOffset {
  x: number;
  y: number;
  startX?: number;
  startY?: number;
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
  const [zoomLevel, setZoomLevel] = useState<ZoomState>({ level: 1 });
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
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

  // Mobile visualization optimization
  const {
    deviceType,
    dimensions: mobileDimensions,
    config: mobileConfig,
    optimizeDataForMobile,
    shouldShowLegend,
    shouldShowGrid,
    shouldShowTooltips,
    animationDuration,
    fontSize,
    performanceSettings,
    simplifiedSettings,
    touchState,
  } = useMobileVisualization("petriDish", {
    enableTouchGestures: true,
    enableSimplifiedView: true,
    performanceMode: true,
  });

  // Determine which data to use
  const data = useLiveData && liveData ? liveData : staticData;

  // Mobile-optimized dimensions
  const effectiveDimensions = useMemo(() => {
    if (deviceType === "mobile") {
      return {
        width: mobileDimensions.width,
        height: mobileDimensions.height,
      };
    }
    return { width, height };
  }, [deviceType, mobileDimensions, width, height]);

  // Optimize data for mobile performance using the hook
  const optimizedData = useMemo(() => {
    if (!data) return null;

    if (deviceType === "mobile") {
      // Use the optimizeDataForMobile function from the hook
      const optimizedBacteria = optimizeDataForMobile(data.bacteria);

      return {
        ...data,
        bacteria: optimizedBacteria,
        // Simplify grid for mobile using simplified settings
        grid_statistics: {
          ...data.grid_statistics,
          grid_dimensions: data.grid_statistics.grid_dimensions.map(d =>
            Math.min(d, simplifiedSettings.maxCategories)
          ),
        },
      };
    }

    return data;
  }, [
    data,
    deviceType,
    optimizeDataForMobile,
    simplifiedSettings.maxCategories,
  ]);

  // Touch gesture handlers for pinch-to-zoom and pan
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (deviceType !== "mobile") return;

      // Additional Petri dish specific handling
      const touches = event.touches;

      if (touches.length === 1) {
        // Single touch - start pan
        const touch = touches[0];
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setPanOffset(prev => ({
            ...prev,
            startX: touch.clientX - prev.x,
            startY: touch.clientY - prev.y,
          }));
        }
      } else if (touches.length === 2) {
        // Two touches - start pinch
        const touch1 = touches[0];
        const touch2 = touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        setZoomLevel(prev => ({
          ...prev,
          startDistance: distance,
          startZoom: zoomLevel.level,
        }));
      }
    },
    [deviceType, zoomLevel.level]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (deviceType !== "mobile") return;

      // Additional Petri dish specific handling
      const touches = event.touches;

      if (touches.length === 1 && !touchState.isPinching) {
        // Single touch - pan
        const touch = touches[0];
        setPanOffset(prev => ({
          x: touch.clientX - (prev.startX || 0),
          y: touch.clientY - (prev.startY || 0),
        }));
      } else if (touches.length === 2) {
        // Two touches - pinch zoom
        const touch1 = touches[0];
        const touch2 = touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        const scale = distance / (zoomLevel.startDistance || distance);
        const newZoom = Math.max(
          0.5,
          Math.min(3, (zoomLevel.startZoom || 1) * scale)
        );
        setZoomLevel(prev => ({
          ...prev,
          level: newZoom,
        }));
      }
    },
    [
      deviceType,
      touchState.isPinching,
      zoomLevel.startDistance,
      zoomLevel.startZoom,
    ]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (deviceType !== "mobile") return;

      // Reset touch state
      setZoomLevel(prev => ({
        ...prev,
        startDistance: undefined,
        startZoom: undefined,
      }));

      setPanOffset(prev => ({
        ...prev,
        startX: undefined,
        startY: undefined,
      }));
    },
    [deviceType]
  );

  // Bacterium click handler with touch support
  const handleBacteriumInteraction = useCallback(
    (bacterium: any, event: any) => {
      if (deviceType === "mobile") {
        // For mobile, require a longer press to avoid accidental clicks
        const touchDuration = Date.now() - (touchState.lastTouchTime || 0);
        if (touchDuration < 200) return; // Ignore quick taps
      }

      onBacteriumClick?.(bacterium);
    },
    [deviceType, touchState.lastTouchTime, onBacteriumClick]
  );

  // Set up responsive dimensions
  const [dimensions, setDimensions] = useState({ width, height });

  // Update dimensions on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;

        if (deviceType === "mobile") {
          // Use mobile-optimized dimensions
          setDimensions({
            width: mobileDimensions.width,
            height: mobileDimensions.height,
          });
        } else {
          setDimensions({
            width: Math.max(clientWidth || width, 400),
            height: Math.max(clientHeight || height, 300),
          });
        }
      }
    };

    updateDimensions();

    // Use debounced resize for performance
    const debouncedUpdate = debounce(
      updateDimensions,
      performanceSettings.debounceDelay
    );
    window.addEventListener("resize", debouncedUpdate);
    return () => window.removeEventListener("resize", debouncedUpdate);
  }, [
    deviceType,
    mobileDimensions,
    performanceSettings.debounceDelay,
    width,
    height,
  ]);

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
        setZoomLevel(prev => ({
          ...prev,
          level: transform.k,
        }));
        setPanOffset({ x: transform.x, y: transform.y });
      });
  }, []);

  // Initialize D3 visualization with mobile optimizations
  useEffect(() => {
    if (!svgRef.current || !optimizedData) return;

    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Add touch event listeners for mobile
    if (deviceType === "mobile") {
      svg
        .node()
        ?.addEventListener("touchstart", handleTouchStart, { passive: false });
      svg
        .node()
        ?.addEventListener("touchmove", handleTouchMove, { passive: false });
      svg
        .node()
        ?.addEventListener("touchend", handleTouchEnd, { passive: false });
    }

    // Setup main group with zoom/pan transforms
    const mainGroup = svg
      .append("g")
      .attr("class", "main-group")
      .attr(
        "transform",
        `translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel.level})`
      );

    // Background
    mainGroup
      .append("rect")
      .attr("width", effectiveDimensions.width)
      .attr("height", effectiveDimensions.height)
      .attr("fill", BACKGROUND_COLOR)
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 2)
      .attr("rx", 8);

    // Grid lines (simplified for mobile)
    if (showGrid && shouldShowGrid()) {
      const gridGroup = mainGroup.append("g").attr("class", "grid");

      const [gridCols, gridRows] =
        optimizedData.grid_statistics.grid_dimensions;
      const cellWidth = (effectiveDimensions.width - 80) / gridCols;
      const cellHeight = (effectiveDimensions.height - 80) / gridRows;

      // Use simplified settings to determine grid density
      const gridStep =
        deviceType === "mobile" ? simplifiedSettings.maxCategories / 10 : 1;

      // Vertical lines
      for (let i = 0; i <= gridCols; i += gridStep) {
        gridGroup
          .append("line")
          .attr("x1", 40 + i * cellWidth)
          .attr("y1", 40)
          .attr("x2", 40 + i * cellWidth)
          .attr("y2", effectiveDimensions.height - 40)
          .attr("stroke", GRID_COLOR)
          .attr("stroke-width", 0.5)
          .attr("opacity", deviceType === "mobile" ? 0.2 : 0.3);
      }

      // Horizontal lines
      for (let i = 0; i <= gridRows; i += gridStep) {
        gridGroup
          .append("line")
          .attr("x1", 40)
          .attr("y1", 40 + i * cellHeight)
          .attr("x2", effectiveDimensions.width - 40)
          .attr("y2", 40 + i * cellHeight)
          .attr("stroke", GRID_COLOR)
          .attr("stroke-width", 0.5)
          .attr("opacity", deviceType === "mobile" ? 0.2 : 0.3);
      }
    }

    // Antibiotic zones (simplified for mobile)
    if (showZones && optimizedData.antibiotic_zones) {
      const antibioticGroup = mainGroup
        .append("g")
        .attr("class", "antibiotic-zones");

      optimizedData.antibiotic_zones.forEach((zone, index) => {
        const radius = Math.min(
          zone.radius,
          deviceType === "mobile" ? 50 : 100 // Smaller zones on mobile
        );

        antibioticGroup
          .append("circle")
          .attr("cx", zone.center.x)
          .attr("cy", zone.center.y)
          .attr("r", radius)
          .attr("fill", ANTIBIOTIC_COLOR)
          .attr("opacity", deviceType === "mobile" ? 0.2 : 0.3)
          .attr("stroke", "#ef4444")
          .attr("stroke-width", deviceType === "mobile" ? 1 : 2)
          .attr("stroke-dasharray", "5,5");

        // Zone label (hide on very small screens or when legend should not show)
        if (
          (deviceType !== "mobile" || effectiveDimensions.width > 400) &&
          shouldShowLegend()
        ) {
          antibioticGroup
            .append("text")
            .attr("x", zone.center.x)
            .attr("y", zone.center.y)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", `${fontSize}px`)
            .style("font-weight", "bold")
            .style("fill", "#ef4444")
            .style("pointer-events", "none")
            .text(`Zone ${index + 1}`);
        }
      });
    }

    // Bacteria visualization with mobile optimizations
    const bacteriaGroup = mainGroup.append("g").attr("class", "bacteria");

    const bacteriaElements = bacteriaGroup
      .selectAll(".bacterium")
      .data(optimizedData.bacteria)
      .enter()
      .append("circle")
      .attr("class", "bacterium")
      .attr("cx", d => scales.xScale(d.position.x))
      .attr("cy", d => scales.yScale(d.position.y))
      .attr("r", d => {
        // Larger bacteria on mobile for touch interaction
        const baseRadius = bacteriumSize[0];
        return deviceType === "mobile" ? Math.max(baseRadius, 5) : baseRadius;
      })
      .attr(
        "fill",
        d =>
          RESISTANCE_COLORS[
            d.resistance_status as keyof typeof RESISTANCE_COLORS
          ]
      )
      .attr("stroke", "#333")
      .attr("stroke-width", deviceType === "mobile" ? 0.5 : 1)
      .style("cursor", deviceType === "mobile" ? "default" : "pointer")
      .style("opacity", deviceType === "mobile" ? 0.8 : 1);

    // Interaction handlers
    if (deviceType === "mobile") {
      // Touch interaction for mobile
      bacteriaElements.on("touchstart", function (event, d) {
        event.preventDefault();
        handleBacteriumInteraction(d, event);
      });
    } else {
      // Mouse interaction for desktop
      bacteriaElements
        .on("mouseover", function (event, d) {
          d3.select(this)
            .transition()
            .duration(animationDuration)
            .attr("r", bacteriumSize[0] * 1.5)
            .attr("stroke-width", 2);
        })
        .on("mouseout", function (event, d) {
          d3.select(this)
            .transition()
            .duration(animationDuration)
            .attr("r", bacteriumSize[0])
            .attr("stroke-width", 1);
        })
        .on("click", function (event, d) {
          handleBacteriumInteraction(d, event);
        });
    }

    // Statistics overlay (simplified for mobile)
    if (
      (deviceType !== "mobile" || effectiveDimensions.width > 500) &&
      shouldShowTooltips()
    ) {
      const statsGroup = mainGroup.append("g").attr("class", "statistics");

      // Apply mobile config settings for statistics positioning
      const statsX = effectiveDimensions.width - 150;
      const statsY = 60;

      // Background for statistics with mobile-optimized styling
      const statsBackground = statsGroup
        .append("rect")
        .attr("x", statsX - 10)
        .attr("y", statsY - 30)
        .attr("width", 140)
        .attr("height", deviceType === "mobile" ? 80 : 100)
        .attr("fill", "rgba(255, 255, 255, 0.9)")
        .attr("stroke", "#d1d5db")
        .attr("stroke-width", 1)
        .attr("rx", 4);

      // Statistics text with mobile-optimized font size
      const baseFontSize = parseInt(fontSize.replace("px", ""), 10);
      const statsFontSize =
        deviceType === "mobile" ? baseFontSize * 0.8 : baseFontSize;

      statsGroup
        .append("text")
        .attr("x", statsX)
        .attr("y", statsY)
        .style("font-size", `${statsFontSize}px`)
        .style("font-weight", "bold")
        .style("fill", "#374151")
        .text("Statistics");

      if (optimizedData.grid_statistics) {
        statsGroup
          .append("text")
          .attr("x", statsX)
          .attr("y", statsY + 20)
          .style("font-size", `${statsFontSize - 1}px`)
          .style("fill", "#6b7280")
          .text(`Bacteria: ${optimizedData.bacteria.length}`);

        statsGroup
          .append("text")
          .attr("x", statsX)
          .attr("y", statsY + 35)
          .style("font-size", `${statsFontSize - 1}px`)
          .style("fill", "#6b7280")
          .text(
            `Occupancy: ${(
              optimizedData.grid_statistics.occupancy_rate * 100
            ).toFixed(1)}%`
          );

        if (deviceType !== "mobile") {
          statsGroup
            .append("text")
            .attr("x", statsX)
            .attr("y", statsY + 50)
            .style("font-size", `${statsFontSize - 1}px`)
            .style("fill", "#6b7280")
            .text(
              `Coverage: ${(
                optimizedData.grid_statistics.antibiotic_coverage * 100
              ).toFixed(1)}%`
            );
        }
      }
    }

    // Cleanup function
    return () => {
      if (svgRef.current && deviceType === "mobile") {
        svgRef.current.removeEventListener("touchstart", handleTouchStart);
        svgRef.current.removeEventListener("touchmove", handleTouchMove);
        svgRef.current.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [
    optimizedData,
    effectiveDimensions,
    showGrid,
    showZones,
    zoomLevel,
    panOffset,
    deviceType,
    shouldShowGrid,
    fontSize,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleBacteriumInteraction,
    bacteriumSize,
    scales,
    shouldShowLegend,
    shouldShowTooltips,
    animationDuration,
    mobileConfig,
  ]);

  // Zoom controls for mobile
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => ({
      ...prev,
      level: Math.min(prev.level * 1.2, 3),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => ({
      ...prev,
      level: Math.max(prev.level / 1.2, 0.5),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel({ level: 1 });
    setPanOffset({ x: 0, y: 0 });
  }, []);

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
    if (!optimizedData) return null;

    const resistanceCounts = optimizedData.bacteria.reduce((acc, b) => {
      acc[b.resistance_status] = (acc[b.resistance_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: optimizedData.bacteria.length,
      sensitive: resistanceCounts.sensitive || 0,
      intermediate: resistanceCounts.intermediate || 0,
      resistant: resistanceCounts.resistant || 0,
      occupancy: (optimizedData.grid_statistics.occupancy_rate * 100).toFixed(
        1
      ),
      antibioticCoverage: (
        optimizedData.grid_statistics.antibiotic_coverage * 100
      ).toFixed(1),
    };
  }, [optimizedData]);

  // Don't render if no data available
  if (!optimizedData) {
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
            <Button size="sm" variant="outline" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={resetZoom}>
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
      <div ref={containerRef} className={`relative ${className}`}>
        <svg
          ref={svgRef}
          width={effectiveDimensions.width}
          height={effectiveDimensions.height}
          className="border border-gray-300 rounded-lg bg-white"
          style={{
            touchAction: deviceType === "mobile" ? "none" : "auto",
            userSelect: "none",
          }}
        />

        {/* Mobile zoom controls */}
        {deviceType === "mobile" && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={zoomIn}
              className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-lg font-bold"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={zoomOut}
              className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-lg font-bold"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              onClick={resetZoom}
              className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-xs font-bold"
              aria-label="Reset zoom"
            >
              ⌂
            </button>
          </div>
        )}

        {/* Mobile instructions */}
        {deviceType === "mobile" && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            Pinch to zoom • Drag to pan
          </div>
        )}
      </div>

      {/* Selected Bacterium Details */}
      {selectedBacterium && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Selected Bacterium</h4>
          {(() => {
            const bacterium = optimizedData.bacteria.find(
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

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default PetriDishVisualization;
