"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import * as d3 from "d3";
import {
  ResistanceDataPoint,
  ResistancePattern,
} from "@/lib/resistance-analysis";
import { useMobileVisualization } from "../hooks/useMobileVisualization";

// ============================
// Types and Interfaces
// ============================

export interface NetworkNode {
  id: string;
  label: string;
  type: "gene" | "pattern" | "bacterium";
  frequency: number;
  size: number;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  metadata: {
    firstAppearance?: number;
    lastSeen?: number;
    hgtEvents?: number;
    mutationEvents?: number;
    fitnessAdvantage?: number;
  };
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
  type: "cooccurrence" | "evolution" | "transmission";
  weight: number;
  metadata: {
    generations?: number[];
    strength?: number;
    confidence?: number;
  };
}

export interface NetworkGraphConfig {
  width?: number;
  height?: number;
  nodeMinSize?: number;
  nodeMaxSize?: number;
  linkMinWidth?: number;
  linkMaxWidth?: number;
  forceStrength?: number;
  chargeForce?: number;
  linkDistance?: number;
  showLabels?: boolean;
  enableZoom?: boolean;
  enableDrag?: boolean;
  colorScheme?: string[];
  animationDuration?: number;
  maxNodes?: number;
  nodeRadius?: number;
  linkStrokeWidth?: number;
  linkColor?: string;
  nodeColor?: string;
  nodeStroke?: string;
  nodeStrokeWidth?: number;
  showTooltips?: boolean;
  simulation?: {
    alphaDecay?: number;
    velocityDecay?: number;
  };
}

export interface NetworkGraphTooltipData {
  type: "node" | "link";
  data: NetworkNode | NetworkLink;
  x: number;
  y: number;
}

export interface ResistanceNetworkGraphRef {
  exportSVG: () => string;
  exportPNG: (scale?: number) => Promise<string>;
  updateData: (nodes: NetworkNode[], links: NetworkLink[]) => void;
  highlightNode: (nodeId: string | null) => void;
  highlightConnections: (nodeId: string | null) => void;
  resetZoom: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
}

export interface ResistanceNetworkGraphProps {
  data?: ResistanceDataPoint[];
  patterns?: ResistancePattern[];
  directNodes?: NetworkNode[];
  directLinks?: NetworkLink[];
  config?: NetworkGraphConfig;
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
  onNodeHover?: (node: NetworkNode | null) => void;
  className?: string;
  loading?: boolean;
  error?: string | null;
}

// ============================
// Default Configuration
// ============================

const DEFAULT_CONFIG: Required<NetworkGraphConfig> = {
  width: 800,
  height: 600,
  nodeMinSize: 5,
  nodeMaxSize: 30,
  linkMinWidth: 1,
  linkMaxWidth: 8,
  forceStrength: -300,
  chargeForce: -300,
  linkDistance: 100,
  showLabels: true,
  enableZoom: true,
  enableDrag: true,
  colorScheme: [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
  ],
  animationDuration: 750,
  maxNodes: 100,
  nodeRadius: 5,
  linkStrokeWidth: 1,
  linkColor: "#999",
  nodeColor: "#1f77b4",
  nodeStroke: "#fff",
  nodeStrokeWidth: 1.5,
  showTooltips: true,
  simulation: {
    alphaDecay: 0.05,
    velocityDecay: 0.4,
  },
};

// ============================
// Data Processing Utilities
// ============================

const processNetworkData = (
  data: ResistanceDataPoint[],
  patterns: ResistancePattern[] = []
): { nodes: NetworkNode[]; links: NetworkLink[] } => {
  if (!data || data.length === 0) {
    return { nodes: [], links: [] };
  }

  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const geneFrequencies = new Map<string, number>();
  const geneCooccurrences = new Map<string, number>();

  // Calculate gene frequencies and co-occurrences
  data.forEach(point => {
    Object.entries(point.geneFrequencies).forEach(([gene, freq]) => {
      geneFrequencies.set(gene, (geneFrequencies.get(gene) || 0) + freq);
    });

    // Calculate pairwise co-occurrences
    const genes = Object.keys(point.geneFrequencies);
    for (let i = 0; i < genes.length; i++) {
      for (let j = i + 1; j < genes.length; j++) {
        const pairKey = [genes[i], genes[j]].sort().join("-");
        const cooccurrenceValue = Math.min(
          point.geneFrequencies[genes[i]],
          point.geneFrequencies[genes[j]]
        );
        geneCooccurrences.set(
          pairKey,
          (geneCooccurrences.get(pairKey) || 0) + cooccurrenceValue
        );
      }
    }
  });

  // Create nodes for genes
  const maxFrequency = Math.max(...Array.from(geneFrequencies.values()));
  const colorScale = d3.scaleOrdinal(DEFAULT_CONFIG.colorScheme);

  Array.from(geneFrequencies.entries()).forEach(([gene, frequency], index) => {
    const normalizedSize =
      (frequency / maxFrequency) * DEFAULT_CONFIG.nodeMaxSize;

    nodes.push({
      id: gene,
      label: gene,
      type: "gene",
      frequency: frequency / data.length,
      size: Math.max(normalizedSize, DEFAULT_CONFIG.nodeMinSize),
      color: colorScale(index.toString()),
      metadata: {
        firstAppearance: data.findIndex(d => d.geneFrequencies[gene] > 0),
        lastSeen:
          data.length -
          1 -
          data
            .slice()
            .reverse()
            .findIndex(d => d.geneFrequencies[gene] > 0),
        hgtEvents: data.reduce((sum, d) => sum + d.hgtEvents, 0),
        mutationEvents: data.reduce((sum, d) => sum + d.mutationEvents, 0),
      },
    });
  });

  // Create links for significant co-occurrences
  const maxCooccurrence = Math.max(...Array.from(geneCooccurrences.values()));
  const cooccurrenceThreshold = maxCooccurrence * 0.1; // 10% of max

  Array.from(geneCooccurrences.entries()).forEach(([pairKey, value]) => {
    if (value > cooccurrenceThreshold) {
      const [source, target] = pairKey.split("-");
      const normalizedWeight =
        (value / maxCooccurrence) * DEFAULT_CONFIG.linkMaxWidth;

      links.push({
        source,
        target,
        value,
        type: "cooccurrence",
        weight: Math.max(normalizedWeight, DEFAULT_CONFIG.linkMinWidth),
        metadata: {
          strength: value / maxCooccurrence,
          confidence:
            value /
            (geneFrequencies.get(source)! + geneFrequencies.get(target)!),
        },
      });
    }
  });

  // Add pattern nodes if provided
  patterns.forEach((pattern, index) => {
    const patternId = `pattern-${index}`;
    nodes.push({
      id: patternId,
      label: `Pattern ${index + 1}`,
      type: "pattern",
      frequency: pattern.frequency,
      size: pattern.frequency * DEFAULT_CONFIG.nodeMaxSize,
      color: "#ff6b6b",
      metadata: {
        firstAppearance: pattern.firstAppearance,
        lastSeen: pattern.lastSeen,
        fitnessAdvantage: pattern.associatedFitness,
      },
    });

    // Link pattern to its constituent genes
    pattern.genes.forEach(gene => {
      if (nodes.find(n => n.id === gene)) {
        links.push({
          source: patternId,
          target: gene,
          value: pattern.frequency,
          type: "evolution",
          weight: pattern.frequency * DEFAULT_CONFIG.linkMaxWidth,
          metadata: {
            generations: pattern.generations,
            strength: pattern.frequency,
          },
        });
      }
    });
  });

  return { nodes, links };
};

// ============================
// Tooltip Component
// ============================

const NetworkTooltip: React.FC<{
  data: NetworkGraphTooltipData | null;
  visible: boolean;
}> = ({ data, visible }) => {
  if (!visible || !data) return null;

  const renderNodeTooltip = (node: NetworkNode) => (
    <div className="space-y-2">
      <div className="font-semibold text-gray-800">{node.label}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Type:</span>
          <span className="font-medium capitalize">{node.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Frequency:</span>
          <span className="font-medium">
            {(node.frequency * 100).toFixed(2)}%
          </span>
        </div>
        {node.metadata.firstAppearance !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-600">First Seen:</span>
            <span className="font-medium">
              Gen {node.metadata.firstAppearance}
            </span>
          </div>
        )}
        {node.metadata.fitnessAdvantage !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-600">Fitness:</span>
            <span className="font-medium">
              {node.metadata.fitnessAdvantage.toFixed(3)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const renderLinkTooltip = (link: NetworkLink) => (
    <div className="space-y-2">
      <div className="font-semibold text-gray-800">
        Connection:{" "}
        {typeof link.source === "string" ? link.source : link.source.id} ↔{" "}
        {typeof link.target === "string" ? link.target : link.target.id}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Type:</span>
          <span className="font-medium capitalize">{link.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Strength:</span>
          <span className="font-medium">
            {(link.metadata.strength || 0).toFixed(3)}
          </span>
        </div>
        {link.metadata.confidence && (
          <div className="flex justify-between">
            <span className="text-gray-600">Confidence:</span>
            <span className="font-medium">
              {(link.metadata.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm pointer-events-none max-w-xs"
      style={{
        left: data.x + 10,
        top: data.y - 10,
        transform: "translateY(-50%)",
      }}
    >
      {data.type === "node"
        ? renderNodeTooltip(data.data as NetworkNode)
        : renderLinkTooltip(data.data as NetworkLink)}
    </div>
  );
};

// ============================
// Main Component
// ============================

export const ResistanceNetworkGraph = forwardRef<
  ResistanceNetworkGraphRef,
  ResistanceNetworkGraphProps
>(
  (
    {
      data,
      patterns = [],
      directNodes,
      directLinks,
      config = {},
      onNodeClick,
      onLinkClick,
      onNodeHover,
      className,
      loading,
      error,
    },
    ref
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<d3.Simulation<
      NetworkNode,
      NetworkLink
    > | null>(null);
    const [tooltipData, setTooltipData] =
      useState<NetworkGraphTooltipData | null>(null);
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
    } = useMobileVisualization("network", {
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
          showTooltips: shouldShowTooltips(),
          animationDuration: animationDuration,
          // Apply mobile config overrides
          ...mobileConfig,
          // Simplify network for mobile performance
          maxNodes: Math.min(
            baseConfig.maxNodes || 50,
            simplifiedSettings.maxCategories
          ),
          nodeRadius: Math.max(baseConfig.nodeRadius || 5, 8), // Larger nodes for touch
          linkStrokeWidth: Math.max(baseConfig.linkStrokeWidth || 1, 2),
          // Show legend and grid based on mobile settings
          showLabels: shouldShowLegend(),
          // Reduce simulation complexity
          simulation: {
            ...baseConfig.simulation,
            alphaDecay: 0.1, // Faster convergence
            velocityDecay: 0.7, // More damping
          },
        };
      }

      return baseConfig;
    }, [
      config,
      deviceType,
      mobileDimensions,
      shouldShowTooltips,
      animationDuration,
      mobileConfig,
      simplifiedSettings.maxCategories,
      shouldShowLegend,
    ]);

    // Process network data with mobile optimization
    const { nodes, links } = useMemo(() => {
      if (directNodes) {
        return { nodes: directNodes, links: directLinks || [] };
      }
      if (!data) {
        return { nodes: [], links: [] };
      }

      const processedData = processNetworkData(data, patterns);

      if (deviceType === "mobile") {
        // Use mobile data optimization from hook
        const optimizedNodes = optimizeDataForMobile(processedData.nodes);
        const nodeIds = new Set(optimizedNodes.map(n => n.id));
        const optimizedLinks = processedData.links.filter(
          l =>
            nodeIds.has(l.source.toString()) && nodeIds.has(l.target.toString())
        );

        return {
          nodes: optimizedNodes,
          links: optimizedLinks,
        };
      }

      return processedData;
    }, [
      data,
      patterns,
      directNodes,
      directLinks,
      deviceType,
      optimizeDataForMobile,
    ]);

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

    // Mobile-optimized drag behavior
    const dragBehavior = useMemo(() => {
      if (!simulationRef.current) return null;

      const simulation = simulationRef.current;

      return d3
        .drag<SVGCircleElement, NetworkNode>()
        .on("start", function (event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;

          // Enhanced feedback for mobile
          if (deviceType === "mobile") {
            d3.select(this)
              .transition()
              .duration(100)
              .attr("r", (d.size || mergedConfig.nodeRadius) * 1.2);
          }
        })
        .on("drag", function (event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", function (event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;

          // Reset size for mobile
          if (deviceType === "mobile") {
            d3.select(this)
              .transition()
              .duration(200)
              .attr("r", d.size || mergedConfig.nodeRadius);
          }
        });
    }, [simulationRef.current, deviceType, mergedConfig.nodeRadius]);

    // Handle touch interactions for mobile devices
    const handleTouchInteraction = useCallback(
      (event: TouchEvent) => {
        if (deviceType !== "mobile") return;

        event.preventDefault();

        // Find closest node for touch target
        const touch = event.touches[0] || event.changedTouches[0];
        const svg = svgRef.current;
        if (!touch || !svg) return;

        const rect = svg.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Find closest node
        const closestNode = nodes.reduce(
          (closest, node) => {
            if (!node.x || !node.y) return closest;
            const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
            return distance < closest.distance ? { node, distance } : closest;
          },
          { node: null as NetworkNode | null, distance: Infinity }
        );

        // Handle node interaction if within reasonable distance
        if (closestNode.node && closestNode.distance < 30) {
          if (event.type === "touchend" && onNodeClick) {
            onNodeClick(closestNode.node);
          }
        }

        // For zoom and pan gestures, use the native event directly
        // The touchHandlers from useMobileVisualization will need to handle native events
        if (event.type === "touchstart" && event.touches.length >= 2) {
          // Multi-touch gesture (pinch zoom)
          event.preventDefault();
        }
      },
      [nodes, onNodeClick, deviceType]
    );

    // D3 force simulation with mobile optimizations
    useEffect(() => {
      if (!nodes.length || !svgRef.current) return;

      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;

      // Clear previous content
      svg.selectAll("*").remove();

      // Create main group
      const mainGroup = svg.append("g").attr("class", "network-main");

      // Set up simulation with mobile-optimized forces
      const simulation = d3
        .forceSimulation<NetworkNode>(nodes)
        .force(
          "link",
          d3
            .forceLink<NetworkNode, NetworkLink>(links)
            .id(d => d.id)
            .distance(deviceType === "mobile" ? 40 : 30)
            .strength(deviceType === "mobile" ? 0.5 : 0.7)
        )
        .force(
          "charge",
          d3.forceManyBody().strength(deviceType === "mobile" ? -100 : -150)
        )
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
          "collision",
          d3
            .forceCollide()
            .radius(
              (d: any) =>
                ((d as NetworkNode).size || mergedConfig.nodeRadius) + 2
            )
        )
        .alphaDecay(mergedConfig.simulation?.alphaDecay || 0.05)
        .velocityDecay(mergedConfig.simulation?.velocityDecay || 0.4);

      simulationRef.current = simulation;

      // Create links
      const linkElements = mainGroup
        .selectAll(".network-link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "network-link")
        .attr("stroke", mergedConfig.linkColor)
        .attr("stroke-width", mergedConfig.linkStrokeWidth)
        .attr("stroke-opacity", deviceType === "mobile" ? 0.8 : 0.6);

      // Create nodes with enhanced mobile interaction
      const nodeElements = mainGroup
        .selectAll(".network-node")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "network-node")
        .attr("r", d => d.size || mergedConfig.nodeRadius)
        .attr("fill", d => d.color || mergedConfig.nodeColor)
        .attr("stroke", mergedConfig.nodeStroke)
        .attr("stroke-width", mergedConfig.nodeStrokeWidth)
        .style("cursor", deviceType === "mobile" ? "default" : "pointer");

      // Add drag behavior
      if (dragBehavior) {
        nodeElements.call(dragBehavior);
      }

      // Touch interaction for mobile
      if (deviceType === "mobile") {
        svg.node()?.addEventListener("touchstart", handleTouchInteraction);
        svg.node()?.addEventListener("touchmove", e => {
          if (e.touches.length === 2) e.preventDefault(); // Prevent scroll on pinch
        });
      }

      // Mouse interaction for desktop
      if (deviceType !== "mobile") {
        nodeElements
          .on("mouseover", function (event, d) {
            if (mergedConfig.showTooltips) {
              const rect = this.getBoundingClientRect();
              setTooltipData({
                type: "node",
                data: d,
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
              setTooltipVisible(true);
              onNodeHover?.(d);
            }
          })
          .on("mouseout", function () {
            setTooltipVisible(false);
            onNodeHover?.(null);
          })
          .on("click", function (event, d) {
            onNodeClick?.(d);
          });

        linkElements.on("click", function (event, d) {
          onLinkClick?.(d);
        });
      }

      // Node labels (simplified for mobile)
      if ((deviceType !== "mobile" || nodes.length < 20) && shouldShowGrid()) {
        const labelElements = mainGroup
          .selectAll(".network-label")
          .data(nodes)
          .enter()
          .append("text")
          .attr("class", "network-label")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .style("font-size", `${fontSize}px`)
          .style("font-weight", "bold")
          .style("fill", "#333")
          .style("pointer-events", "none")
          .text(d => d.label || d.id);

        // Update positions on simulation tick
        simulation.on("tick", () => {
          linkElements
            .attr("x1", d => (d.source as NetworkNode).x || 0)
            .attr("y1", d => (d.source as NetworkNode).y || 0)
            .attr("x2", d => (d.target as NetworkNode).x || 0)
            .attr("y2", d => (d.target as NetworkNode).y || 0);

          nodeElements.attr("cx", d => d.x || 0).attr("cy", d => d.y || 0);

          labelElements.attr("x", d => d.x || 0).attr("y", d => d.y || 0);
        });
      } else {
        // Mobile: Update positions without labels for performance
        simulation.on("tick", () => {
          linkElements
            .attr("x1", d => (d.source as NetworkNode).x || 0)
            .attr("y1", d => (d.source as NetworkNode).y || 0)
            .attr("x2", d => (d.target as NetworkNode).x || 0)
            .attr("y2", d => (d.target as NetworkNode).y || 0);

          nodeElements.attr("cx", d => d.x || 0).attr("cy", d => d.y || 0);
        });
      }

      // Cleanup function
      return () => {
        simulation.stop();
        if (svgRef.current && deviceType === "mobile") {
          svgRef.current.removeEventListener(
            "touchstart",
            handleTouchInteraction
          );
        }
      };
    }, [
      nodes,
      links,
      dimensions,
      mergedConfig,
      deviceType,
      dragBehavior,
      handleTouchInteraction,
      onNodeClick,
      onLinkClick,
      onNodeHover,
      fontSize,
    ]);

    // Cleanup touch event listeners
    useEffect(() => {
      return () => {
        if (svgRef.current && deviceType === "mobile") {
          svgRef.current.removeEventListener(
            "touchstart",
            handleTouchInteraction
          );
        }
      };
    }, [deviceType, handleTouchInteraction]);

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

        updateData: (newNodes: NetworkNode[], newLinks: NetworkLink[]) => {
          // This would require more complex update logic
        },

        highlightNode: (nodeId: string | null) => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          if (nodeId === null) {
            svg.selectAll(".network-node").style("opacity", "1");
          } else {
            svg
              .selectAll(".network-node")
              .style("opacity", (d: any) => (d.id === nodeId ? "1" : "0.3"));
          }
        },

        highlightConnections: (nodeId: string | null) => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          const connectedLinks = nodeId
            ? links.filter(
                l =>
                  (typeof l.source === "string" ? l.source : l.source.id) ===
                    nodeId ||
                  (typeof l.target === "string" ? l.target : l.target.id) ===
                    nodeId
              )
            : [];

          if (nodeId === null) {
            svg.selectAll(".network-link").style("opacity", "0.6");
            svg.selectAll(".network-node").style("opacity", "1");
          } else {
            svg
              .selectAll(".network-link")
              .style("opacity", (d: any) =>
                connectedLinks.includes(d) ? "1" : "0.1"
              );

            svg.selectAll(".network-node").style("opacity", (d: any) => {
              if (d.id === nodeId) return "1";
              const isConnected = connectedLinks.some(
                l =>
                  (typeof l.source === "string" ? l.source : l.source.id) ===
                    d.id ||
                  (typeof l.target === "string" ? l.target : l.target.id) ===
                    d.id
              );
              return isConnected ? "1" : "0.3";
            });
          }
        },

        resetZoom: () => {
          if (!svgRef.current) return;

          const svg = d3.select(svgRef.current);
          svg
            .transition()
            .duration(750)
            .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
        },

        pauseSimulation: () => {
          simulationRef.current?.stop();
        },

        resumeSimulation: () => {
          simulationRef.current?.restart();
        },
      }),
      [dimensions, links]
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
          <span className="ml-2">Loading network...</span>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`relative ${className}`}
        {...(deviceType === "mobile" ? touchHandlers : {})}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
          style={{
            touchAction: deviceType === "mobile" ? "pan-x pan-y" : "auto",
            userSelect: "none",
          }}
        />
        {mergedConfig.showTooltips && (
          <NetworkTooltip data={tooltipData} visible={tooltipVisible} />
        )}
      </div>
    );
  }
);

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

ResistanceNetworkGraph.displayName = "ResistanceNetworkGraph";
