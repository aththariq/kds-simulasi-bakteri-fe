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
  data: ResistanceDataPoint[];
  patterns?: ResistancePattern[];
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

    // Merge configuration with defaults
    const mergedConfig = useMemo(
      () => ({ ...DEFAULT_CONFIG, ...config }),
      [config]
    );

    // Process network data
    const { nodes, links } = useMemo(
      () => processNetworkData(data, patterns),
      [data, patterns]
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

    // Render network graph
    useEffect(() => {
      if (!svgRef.current || !nodes.length || loading) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Set up zoom behavior
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on("zoom", event => {
          g.attr("transform", event.transform);
        });

      if (mergedConfig.enableZoom) {
        svg.call(zoom);
      }

      // Main group
      const g = svg.append("g");

      // Create simulation
      const simulation = d3
        .forceSimulation<NetworkNode>(nodes)
        .force(
          "link",
          d3
            .forceLink<NetworkNode, NetworkLink>(links)
            .id(d => d.id)
            .distance(mergedConfig.linkDistance)
        )
        .force("charge", d3.forceManyBody().strength(mergedConfig.chargeForce))
        .force(
          "center",
          d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
        )
        .force(
          "collision",
          d3.forceCollide<NetworkNode>().radius(d => d.size + 2)
        );

      simulationRef.current = simulation;

      // Create links
      const linkElements = g
        .selectAll(".network-link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "network-link")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => d.weight)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).attr("stroke-opacity", 1);
          setTooltipData({
            type: "link",
            data: d,
            x: event.pageX,
            y: event.pageY,
          });
          setTooltipVisible(true);
        })
        .on("mousemove", function (event) {
          setTooltipData(prev =>
            prev ? { ...prev, x: event.pageX, y: event.pageY } : null
          );
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke-opacity", 0.6);
          setTooltipVisible(false);
          setTooltipData(null);
        })
        .on("click", function (event, d) {
          onLinkClick?.(d);
        });

      // Create nodes
      const nodeElements = g
        .selectAll(".network-node")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "network-node")
        .attr("r", d => d.size)
        .attr("fill", d => d.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", mergedConfig.enableDrag ? "grab" : "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).attr("stroke-width", 4);
          setTooltipData({
            type: "node",
            data: d,
            x: event.pageX,
            y: event.pageY,
          });
          setTooltipVisible(true);
          onNodeHover?.(d);
        })
        .on("mousemove", function (event) {
          setTooltipData(prev =>
            prev ? { ...prev, x: event.pageX, y: event.pageY } : null
          );
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke-width", 2);
          setTooltipVisible(false);
          setTooltipData(null);
          onNodeHover?.(null);
        })
        .on("click", function (event, d) {
          onNodeClick?.(d);
        });

      // Enable drag behavior
      if (mergedConfig.enableDrag) {
        const drag = d3
          .drag<SVGCircleElement, NetworkNode>()
          .on("start", function (event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            d3.select(this).style("cursor", "grabbing");
          })
          .on("drag", function (event, d) {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", function (event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            d3.select(this).style("cursor", "grab");
          });

        nodeElements.call(drag);
      }

      // Labels
      const labelElements = mergedConfig.showLabels
        ? g
            .selectAll(".network-label")
            .data(nodes)
            .enter()
            .append("text")
            .attr("class", "network-label")
            .attr("dx", d => d.size + 5)
            .attr("dy", ".35em")
            .style("font-size", "12px")
            .style("font-family", "Arial, sans-serif")
            .style("fill", "#333")
            .style("pointer-events", "none")
            .text(d => d.label)
        : null;

      // Update positions on simulation tick
      simulation.on("tick", () => {
        linkElements
          .attr("x1", d => (d.source as NetworkNode).x!)
          .attr("y1", d => (d.source as NetworkNode).y!)
          .attr("x2", d => (d.target as NetworkNode).x!)
          .attr("y2", d => (d.target as NetworkNode).y!);

        nodeElements.attr("cx", d => d.x!).attr("cy", d => d.y!);

        if (labelElements) {
          labelElements.attr("x", d => d.x!).attr("y", d => d.y!);
        }
      });

      // Cleanup on unmount
      return () => {
        simulation.stop();
      };
    }, [
      nodes,
      links,
      dimensions,
      mergedConfig,
      loading,
      onNodeClick,
      onLinkClick,
      onNodeHover,
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
          <span className="ml-2">Loading network graph...</span>
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
        <NetworkTooltip data={tooltipData} visible={tooltipVisible} />
      </div>
    );
  }
);

ResistanceNetworkGraph.displayName = "ResistanceNetworkGraph";
