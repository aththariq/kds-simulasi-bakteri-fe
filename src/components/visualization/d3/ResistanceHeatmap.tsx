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

    // Merge configuration with defaults
    const mergedConfig = useMemo(
      () => ({ ...DEFAULT_CONFIG, ...config }),
      [config]
    );

    // Process data for heatmap
    const heatmapData = useMemo(
      () => processHeatmapData(data, mergedConfig.maxGenes),
      [data, mergedConfig.maxGenes]
    );

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

    // Set up responsive dimensions
    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          setDimensions({
            width: Math.max(clientWidth || mergedConfig.width, 400),
            height: Math.max(clientHeight || mergedConfig.height, 300),
          });
        }
      };

      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }, [mergedConfig.width, mergedConfig.height]);

    // D3 scales
    const scales = useMemo(() => {
      const { margin } = mergedConfig;
      const chartWidth = dimensions.width - margin.left - margin.right;
      const chartHeight = dimensions.height - margin.top - margin.bottom;

      const xScale = d3
        .scaleBand()
        .domain(generations.map(String))
        .range([0, chartWidth])
        .padding(0.05);

      const yScale = d3
        .scaleBand()
        .domain(genes)
        .range([0, chartHeight])
        .padding(0.05);

      const colorScale = d3
        .scaleSequential(d3[mergedConfig.colorScheme as keyof typeof d3] as any)
        .domain([0, 1]);

      return { xScale, yScale, colorScale, chartWidth, chartHeight };
    }, [dimensions, generations, genes, mergedConfig]);

    // Render heatmap
    useEffect(() => {
      if (!svgRef.current || !heatmapData.length || loading) return;

      const svg = d3.select(svgRef.current);
      const { margin } = mergedConfig;
      const { xScale, yScale, colorScale } = scales;

      // Clear previous content
      svg.selectAll("*").remove();

      // Create main group
      const mainGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      // Create cells
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
        .style("cursor", "pointer")
        .style("opacity", 0)
        .on("mouseover", function (event, d) {
          d3.select(this).style("opacity", 0.8);

          if (mergedConfig.showTooltips) {
            const tooltipData: HeatmapTooltipData = {
              ...d,
              x: event.pageX,
              y: event.pageY,
            };
            setTooltipData(tooltipData);
            setTooltipVisible(true);
            onCellHover?.(tooltipData);
          }
        })
        .on("mousemove", function (event, d) {
          if (mergedConfig.showTooltips) {
            setTooltipData(prev =>
              prev ? { ...prev, x: event.pageX, y: event.pageY } : null
            );
          }
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1);
          setTooltipVisible(false);
          setTooltipData(null);
          onCellHover?.(null);
        })
        .on("click", function (event, d) {
          const tooltipData: HeatmapTooltipData = {
            ...d,
            x: event.pageX,
            y: event.pageY,
          };
          onCellClick?.(tooltipData);
        });

      // Animate cells in
      cells
        .transition()
        .duration(mergedConfig.animationDuration)
        .style("opacity", 1);

      // X-axis
      mainGroup
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${scales.chartHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

      // Y-axis
      mainGroup.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale));

      // Axis labels
      mainGroup
        .append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", scales.chartWidth / 2)
        .attr("y", scales.chartHeight + margin.bottom - 10)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Generation");

      mainGroup
        .append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -scales.chartHeight / 2)
        .attr("y", -margin.left + 15)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Resistance Gene");

      // Legend
      if (mergedConfig.showLegend) {
        const legendWidth = 20;
        const legendHeight = 200;
        const legendX = scales.chartWidth + 20;
        const legendY = (scales.chartHeight - legendHeight) / 2;

        const legendScale = d3
          .scaleLinear()
          .domain([0, 1])
          .range([legendHeight, 0]);

        const legendAxis = d3
          .axisRight(legendScale)
          .tickFormat(
            (d: d3.NumberValue) => `${(Number(d) * 100).toFixed(0)}%`
          );

        const legendGroup = mainGroup
          .append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${legendX}, ${legendY})`);

        // Create gradient
        const gradient = svg
          .append("defs")
          .append("linearGradient")
          .attr("id", "heatmap-gradient")
          .attr("x1", "0%")
          .attr("y1", "100%")
          .attr("x2", "0%")
          .attr("y2", "0%");

        const stops = d3.range(0, 1.1, 0.1);
        gradient
          .selectAll("stop")
          .data(stops)
          .enter()
          .append("stop")
          .attr("offset", d => `${d * 100}%`)
          .attr("stop-color", d => colorScale(d));

        legendGroup
          .append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#heatmap-gradient)")
          .attr("stroke", "#000")
          .attr("stroke-width", 1);

        legendGroup
          .append("g")
          .attr("transform", `translate(${legendWidth}, 0)`)
          .call(legendAxis);

        legendGroup
          .append("text")
          .attr("text-anchor", "middle")
          .attr(
            "transform",
            `translate(${legendWidth / 2}, ${legendHeight + 35}) rotate(-90)`
          )
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .text("Gene Frequency");
      }
    }, [
      heatmapData,
      dimensions,
      scales,
      mergedConfig,
      loading,
      onCellClick,
      onCellHover,
    ]);

    // Imperative handle for ref methods
    useImperativeHandle(
      ref,
      () => ({
        exportSVG: () => {
          if (!svgRef.current) return "";
          const serializer = new XMLSerializer();
          return serializer.serializeToString(svgRef.current);
        },

        exportPNG: async (scale = 2) => {
          if (!svgRef.current) return "";

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return "";

          canvas.width = dimensions.width * scale;
          canvas.height = dimensions.height * scale;
          ctx.scale(scale, scale);

          const svgData = new XMLSerializer().serializeToString(svgRef.current);
          const img = new Image();

          return new Promise(resolve => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
            };
            img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
          });
        },

        updateData: (newData: ResistanceDataPoint[]) => {
          // This will trigger a re-render via the data prop
        },

        highlightGeneration: (generation: number | null) => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          if (generation === null) {
            svg.selectAll(".heatmap-cell").style("opacity", "1");
          } else {
            svg
              .selectAll(".heatmap-cell")
              .style("opacity", (d: any) =>
                d.generation === generation ? "1" : "0.3"
              );
          }
        },

        highlightGene: (gene: string | null) => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          if (gene === null) {
            svg.selectAll(".heatmap-cell").style("opacity", "1");
          } else {
            svg
              .selectAll(".heatmap-cell")
              .style("opacity", (d: any) => (d.gene === gene ? "1" : "0.3"));
          }
        },

        resetZoom: () => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          svg.selectAll(".heatmap-cell").style("opacity", 1);
        },
      }),
      [dimensions]
    );

    if (error) {
      return (
        <div
          className={`flex items-center justify-center h-64 text-red-500 ${className}`}
        >
          Error: {error}
        </div>
      );
    }

    if (loading) {
      return (
        <div className={`flex items-center justify-center h-64 ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading heatmap...</span>
        </div>
      );
    }

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        />
        <HeatmapTooltip data={tooltipData} visible={tooltipVisible} />
      </div>
    );
  }
);

ResistanceHeatmap.displayName = "ResistanceHeatmap";
