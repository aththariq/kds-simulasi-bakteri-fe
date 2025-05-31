"use client";

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as d3 from "d3";
import {
  SpatialCluster,
  HotspotAnalysis,
  InterpolationResult,
  SpatialPoint,
} from "@/lib/spatial-clustering";

export interface SpatialClusteringOverlayProps {
  clusters?: SpatialCluster[];
  hotspots?: HotspotAnalysis;
  interpolation?: InterpolationResult;
  spatialPoints?: SpatialPoint[];
  width?: number;
  height?: number;
  showClusters?: boolean;
  showHotspots?: boolean;
  showInterpolation?: boolean;
  showPoints?: boolean;
  colorScheme?: string[];
  onPointClick?: (point: SpatialPoint) => void;
  onClusterClick?: (cluster: SpatialCluster) => void;
  className?: string;
}

export interface SpatialClusteringOverlayRef {
  exportSVG: () => string;
  exportPNG: () => string;
  updateData: (data: Partial<SpatialClusteringOverlayProps>) => void;
}

export const SpatialClusteringOverlay = forwardRef<
  SpatialClusteringOverlayRef,
  SpatialClusteringOverlayProps
>(
  (
    {
      clusters = [],
      hotspots,
      interpolation,
      spatialPoints = [],
      width = 800,
      height = 600,
      showClusters = true,
      showHotspots = true,
      showInterpolation = false,
      showPoints = true,
      colorScheme = [
        "#1f77b4",
        "#ff7f0e",
        "#2ca02c",
        "#d62728",
        "#9467bd",
        "#8c564b",
      ],
      onPointClick,
      onClusterClick,
      className = "",
    },
    ref
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate bounds from all data
    const calculateBounds = () => {
      const allPoints = [
        ...spatialPoints,
        ...clusters.flatMap(c => c.points),
        ...(hotspots ? [...hotspots.hotspots, ...hotspots.coldspots] : []),
      ];

      if (allPoints.length === 0) {
        return { minX: 0, maxX: width, minY: 0, maxY: height };
      }

      return {
        minX: Math.min(...allPoints.map(p => p.x)),
        maxX: Math.max(...allPoints.map(p => p.x)),
        minY: Math.min(...allPoints.map(p => p.y)),
        maxY: Math.max(...allPoints.map(p => p.y)),
      };
    };

    const bounds = calculateBounds();
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([bounds.minX, bounds.maxX])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([bounds.minY, bounds.maxY])
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal(colorScheme);

    useImperativeHandle(ref, () => ({
      exportSVG: () => {
        const svgElement = svgRef.current;
        if (!svgElement) return "";

        const serializer = new XMLSerializer();
        return serializer.serializeToString(svgElement);
      },

      exportPNG: () => {
        const svgElement = svgRef.current;
        if (!svgElement) return "";

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        canvas.width = width;
        canvas.height = height;

        const data = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        const svgBlob = new Blob([data], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
        };
        img.src = url;

        return canvas.toDataURL("image/png");
      },

      updateData: newData => {
        // This would trigger a re-render with new data
        // Implementation depends on parent component state management
      },
    }));

    useEffect(() => {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Check if SVG element exists
      if (!svgRef.current) return;

      // Create main group
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Add interpolation surface if enabled
      if (showInterpolation && interpolation) {
        renderInterpolationSurface(g, interpolation);
      }

      // Add cluster boundaries if enabled
      if (showClusters && clusters.length > 0) {
        renderClusters(g, clusters);
      }

      // Add hotspot indicators if enabled
      if (showHotspots && hotspots) {
        renderHotspots(g, hotspots);
      }

      // Add individual points if enabled
      if (showPoints && spatialPoints.length > 0) {
        renderPoints(g, spatialPoints);
      }

      // Add axes
      renderAxes(g);

      // Add legend - cast to proper type
      renderLegend(
        svg as d3.Selection<SVGSVGElement, unknown, null, undefined>
      );
    }, [
      clusters,
      hotspots,
      interpolation,
      spatialPoints,
      showClusters,
      showHotspots,
      showInterpolation,
      showPoints,
    ]);

    const renderInterpolationSurface = (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      interp: InterpolationResult
    ) => {
      // Create contour plot from interpolation grid
      const contourGroup = g.append("g").attr("class", "interpolation-surface");

      // Create contour data for D3 contour plot
      const gridData = interp.gridPoints;
      if (gridData.length === 0) return;

      // Simple contour rendering using grid points
      const contourColor = d3
        .scaleSequential(d3.interpolateViridis)
        .domain(
          d3.extent(gridData, d => d.interpolatedValue) as [number, number]
        );

      contourGroup
        .selectAll(".grid-cell")
        .data(gridData)
        .enter()
        .append("rect")
        .attr("class", "grid-cell")
        .attr("x", d => xScale(d.x) - 2)
        .attr("y", d => yScale(d.y) - 2)
        .attr("width", 4)
        .attr("height", 4)
        .attr("fill", d => contourColor(d.interpolatedValue))
        .attr("opacity", d => d.confidence * 0.6);
    };

    const renderClusters = (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      clusterData: SpatialCluster[]
    ) => {
      const clusterGroup = g.append("g").attr("class", "clusters");

      clusterData.forEach((cluster, index) => {
        if (cluster.noise) return; // Skip noise cluster

        const clusterG = clusterGroup
          .append("g")
          .attr("class", `cluster-${cluster.id}`)
          .style("cursor", "pointer")
          .on("click", () => {
            onClusterClick?.(cluster);
          });

        // Calculate cluster boundary (convex hull)
        const hull = d3.polygonHull(
          cluster.points.map(
            p => [xScale(p.x), yScale(p.y)] as [number, number]
          )
        );

        if (hull) {
          // Draw cluster boundary
          clusterG
            .append("path")
            .datum(hull)
            .attr("class", "cluster-boundary")
            .attr("d", d3.line())
            .attr("fill", colorScale(index.toString()))
            .attr("fill-opacity", 0.2)
            .attr("stroke", colorScale(index.toString()))
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");
        }

        // Draw cluster centroid
        clusterG
          .append("circle")
          .attr("class", "cluster-centroid")
          .attr("cx", xScale(cluster.centroid.x))
          .attr("cy", yScale(cluster.centroid.y))
          .attr("r", 6)
          .attr("fill", colorScale(index.toString()))
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);

        // Add cluster label
        clusterG
          .append("text")
          .attr("class", "cluster-label")
          .attr("x", xScale(cluster.centroid.x))
          .attr("y", yScale(cluster.centroid.y) - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .attr("fill", "#333")
          .text(`C${cluster.id}`);
      });
    };

    const renderHotspots = (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      hotspotData: HotspotAnalysis
    ) => {
      const hotspotGroup = g.append("g").attr("class", "hotspots");

      // Render hotspots
      hotspotGroup
        .selectAll(".hotspot")
        .data(hotspotData.hotspots)
        .enter()
        .append("circle")
        .attr("class", "hotspot")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 8)
        .attr("fill", "#ff4444")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .append("title")
        .text(
          d =>
            `Hotspot at (${d.x.toFixed(2)}, ${d.y.toFixed(
              2
            )})\nValue: ${d.value.toFixed(2)}`
        );

      // Render coldspots
      hotspotGroup
        .selectAll(".coldspot")
        .data(hotspotData.coldspots)
        .enter()
        .append("circle")
        .attr("class", "coldspot")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 6)
        .attr("fill", "#4444ff")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .append("title")
        .text(
          d =>
            `Coldspot at (${d.x.toFixed(2)}, ${d.y.toFixed(
              2
            )})\nValue: ${d.value.toFixed(2)}`
        );
    };

    const renderPoints = (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      pointData: SpatialPoint[]
    ) => {
      const pointGroup = g.append("g").attr("class", "spatial-points");

      pointGroup
        .selectAll(".spatial-point")
        .data(pointData)
        .enter()
        .append("circle")
        .attr("class", "spatial-point")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 3)
        .attr("fill", "#666")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          onPointClick?.(d);
        })
        .append("title")
        .text(
          d =>
            `Point ${d.id || "unknown"}\nPosition: (${d.x.toFixed(
              2
            )}, ${d.y.toFixed(2)})\nValue: ${d.value.toFixed(2)}`
        );
    };

    const renderAxes = (
      g: d3.Selection<SVGGElement, unknown, null, undefined>
    ) => {
      // X axis
      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

      // Y axis
      g.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale));

      // Axis labels
      g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 35)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("X Coordinate");

      g.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Y Coordinate");
    };

    const renderLegend = (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
    ) => {
      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, 20)`);

      const legendItems = [
        { color: "#666", label: "Data Points", shape: "circle" },
        { color: "#ff4444", label: "Hotspots", shape: "circle" },
        { color: "#4444ff", label: "Coldspots", shape: "circle" },
        { color: colorScheme[0], label: "Clusters", shape: "square" },
      ];

      legendItems.forEach((item, i) => {
        const legendItem = legend
          .append("g")
          .attr("transform", `translate(0, ${i * 20})`);

        if (item.shape === "circle") {
          legendItem
            .append("circle")
            .attr("cx", 8)
            .attr("cy", 8)
            .attr("r", 4)
            .attr("fill", item.color);
        } else {
          legendItem
            .append("rect")
            .attr("x", 4)
            .attr("y", 4)
            .attr("width", 8)
            .attr("height", 8)
            .attr("fill", item.color)
            .attr("opacity", 0.3);
        }

        legendItem
          .append("text")
          .attr("x", 20)
          .attr("y", 8)
          .attr("dy", "0.35em")
          .attr("font-size", "12px")
          .text(item.label);
      });
    };

    return (
      <div
        ref={containerRef}
        className={`spatial-clustering-overlay ${className}`}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ border: "1px solid #ddd" }}
        >
          {/* SVG content is rendered by D3 */}
        </svg>
      </div>
    );
  }
);

SpatialClusteringOverlay.displayName = "SpatialClusteringOverlay";

export default SpatialClusteringOverlay;
