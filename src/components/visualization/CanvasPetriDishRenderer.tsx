"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as d3 from "d3";
import {
  Bacterium,
  AntibioticZone,
  Coordinate,
  PetriDishData,
} from "./PetriDishVisualization";

// Performance optimization constants
const MAX_BACTERIA_FULL_DETAIL = 1000;
const LOD_LEVELS = {
  FULL: 0, // All details visible
  MEDIUM: 1, // Simplified rendering
  LOW: 2, // Points only
  CULLED: 3, // Not rendered
} as const;

// Color schemes
const RESISTANCE_COLORS = {
  sensitive: "#10b981",
  intermediate: "#f59e0b",
  resistant: "#ef4444",
} as const;

const ANTIBIOTIC_COLOR = "#6366f1";
const BACKGROUND_COLOR = "#f8fafc";
const GRID_COLOR = "#e2e8f0";

// Spatial indexing for efficient hit testing
interface QuadTreeNode {
  bounds: { x: number; y: number; width: number; height: number };
  children?: QuadTreeNode[];
  bacteria?: Bacterium[];
  isLeaf: boolean;
}

class SpatialIndex {
  private root: QuadTreeNode;
  private maxDepth: number = 6;
  private maxItemsPerNode: number = 10;

  constructor(bounds: { x: number; y: number; width: number; height: number }) {
    this.root = {
      bounds,
      bacteria: [],
      isLeaf: true,
    };
  }

  insert(bacterium: Bacterium): void {
    this.insertRecursive(this.root, bacterium, 0);
  }

  private insertRecursive(
    node: QuadTreeNode,
    bacterium: Bacterium,
    depth: number
  ): void {
    if (!this.isInBounds(bacterium.position, node.bounds)) return;

    if (node.isLeaf) {
      node.bacteria!.push(bacterium);

      if (
        node.bacteria!.length > this.maxItemsPerNode &&
        depth < this.maxDepth
      ) {
        this.subdivide(node);
        const bacteria = node.bacteria!;
        node.bacteria = undefined;

        bacteria.forEach(b => this.insertRecursive(node, b, depth));
      }
    } else {
      node.children!.forEach(child => {
        this.insertRecursive(child, bacterium, depth + 1);
      });
    }
  }

  private subdivide(node: QuadTreeNode): void {
    const { x, y, width, height } = node.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    node.children = [
      {
        bounds: { x, y, width: halfWidth, height: halfHeight },
        bacteria: [],
        isLeaf: true,
      },
      {
        bounds: { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        bacteria: [],
        isLeaf: true,
      },
      {
        bounds: { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        bacteria: [],
        isLeaf: true,
      },
      {
        bounds: {
          x: x + halfWidth,
          y: y + halfHeight,
          width: halfWidth,
          height: halfHeight,
        },
        bacteria: [],
        isLeaf: true,
      },
    ];
    node.isLeaf = false;
  }

  private isInBounds(
    position: Coordinate,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      position.x >= bounds.x &&
      position.x < bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y < bounds.y + bounds.height
    );
  }

  queryPoint(point: Coordinate, radius: number = 0): Bacterium[] {
    const results: Bacterium[] = [];
    this.queryRecursive(this.root, point, radius, results);
    return results;
  }

  private queryRecursive(
    node: QuadTreeNode,
    point: Coordinate,
    radius: number,
    results: Bacterium[]
  ): void {
    if (!this.boundsIntersectCircle(node.bounds, point, radius)) return;

    if (node.isLeaf) {
      node.bacteria?.forEach(bacterium => {
        const distance = Math.sqrt(
          Math.pow(bacterium.position.x - point.x, 2) +
            Math.pow(bacterium.position.y - point.y, 2)
        );
        if (distance <= radius) {
          results.push(bacterium);
        }
      });
    } else {
      node.children?.forEach(child => {
        this.queryRecursive(child, point, radius, results);
      });
    }
  }

  private boundsIntersectCircle(
    bounds: { x: number; y: number; width: number; height: number },
    center: Coordinate,
    radius: number
  ): boolean {
    const closestX = Math.max(
      bounds.x,
      Math.min(center.x, bounds.x + bounds.width)
    );
    const closestY = Math.max(
      bounds.y,
      Math.min(center.y, bounds.y + bounds.height)
    );
    const distance = Math.sqrt(
      Math.pow(center.x - closestX, 2) + Math.pow(center.y - closestY, 2)
    );
    return distance <= radius;
  }

  clear(): void {
    this.root = {
      bounds: this.root.bounds,
      bacteria: [],
      isLeaf: true,
    };
  }
}

interface ViewportState {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}

interface CanvasPetriDishRendererProps {
  data?: PetriDishData;
  width: number;
  height: number;
  viewport: ViewportState;
  bacteriumSize: number;
  showGrid: boolean;
  showZones: boolean;
  selectedBacterium?: string;
  onBacteriumClick?: (bacterium: Bacterium) => void;
  onZoneClick?: (zone: AntibioticZone) => void;
}

export interface CanvasPetriDishRendererRef {
  redraw: () => void;
  getBacteriumAt: (x: number, y: number) => Bacterium | null;
  getZoneAt: (x: number, y: number) => AntibioticZone | null;
}

const CanvasPetriDishRenderer = forwardRef<
  CanvasPetriDishRendererRef,
  CanvasPetriDishRendererProps
>(
  (
    {
      data,
      width,
      height,
      viewport,
      bacteriumSize,
      showGrid,
      showZones,
      selectedBacterium,
      onBacteriumClick,
      onZoneClick,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const spatialIndexRef = useRef<SpatialIndex | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const [isRendering, setIsRendering] = useState(false);

    // Setup scales for coordinate mapping
    const scales = useMemo(() => {
      if (!data?.grid_statistics.physical_dimensions) {
        return null;
      }

      const [gridWidth, gridHeight] = data.grid_statistics.physical_dimensions;
      const margin = 40;

      const xScale = d3
        .scaleLinear()
        .domain([0, gridWidth])
        .range([margin, width - margin]);

      const yScale = d3
        .scaleLinear()
        .domain([0, gridHeight])
        .range([margin, height - margin]);

      return { xScale, yScale };
    }, [data?.grid_statistics.physical_dimensions, width, height]);

    // Fitness color scale
    const fitnessColorScale = useMemo(() => {
      if (!data?.bacteria.length) return null;

      const fitnessExtent = d3.extent(data.bacteria, d => d.fitness) as [
        number,
        number
      ];
      return d3.scaleSequential(d3.interpolateViridis).domain(fitnessExtent);
    }, [data?.bacteria]);

    // Build spatial index when data changes
    useEffect(() => {
      if (!data?.bacteria.length || !scales) {
        spatialIndexRef.current = null;
        return;
      }

      const bounds = {
        x: 0,
        y: 0,
        width: width,
        height: height,
      };

      const spatialIndex = new SpatialIndex(bounds);

      data.bacteria.forEach(bacterium => {
        spatialIndex.insert(bacterium);
      });

      spatialIndexRef.current = spatialIndex;
    }, [data?.bacteria, scales, width, height]);

    // Determine level of detail based on zoom and bacteria count
    const getLevelOfDetail = useCallback(
      (bacteriaCount: number, scale: number): number => {
        if (bacteriaCount > MAX_BACTERIA_FULL_DETAIL * 4) {
          return scale < 0.5 ? LOD_LEVELS.CULLED : LOD_LEVELS.LOW;
        }
        if (bacteriaCount > MAX_BACTERIA_FULL_DETAIL * 2) {
          return scale < 0.8 ? LOD_LEVELS.LOW : LOD_LEVELS.MEDIUM;
        }
        if (bacteriaCount > MAX_BACTERIA_FULL_DETAIL) {
          return scale < 1.0 ? LOD_LEVELS.MEDIUM : LOD_LEVELS.FULL;
        }
        return LOD_LEVELS.FULL;
      },
      []
    );

    // Canvas drawing functions
    const drawBackground = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);
      },
      [width, height]
    );

    const drawGrid = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!showGrid || !data?.grid_statistics.grid_dimensions || !scales)
          return;

        const [gridCols, gridRows] = data.grid_statistics.grid_dimensions;
        const margin = 40;
        const cellWidth = (width - 2 * margin) / gridCols;
        const cellHeight = (height - 2 * margin) / gridRows;

        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;

        // Vertical lines
        for (let i = 0; i <= gridCols; i++) {
          const x = margin + i * cellWidth;
          ctx.beginPath();
          ctx.moveTo(x, margin);
          ctx.lineTo(x, height - margin);
          ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i <= gridRows; i++) {
          const y = margin + i * cellHeight;
          ctx.beginPath();
          ctx.moveTo(margin, y);
          ctx.lineTo(width - margin, y);
          ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
      },
      [showGrid, data?.grid_statistics.grid_dimensions, scales, width, height]
    );

    const drawAntibioticZones = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!showZones || !data?.antibiotic_zones.length || !scales) return;

        data.antibiotic_zones.forEach(zone => {
          const centerX = scales.xScale(zone.center.x);
          const centerY = scales.yScale(zone.center.y);
          const radius = scales.xScale(zone.radius) - scales.xScale(0);

          // Zone background
          ctx.fillStyle = ANTIBIOTIC_COLOR;
          ctx.globalAlpha = zone.concentration * 0.3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.fill();

          // Zone border
          ctx.strokeStyle = ANTIBIOTIC_COLOR;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.globalAlpha = 1.0;
          ctx.stroke();
          ctx.setLineDash([]);

          // Zone label
          ctx.fillStyle = ANTIBIOTIC_COLOR;
          ctx.font = "bold 12px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            `${(zone.concentration * 100).toFixed(0)}%`,
            centerX,
            centerY - radius - 10
          );
        });
      },
      [showZones, data?.antibiotic_zones, scales]
    );

    const drawBacteria = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!data?.bacteria.length || !scales) return;

        const lod = getLevelOfDetail(data.bacteria.length, viewport.scale);

        if (lod === LOD_LEVELS.CULLED) return;

        // Calculate visible bounds with some padding
        const visibleBounds = {
          left: -viewport.x / viewport.scale - 50,
          right: -viewport.x / viewport.scale + width / viewport.scale + 50,
          top: -viewport.y / viewport.scale - 50,
          bottom: -viewport.y / viewport.scale + height / viewport.scale + 50,
        };

        const visibleBacteria = data.bacteria.filter(bacterium => {
          const x = scales.xScale(bacterium.position.x);
          const y = scales.yScale(bacterium.position.y);
          return (
            x >= visibleBounds.left &&
            x <= visibleBounds.right &&
            y >= visibleBounds.top &&
            y <= visibleBounds.bottom
          );
        });

        // Save context for viewport transformation
        ctx.save();
        ctx.translate(viewport.x, viewport.y);
        ctx.scale(viewport.scale, viewport.scale);

        visibleBacteria.forEach(bacterium => {
          const x = scales.xScale(bacterium.position.x);
          const y = scales.yScale(bacterium.position.y);
          const isSelected = selectedBacterium === bacterium.id;

          if (lod === LOD_LEVELS.LOW) {
            // Point rendering only
            ctx.fillStyle = RESISTANCE_COLORS[bacterium.resistance_status];
            ctx.fillRect(x - 1, y - 1, 2, 2);
            return;
          }

          // Main bacterium circle
          ctx.fillStyle = RESISTANCE_COLORS[bacterium.resistance_status];
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(x, y, bacteriumSize, 0, 2 * Math.PI);
          ctx.fill();

          // Selection indicator
          if (isSelected) {
            ctx.strokeStyle = "#1f2937";
            ctx.lineWidth = 3;
            ctx.globalAlpha = 1.0;
            ctx.stroke();
          } else if (lod === LOD_LEVELS.FULL) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.globalAlpha = 1.0;
            ctx.stroke();
          }

          // Fitness indicator (only in full detail mode)
          if (lod === LOD_LEVELS.FULL && fitnessColorScale) {
            ctx.strokeStyle = fitnessColorScale(bacterium.fitness);
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(x, y, bacteriumSize + 2, 0, 2 * Math.PI);
            ctx.stroke();
          }

          ctx.globalAlpha = 1.0;
        });

        ctx.restore();
      },
      [
        data?.bacteria,
        scales,
        getLevelOfDetail,
        viewport,
        bacteriumSize,
        selectedBacterium,
        fitnessColorScale,
        width,
        height,
      ]
    );

    // Main render function with frame throttling
    const render = useCallback(() => {
      if (isRendering || !canvasRef.current) return;

      setIsRendering(true);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsRendering(false);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height); // Set high DPI
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Draw layers
      drawBackground(ctx);
      drawGrid(ctx);
      drawAntibioticZones(ctx);
      drawBacteria(ctx);

      setIsRendering(false);
    }, [
      width,
      height,
      drawBackground,
      drawGrid,
      drawAntibioticZones,
      drawBacteria,
      isRendering,
    ]);

    // Throttled render using requestAnimationFrame
    const scheduleRender = useCallback(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    }, [render]);

    // Re-render when props change
    useEffect(() => {
      scheduleRender();
    }, [
      scheduleRender,
      data,
      viewport,
      bacteriumSize,
      showGrid,
      showZones,
      selectedBacterium,
    ]);

    // Hit testing functions
    const getBacteriumAt = useCallback(
      (clientX: number, clientY: number): Bacterium | null => {
        if (!data?.bacteria.length || !scales || !spatialIndexRef.current)
          return null;

        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left - viewport.x) / viewport.scale;
        const y = (clientY - rect.top - viewport.y) / viewport.scale;

        // Use spatial index for efficient hit testing
        const candidates = spatialIndexRef.current.queryPoint(
          { x, y },
          bacteriumSize + 5
        );

        for (const bacterium of candidates) {
          const bx = scales.xScale(bacterium.position.x);
          const by = scales.yScale(bacterium.position.y);
          const distance = Math.sqrt(Math.pow(x - bx, 2) + Math.pow(y - by, 2));

          if (distance <= bacteriumSize) {
            return bacterium;
          }
        }

        return null;
      },
      [data?.bacteria, scales, viewport, bacteriumSize]
    );

    const getZoneAt = useCallback(
      (clientX: number, clientY: number): AntibioticZone | null => {
        if (!data?.antibiotic_zones.length || !scales) return null;

        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left - viewport.x) / viewport.scale;
        const y = (clientY - rect.top - viewport.y) / viewport.scale;

        for (const zone of data.antibiotic_zones) {
          const centerX = scales.xScale(zone.center.x);
          const centerY = scales.yScale(zone.center.y);
          const radius = scales.xScale(zone.radius) - scales.xScale(0);

          const distance = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
          );
          if (distance <= radius) {
            return zone;
          }
        }

        return null;
      },
      [data?.antibiotic_zones, scales, viewport]
    );

    // Handle canvas clicks
    const handleCanvasClick = useCallback(
      (event: React.MouseEvent<HTMLCanvasElement>) => {
        // Check for bacterium clicks first
        const bacterium = getBacteriumAt(event.clientX, event.clientY);
        if (bacterium && onBacteriumClick) {
          onBacteriumClick(bacterium);
          return;
        }

        // Check for zone clicks
        const zone = getZoneAt(event.clientX, event.clientY);
        if (zone && onZoneClick) {
          onZoneClick(zone);
          return;
        }
      },
      [getBacteriumAt, getZoneAt, onBacteriumClick, onZoneClick]
    );

    // Expose public methods
    useImperativeHandle(
      ref,
      () => ({
        redraw: scheduleRender,
        getBacteriumAt,
        getZoneAt,
      }),
      [scheduleRender, getBacteriumAt, getZoneAt]
    );

    // Cleanup animation frame on unmount
    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{
          cursor: "pointer",
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
    );
  }
);

CanvasPetriDishRenderer.displayName = "CanvasPetriDishRenderer";

export default CanvasPetriDishRenderer;
