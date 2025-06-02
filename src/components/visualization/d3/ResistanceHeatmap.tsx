"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as d3 from "d3";
import { ResistanceDataPoint } from "@/lib/resistance-analysis";
import { useMobileVisualization } from "../hooks/useMobileVisualization";

// ============================
// Utility Functions
// ============================

// Simple debounce function for performance optimization
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ============================
// Types and Interfaces
// ============================

export interface HeatmapData {
  generation: number;
  gene: string;
  frequency: number;
  normalizedFrequency: number;
  hgtEvents: number;
  mutationEvents: number;
}

export interface HeatmapConfig {
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colorScheme?: string;
  cellStroke?: string;
  cellStrokeWidth?: number;
  showTooltips?: boolean;
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right";
  animationDuration?: number;
  maxGenes?: number;
  cellMinSize?: number;
}

export interface HeatmapTooltipData {
  generation: number;
  gene: string;
  frequency: number;
  hgtEvents: number;
  mutationEvents: number;
  x: number;
  y: number;
}

export interface ResistanceHeatmapRef {
  exportSVG: () => string;
  exportPNG: (scale?: number) => Promise<string>;
  updateData: (data: ResistanceDataPoint[]) => void;
  highlightGeneration: (generation: number | null) => void;
  highlightGene: (gene: string | null) => void;
  resetZoom: () => void;
}

export interface ResistanceHeatmapProps {
  data: ResistanceDataPoint[];
  config?: HeatmapConfig;
  onCellClick?: (data: HeatmapTooltipData) => void;
  onCellHover?: (data: HeatmapTooltipData | null) => void;
  className?: string;
  loading?: boolean;
  error?: string | null;
}

// ============================
// Default Configuration
// ============================

const DEFAULT_CONFIG: Required<HeatmapConfig> = {
  width: 800,
  height: 600,
  margin: {
    top: 60,
    right: 120,
    bottom: 100,
    left: 100,
  },
  colorScheme: "interpolateOrRd",
  cellStroke: "#ffffff",
  cellStrokeWidth: 1,
  showTooltips: true,
  showLegend: true,
  legendPosition: "right",
  animationDuration: 750,
  maxGenes: 20,
  cellMinSize: 20,
};

// ============================
// Data Processing Utilities
// ============================

const processHeatmapData = (
  data: ResistanceDataPoint[],
  maxGenes: number
): HeatmapData[] => {
  if (!data || data.length === 0) return [];

  // Extract all unique genes and their total frequencies
  const geneFrequencies = new Map<string, number>();
  data.forEach(point => {
    Object.entries(point.geneFrequencies).forEach(([gene, freq]) => {
      geneFrequencies.set(gene, (geneFrequencies.get(gene) || 0) + freq);
    });
  });

  // Sort genes by total frequency and take top N
  const topGenes = Array.from(geneFrequencies.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxGenes)
    .map(([gene]) => gene);

  // Create heatmap data structure
  const heatmapData: HeatmapData[] = [];
  const allFrequencies: number[] = [];

  data.forEach(point => {
    topGenes.forEach(gene => {
      const frequency = point.geneFrequencies[gene] || 0;
      allFrequencies.push(frequency);

      heatmapData.push({
        generation: point.generation,
        gene,
        frequency,
        normalizedFrequency: frequency, // Will be normalized later
        hgtEvents: point.hgtEvents,
        mutationEvents: point.mutationEvents,
      });
    });
  });

  // Normalize frequencies to 0-1 range
  const maxFreq = Math.max(...allFrequencies);
  const minFreq = Math.min(...allFrequencies);
  const range = maxFreq - minFreq;

  if (range > 0) {
    heatmapData.forEach(d => {
      d.normalizedFrequency = (d.frequency - minFreq) / range;
    });
  }

  return heatmapData;
};

// ============================
// Tooltip Component
// ============================

const HeatmapTooltip: React.FC<{
  data: HeatmapTooltipData | null;
  visible: boolean;
}> = ({ data, visible }) => {
  if (!visible || !data) return null;

  return (
    <div
      className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm pointer-events-none"
      style={{
        left: data.x + 10,
        top: data.y - 10,
        transform: "translateY(-100%)",
      }}
    >
      <div className="font-semibold text-gray-800 mb-2">
        {data.gene} - Generation {data.generation}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Frequency:</span>
          <span className="font-medium">
            {(data.frequency * 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">HGT Events:</span>
          <span className="font-medium">{data.hgtEvents}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Mutations:</span>
          <span className="font-medium">{data.mutationEvents}</span>
        </div>
      </div>
    </div>
  );
};

// ============================
// Main Component
// ============================

export const ResistanceHeatmap = forwardRef<
  ResistanceHeatmapRef,
  ResistanceHeatmapProps
>(
  (
    { data, config = {}, onCellClick, onCellHover, className, loading, error },
    ref
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltipData, setTooltipData] = useState<HeatmapTooltipData | null>(
      null
    );
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Mobile visualization optimization
    const {
      deviceType,
      dimensions: mobileDimensions,
      config: mobileConfig,
      touchHandlers,
      optimizeDataForMobile,
      shouldShowLegend,
      shouldShowGrid,
      shouldShowTooltips,
      animationDuration,
      fontSize,
      performanceSettings,
      simplifiedSettings,
    } = useMobileVisualization("heatmap", {
      enableTouchGestures: true,
      enableSimplifiedView: true,
      performanceMode: true,
    });

    // Merge configuration with defaults and mobile optimizations
    const mergedConfig = useMemo(() => {
      const baseConfig = { ...DEFAULT_CONFIG, ...config };

      // Apply mobile-specific overrides
      if (deviceType === "mobile") {
        return {
          ...baseConfig,
          width: mobileDimensions.width,
          height: mobileDimensions.height,
          margin: mobileDimensions.margin,
          showLegend: shouldShowLegend(),
          showTooltips: shouldShowTooltips(),
          animationDuration: animationDuration,
          // Apply chart-specific mobile config overrides
          ...mobileConfig,
          // Reduce complexity for mobile
          maxGenes: Math.min(
            baseConfig.maxGenes || 20,
            simplifiedSettings.maxCategories
          ),
          // Enhance touch targets with chart-specific settings
          cellStrokeWidth: baseConfig.cellStrokeWidth,
          cellMinSize: 20, // Minimum touch target size
        };
      }

      return baseConfig;
    }, [
      config,
      deviceType,
      mobileDimensions,
      shouldShowLegend,
      shouldShowTooltips,
      animationDuration,
      simplifiedSettings.maxCategories,
      mobileConfig,
    ]);

    // Process data for heatmap with mobile optimization
    const heatmapData = useMemo(() => {
      const processedData = processHeatmapData(data, mergedConfig.maxGenes);
      return optimizeDataForMobile(processedData);
    }, [data, mergedConfig.maxGenes, optimizeDataForMobile]);

    // Extract unique generations and genes for scales
    const generations = useMemo(
      () =>
        [...new Set(heatmapData.map(d => d.generation))].sort((a, b) => a - b),
      [heatmapData]
    );

    const genes = useMemo(
      () => [...new Set(heatmapData.map(d => d.gene))],
      [heatmapData]
    );

    // Set up responsive dimensions with mobile optimization
    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;

          // Use mobile dimensions if available, otherwise fallback to container
          const width =
            deviceType === "mobile"
              ? mobileDimensions.width
              : Math.max(clientWidth || mergedConfig.width, 400);
          const height =
            deviceType === "mobile"
              ? mobileDimensions.height
              : Math.max(clientHeight || mergedConfig.height, 300);

          setDimensions({ width, height });
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
      mergedConfig.width,
      mergedConfig.height,
      deviceType,
      mobileDimensions,
      performanceSettings.debounceDelay,
    ]);

    // D3 scales with mobile-optimized sizing
    const scales = useMemo(() => {
      const { margin } = mergedConfig;
      const chartWidth = dimensions.width - margin.left - margin.right;
      const chartHeight = dimensions.height - margin.top - margin.bottom;

      // Adjust cell sizes for touch interaction on mobile
      const minCellSize = mergedConfig.cellMinSize || 20; // Minimum 20px for touch targets
      const maxCellWidth = chartWidth / generations.length;
      const maxCellHeight = chartHeight / genes.length;

      const cellWidth = Math.max(minCellSize, maxCellWidth);
      const cellHeight = Math.max(minCellSize, maxCellHeight);

      const xScale = d3
        .scaleBand()
        .domain(generations.map(String))
        .range([0, Math.min(chartWidth, cellWidth * generations.length)])
        .padding(0.05);

      const yScale = d3
        .scaleBand()
        .domain(genes)
        .range([0, Math.min(chartHeight, cellHeight * genes.length)])
        .padding(0.05);

      const colorScale = d3
        .scaleSequential(d3[mergedConfig.colorScheme as keyof typeof d3] as any)
        .domain([0, 1]);

      return { xScale, yScale, colorScale, chartWidth, chartHeight };
    }, [dimensions, generations, genes, mergedConfig]);

    // Native DOM touch handlers for D3 SVG elements
    const handleNativeTouchStart = useCallback(
      (event: TouchEvent) => {
        if (deviceType !== "mobile") return;
        event.preventDefault();
        // Delegate to mobile hook's touch handlers for standardized behavior
        if (touchHandlers.onTouchStart) {
          touchHandlers.onTouchStart(event as unknown as React.TouchEvent);
        }
      },
      [deviceType, touchHandlers]
    );

    const handleNativeTouchMove = useCallback(
      (event: TouchEvent) => {
        if (deviceType !== "mobile") return;
        event.preventDefault();
        // Delegate to mobile hook's touch handlers for standardized behavior
        if (touchHandlers.onTouchMove) {
          touchHandlers.onTouchMove(event as unknown as React.TouchEvent);
        }
      },
      [deviceType, touchHandlers]
    );

    const handleNativeTouchEnd = useCallback(
      (event: TouchEvent) => {
        if (deviceType !== "mobile") return;
        event.preventDefault();
        // Delegate to mobile hook's touch handlers for standardized behavior
        if (touchHandlers.onTouchEnd) {
          touchHandlers.onTouchEnd();
        }
      },
      [deviceType, touchHandlers]
    );

    // Render heatmap with mobile optimizations
    useEffect(() => {
      if (!svgRef.current || !heatmapData.length || loading) return;

      const svg = d3.select(svgRef.current);
      const { margin } = mergedConfig;
      const { xScale, yScale, colorScale } = scales;

      // Clear previous content
      svg.selectAll("*").remove();

      // Add touch event listeners for mobile
      if (deviceType === "mobile") {
        svg.node()?.addEventListener("touchstart", handleNativeTouchStart);
        svg.node()?.addEventListener("touchmove", handleNativeTouchMove);
        svg.node()?.addEventListener("touchend", handleNativeTouchEnd);
      }

      // Main group
      const mainGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      // Heatmap cells with touch-optimized interaction
      const cells = mainGroup
        .selectAll(".heatmap-cell")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => xScale(String(d.generation)) || 0)
        .attr("y", d => yScale(d.gene) || 0)
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.normalizedFrequency))
        .attr("stroke", mergedConfig.cellStroke)
        .attr("stroke-width", mergedConfig.cellStrokeWidth)
        .style("cursor", deviceType === "mobile" ? "default" : "pointer")
        .on("click", function (event, d) {
          if (onCellClick) {
            const rect = this.getBoundingClientRect();
            onCellClick({
              ...d,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }
        });

      // Enhanced touch interaction for mobile
      if (deviceType === "mobile") {
        cells.on("touchstart", function (event, d) {
          event.preventDefault();
          const touch = event.touches[0];
          if (onCellClick) {
            onCellClick({
              ...d,
              x: touch.clientX,
              y: touch.clientY,
            });
          }
        });
      }

      // Tooltip interaction (simplified for mobile)
      if (mergedConfig.showTooltips) {
        cells
          .on("mouseover", function (event, d) {
            if (deviceType !== "mobile") {
              // Disable hover on mobile
              const rect = this.getBoundingClientRect();
              setTooltipData({
                ...d,
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
              setTooltipVisible(true);
              onCellHover?.(tooltipData);
            }
          })
          .on("mouseout", function () {
            if (deviceType !== "mobile") {
              setTooltipVisible(false);
              onCellHover?.(null);
            }
          });
      }

      // Axes with mobile-optimized font sizes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);

      // Add grid lines if shouldShowGrid is enabled
      if (shouldShowGrid()) {
        // Vertical grid lines
        mainGroup
          .selectAll(".grid-line-vertical")
          .data(generations)
          .enter()
          .append("line")
          .attr("class", "grid-line-vertical")
          .attr("x1", d => (xScale(String(d)) || 0) + xScale.bandwidth() / 2)
          .attr("x2", d => (xScale(String(d)) || 0) + xScale.bandwidth() / 2)
          .attr("y1", 0)
          .attr("y2", scales.chartHeight)
          .attr("stroke", "#e5e7eb")
          .attr("stroke-width", 0.5)
          .attr("opacity", 0.5);

        // Horizontal grid lines
        mainGroup
          .selectAll(".grid-line-horizontal")
          .data(genes)
          .enter()
          .append("line")
          .attr("class", "grid-line-horizontal")
          .attr("x1", 0)
          .attr("x2", scales.chartWidth)
          .attr("y1", d => (yScale(d) || 0) + yScale.bandwidth() / 2)
          .attr("y2", d => (yScale(d) || 0) + yScale.bandwidth() / 2)
          .attr("stroke", "#e5e7eb")
          .attr("stroke-width", 0.5)
          .attr("opacity", 0.5);
      }

      // X-axis
      mainGroup
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${scales.chartHeight})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", `${fontSize}px`)
        .style("text-anchor", deviceType === "mobile" ? "middle" : "end")
        .attr("dx", deviceType === "mobile" ? "0" : "-0.8em")
        .attr("dy", deviceType === "mobile" ? "1em" : "0.15em")
        .attr(
          "transform",
          deviceType === "mobile" ? "rotate(0)" : "rotate(-45)"
        );

      // Y-axis
      mainGroup
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", `${fontSize}px`);

      // Axis labels (hide on mobile if space is limited)
      if (deviceType !== "mobile" || dimensions.width > 400) {
        mainGroup
          .append("text")
          .attr("class", "x-axis-label")
          .attr("text-anchor", "middle")
          .attr("x", scales.chartWidth / 2)
          .attr("y", scales.chartHeight + margin.bottom - 5)
          .style("font-size", `${fontSize}px`)
          .style("font-weight", "bold")
          .text("Generation");

        mainGroup
          .append("text")
          .attr("class", "y-axis-label")
          .attr("text-anchor", "middle")
          .attr("transform", "rotate(-90)")
          .attr("x", -scales.chartHeight / 2)
          .attr("y", -margin.left + 15)
          .style("font-size", `${fontSize}px`)
          .style("font-weight", "bold")
          .text("Resistance Gene");
      }

      // Legend (conditionally shown based on mobile settings)
      if (mergedConfig.showLegend && shouldShowLegend()) {
        const legendWidth = deviceType === "mobile" ? 15 : 20;
        const legendHeight = deviceType === "mobile" ? 120 : 200;
        const legendX = scales.chartWidth + (deviceType === "mobile" ? 10 : 20);
        const legendY = (scales.chartHeight - legendHeight) / 2;

        const legendScale = d3
          .scaleLinear()
          .domain([0, 1])
          .range([legendHeight, 0]);

        const legendAxis = d3
          .axisRight(legendScale)
          .tickFormat((d: d3.NumberValue) => `${(Number(d) * 100).toFixed(0)}%`)
          .ticks(deviceType === "mobile" ? 3 : 5); // Fewer ticks on mobile

        const legendGroup = mainGroup
          .append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${legendX}, ${legendY})`);

        // Create gradient for legend
        const gradient = svg
          .append("defs")
          .append("linearGradient")
          .attr("id", "legend-gradient")
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", 0)
          .attr("y1", legendHeight)
          .attr("x2", 0)
          .attr("y2", 0);

        const colorStops = d3.range(0, 1.1, 0.1);
        gradient
          .selectAll("stop")
          .data(colorStops)
          .enter()
          .append("stop")
          .attr("offset", d => `${d * 100}%`)
          .attr("stop-color", d => colorScale(d));

        // Legend rectangle
        legendGroup
          .append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#legend-gradient)")
          .attr("stroke", "#333")
          .attr("stroke-width", 1);

        // Legend axis
        legendGroup
          .append("g")
          .attr("class", "legend-axis")
          .attr("transform", `translate(${legendWidth}, 0)`)
          .call(legendAxis)
          .selectAll("text")
          .style("font-size", `${fontSize}px`);

        // Legend title
        legendGroup
          .append("text")
          .attr("class", "legend-title")
          .attr("text-anchor", "middle")
          .attr("x", legendWidth / 2)
          .attr("y", -10)
          .style("font-size", `${fontSize}px`)
          .style("font-weight", "bold")
          .text("Frequency");
      }

      // Cleanup function
      return () => {
        if (deviceType === "mobile" && svg.node()) {
          svg.node()?.removeEventListener("touchstart", handleNativeTouchStart);
          svg.node()?.removeEventListener("touchmove", handleNativeTouchMove);
          svg.node()?.removeEventListener("touchend", handleNativeTouchEnd);
        }
      };
    }, [
      heatmapData,
      scales,
      mergedConfig,
      deviceType,
      handleNativeTouchStart,
      handleNativeTouchMove,
      handleNativeTouchEnd,
      onCellClick,
      onCellHover,
      tooltipData,
      fontSize,
      shouldShowGrid,
      shouldShowLegend,
      loading,
    ]);

    // Imperative handle for ref methods
    useImperativeHandle(ref, () => ({
      exportSVG: () => {
        if (!svgRef.current) return "";
        return new XMLSerializer().serializeToString(svgRef.current);
      },
      exportPNG: async (scale = 2) => {
        if (!svgRef.current) return "";

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const img = new Image();

        return new Promise(resolve => {
          img.onload = () => {
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          img.src = "data:image/svg+xml;base64," + btoa(svgData);
        });
      },
      updateData: (newData: ResistanceDataPoint[]) => {
        // This would trigger a re-render with new data
        // Implementation depends on parent component state management
      },
      highlightGeneration: (generation: number | null) => {
        // Implementation for highlighting specific generation
      },
      highlightGene: (gene: string | null) => {
        // Implementation for highlighting specific gene
      },
      resetZoom: () => {
        // Implementation for resetting zoom/pan state
      },
    }));

    if (loading) {
      return (
        <div className={`flex items-center justify-center h-64 ${className}`}>
          <div className="text-gray-500">Loading heatmap...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`flex items-center justify-center h-64 ${className}`}>
          <div className="text-red-500">Error: {error}</div>
        </div>
      );
    }

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto"
        />
        <HeatmapTooltip data={tooltipData} visible={tooltipVisible} />
      </div>
    );
  }
);

ResistanceHeatmap.displayName = "ResistanceHeatmap";

export default ResistanceHeatmap;
