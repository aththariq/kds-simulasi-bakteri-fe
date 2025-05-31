"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as d3 from "d3";
import { ResistanceDataPoint } from "@/lib/resistance-analysis";

// ============================
// Types and Interfaces
// ============================

export interface SpatialDataPoint {
  id: string;
  x: number;
  y: number;
  resistanceFrequency: number;
  totalPopulation: number;
  resistantCount: number;
  generation: number;
  density: number;
  spatialCluster?: string;
  hotspotScore?: number;
}

export interface ChoroplethRegion {
  id: string;
  name: string;
  coordinates: Array<[number, number]>;
  centroid: [number, number];
  area: number;
  resistanceData: {
    frequency: number;
    intensity: number;
    trend: "increasing" | "decreasing" | "stable";
    confidence: number;
  };
}

export interface ChoroplethConfig {
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  projection?: "mercator" | "equirectangular" | "orthographic";
  colorScheme?: string;
  strokeColor?: string;
  strokeWidth?: number;
  showTooltips?: boolean;
  showLegend?: boolean;
  enableZoom?: boolean;
  gridSize?: number;
  interpolationMethod?: "linear" | "cubic" | "nearest";
  animationDuration?: number;
}

export interface ChoroplethTooltipData {
  region: ChoroplethRegion;
  x: number;
  y: number;
}

export interface ResistanceChoroplethMapRef {
  exportSVG: () => string;
  exportPNG: (scale?: number) => Promise<string>;
  updateData: (data: ResistanceDataPoint[]) => void;
  highlightRegion: (regionId: string | null) => void;
  zoomToRegion: (regionId: string) => void;
  resetZoom: () => void;
  setTimeframe: () => void;
}

export interface ResistanceChoroplethMapProps {
  data: ResistanceDataPoint[];
  spatialBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  config?: ChoroplethConfig;
  onRegionClick?: (region: ChoroplethRegion) => void;
  onRegionHover?: (region: ChoroplethRegion | null) => void;
  className?: string;
  loading?: boolean;
  error?: string | null;
}

// ============================
// Default Configuration
// ============================

const DEFAULT_CONFIG: Required<ChoroplethConfig> = {
  width: 800,
  height: 600,
  margin: {
    top: 20,
    right: 120,
    bottom: 50,
    left: 50,
  },
  projection: "mercator",
  colorScheme: "interpolateYlOrRd",
  strokeColor: "#ffffff",
  strokeWidth: 1,
  showTooltips: true,
  showLegend: true,
  enableZoom: true,
  gridSize: 20,
  interpolationMethod: "linear",
  animationDuration: 750,
};

// ============================
// Data Processing Utilities
// ============================

const processSpatialData = (
  data: ResistanceDataPoint[],
  bounds: NonNullable<ResistanceChoroplethMapProps["spatialBounds"]>,
  gridSize: number
): SpatialDataPoint[] => {
  if (!data || data.length === 0) return [];

  // Create spatial grid
  const spatialData: SpatialDataPoint[] = [];
  const cellWidth = (bounds.maxX - bounds.minX) / gridSize;
  const cellHeight = (bounds.maxY - bounds.minY) / gridSize;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const cellX = bounds.minX + i * cellWidth + cellWidth / 2;
      const cellY = bounds.minY + j * cellHeight + cellHeight / 2;

      // Calculate resistance data for this cell across all generations
      const cellData = data.map(point => ({
        ...point,
        distance: Math.sqrt((cellX - cellX) ** 2 + (cellY - cellY) ** 2), // Simplified spatial calculation
      }));

      const avgResistance =
        cellData.reduce((sum, d) => sum + d.resistanceFrequency, 0) /
        cellData.length;
      const avgPopulation =
        cellData.reduce((sum, d) => sum + d.totalPopulation, 0) /
        cellData.length;
      const avgResistantCount =
        cellData.reduce((sum, d) => sum + d.resistantCount, 0) /
        cellData.length;

      spatialData.push({
        id: `cell-${i}-${j}`,
        x: cellX,
        y: cellY,
        resistanceFrequency: avgResistance,
        totalPopulation: avgPopulation,
        resistantCount: avgResistantCount,
        generation: data[data.length - 1]?.generation || 0,
        density: avgPopulation / (cellWidth * cellHeight),
      });
    }
  }

  return spatialData;
};

const createChoroplethRegions = (
  spatialData: SpatialDataPoint[],
  bounds: NonNullable<ResistanceChoroplethMapProps["spatialBounds"]>,
  gridSize: number
): ChoroplethRegion[] => {
  const cellWidth = (bounds.maxX - bounds.minX) / gridSize;
  const cellHeight = (bounds.maxY - bounds.minY) / gridSize;

  return spatialData.map((point, index) => {
    const i = Math.floor(index / gridSize);
    const j = index % gridSize;

    const x = bounds.minX + i * cellWidth;
    const y = bounds.minY + j * cellHeight;

    const coordinates: Array<[number, number]> = [
      [x, y],
      [x + cellWidth, y],
      [x + cellWidth, y + cellHeight],
      [x, y + cellHeight],
      [x, y], // Close the polygon
    ];

    // Calculate trend (simplified)
    const trend: "increasing" | "decreasing" | "stable" =
      point.resistanceFrequency > 0.5
        ? "increasing"
        : point.resistanceFrequency < 0.2
        ? "decreasing"
        : "stable";

    return {
      id: point.id,
      name: `Region ${point.id}`,
      coordinates,
      centroid: [point.x, point.y] as [number, number],
      area: cellWidth * cellHeight,
      resistanceData: {
        frequency: point.resistanceFrequency,
        intensity: point.resistanceFrequency * point.density,
        trend,
        confidence: Math.min(point.totalPopulation / 1000, 1), // Confidence based on sample size
      },
    };
  });
};

// ============================
// Tooltip Component
// ============================

const ChoroplethTooltip: React.FC<{
  data: ChoroplethTooltipData | null;
  visible: boolean;
}> = ({ data, visible }) => {
  if (!visible || !data) return null;

  const { region } = data;

  return (
    <div
      className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm pointer-events-none max-w-xs"
      style={{
        left: data.x + 10,
        top: data.y - 10,
        transform: "translateY(-50%)",
      }}
    >
      <div className="font-semibold text-gray-800 mb-2">{region.name}</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Resistance:</span>
          <span className="font-medium">
            {(region.resistanceData.frequency * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Intensity:</span>
          <span className="font-medium">
            {region.resistanceData.intensity.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trend:</span>
          <span
            className={`font-medium ${
              region.resistanceData.trend === "increasing"
                ? "text-red-600"
                : region.resistanceData.trend === "decreasing"
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {region.resistanceData.trend}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Confidence:</span>
          <span className="font-medium">
            {(region.resistanceData.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Area:</span>
          <span className="font-medium">{region.area.toFixed(1)} units²</span>
        </div>
      </div>
    </div>
  );
};

// ============================
// Main Component
// ============================

export const ResistanceChoroplethMap = forwardRef<
  ResistanceChoroplethMapRef,
  ResistanceChoroplethMapProps
>(
  (
    {
      data,
      spatialBounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      config = {},
      onRegionClick,
      onRegionHover,
      className,
      loading,
      error,
    },
    ref
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltipData, setTooltipData] =
      useState<ChoroplethTooltipData | null>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Merge configuration with defaults
    const mergedConfig = useMemo(
      () => ({ ...DEFAULT_CONFIG, ...config }),
      [config]
    );

    // Process spatial data
    const spatialData = useMemo(
      () => processSpatialData(data, spatialBounds, mergedConfig.gridSize),
      [data, spatialBounds, mergedConfig.gridSize]
    );

    // Create choropleth regions
    const regions = useMemo(
      () =>
        createChoroplethRegions(
          spatialData,
          spatialBounds,
          mergedConfig.gridSize
        ),
      [spatialData, spatialBounds, mergedConfig.gridSize]
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

    // D3 scales and projection
    const { colorScale, pathGenerator } = useMemo(() => {
      const { margin } = mergedConfig;
      const chartWidth = dimensions.width - margin.left - margin.right;
      const chartHeight = dimensions.height - margin.top - margin.bottom;

      // Set up projection
      const proj = d3.geoMercator().fitSize([chartWidth, chartHeight], {
        type: "FeatureCollection",
        features: regions.map(region => ({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [region.coordinates],
          },
          properties: { id: region.id },
        })),
      } as GeoJSON.FeatureCollection);

      // Color scale
      const maxFrequency = Math.max(
        ...regions.map(r => r.resistanceData.frequency)
      );
      const colorScale = d3
        .scaleSequential(
          d3[
            mergedConfig.colorScheme as keyof typeof d3
          ] as d3.ScaleSequential<string>
        )
        .domain([0, maxFrequency]);

      // Path generator
      const pathGen = d3.geoPath().projection(proj);

      return { colorScale, pathGenerator: pathGen };
    }, [dimensions, regions, mergedConfig]);

    // Render choropleth map
    useEffect(() => {
      if (!svgRef.current || !regions.length || loading) return;

      const svg = d3.select(svgRef.current);
      const { margin } = mergedConfig;

      // Clear previous content
      svg.selectAll("*").remove();

      // Set up zoom behavior
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 8])
        .on("zoom", event => {
          mainGroup.attr("transform", event.transform);
        });

      if (mergedConfig.enableZoom) {
        svg.call(zoom);
      }

      // Create main group
      const mainGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      // Create regions
      const regionElements = mainGroup
        .selectAll(".choropleth-region")
        .data(regions)
        .enter()
        .append("path")
        .attr("class", "choropleth-region")
        .attr("d", d => {
          const feature: GeoJSON.Feature = {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [d.coordinates],
            },
            properties: { id: d.id },
          };
          return pathGenerator(feature);
        })
        .attr("fill", d => colorScale(d.resistanceData.frequency))
        .attr("stroke", mergedConfig.strokeColor)
        .attr("stroke-width", mergedConfig.strokeWidth)
        .style("cursor", "pointer")
        .style("opacity", 0)
        .on("mouseover", function (event, d) {
          d3.select(this).attr("stroke-width", mergedConfig.strokeWidth * 2);

          if (mergedConfig.showTooltips) {
            setTooltipData({
              region: d,
              x: event.pageX,
              y: event.pageY,
            });
            setTooltipVisible(true);
            onRegionHover?.(d);
          }
        })
        .on("mousemove", function (event) {
          if (mergedConfig.showTooltips) {
            setTooltipData(prev =>
              prev ? { ...prev, x: event.pageX, y: event.pageY } : null
            );
          }
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke-width", mergedConfig.strokeWidth);
          setTooltipVisible(false);
          setTooltipData(null);
          onRegionHover?.(null);
        })
        .on("click", function (event, d) {
          onRegionClick?.(d);
        });

      // Animate regions in
      regionElements
        .transition()
        .duration(mergedConfig.animationDuration)
        .style("opacity", 1);

      // Legend
      if (mergedConfig.showLegend) {
        const legendHeight = 200;
        const legendX = dimensions.width - margin.right + 20;
        const legendY =
          margin.top +
          (dimensions.height - margin.top - margin.bottom - legendHeight) / 2;

        const legendScale = d3
          .scaleLinear()
          .domain(colorScale.domain())
          .range([legendHeight, 0]);

        const legendAxis = d3
          .axisRight(legendScale)
          .tickFormat(
            (d: d3.NumberValue) => `${(Number(d) * 100).toFixed(0)}%`
          );

        const legendGroup = svg
          .append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${legendX}, ${legendY})`);

        // Create gradient
        const gradient = svg
          .append("defs")
          .append("linearGradient")
          .attr("id", "choropleth-gradient")
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

        const legendWidth = 20;
        legendGroup
          .append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#choropleth-gradient)")
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
          .text("Resistance Frequency");
      }
    }, [
      regions,
      dimensions,
      mergedConfig,
      colorScale,
      pathGenerator,
      loading,
      onRegionClick,
      onRegionHover,
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

        updateData: () => {
          // This will trigger a re-render via the data prop
        },

        highlightRegion: (regionId: string | null) => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          svg
            .selectAll(".choropleth-region")
            .style("opacity", function (this: any, d: any) {
              return regionId === null ? 1 : d.id === regionId ? 1 : 0.3;
            });
        },

        zoomToRegion: (regionId: string) => {
          const region = regions.find(r => r.id === regionId);
          if (!region || !svgRef.current) return;

          const svg = d3.select(svgRef.current);
          const [x, y] = region.centroid;

          svg
            .transition()
            .duration(750)
            .call(
              d3.zoom<SVGSVGElement, unknown>().transform,
              d3.zoomIdentity
                .translate(
                  dimensions.width / 2 - x * 2,
                  dimensions.height / 2 - y * 2
                )
                .scale(2)
            );
        },

        resetZoom: () => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          svg
            .transition()
            .duration(750)
            .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
        },

        setTimeframe: () => {
          // Filter data based on generation and re-render
        },
      }),
      [dimensions, regions]
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
          <span className="ml-2">Loading choropleth map...</span>
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
        <ChoroplethTooltip data={tooltipData} visible={tooltipVisible} />
      </div>
    );
  }
);

ResistanceChoroplethMap.displayName = "ResistanceChoroplethMap";
