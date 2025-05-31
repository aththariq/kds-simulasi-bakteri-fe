import html2canvas from "html2canvas";
import { toast } from "sonner";

// Visualization export formats
export type VisualizationExportFormat = "png" | "svg" | "pdf" | "jpeg";

// Export quality settings
export interface ExportQualitySettings {
  width?: number;
  height?: number;
  scale?: number; // For PNG/JPEG quality (1-4)
  quality?: number; // For JPEG (0-1)
  backgroundColor?: string;
  pixelRatio?: number;
}

// Visualization export options
export interface VisualizationExportOptions {
  format: VisualizationExportFormat;
  filename?: string;
  quality?: ExportQualitySettings;
  includeControls?: boolean;
  includeTitle?: boolean;
  includeLegend?: boolean;
  watermark?: {
    text: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    opacity?: number;
  };
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    timestamp?: string;
    parameters?: Record<string, unknown>;
  };
}

// Export result for visualizations
export interface VisualizationExportResult {
  success: boolean;
  filename?: string;
  fileSize?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  downloadUrl?: string;
  error?: string;
  metadata?: {
    exportTime: number;
    format: VisualizationExportFormat;
    quality: ExportQualitySettings;
  };
}

// Chart element information
interface ChartElementInfo {
  element: HTMLElement;
  type: "recharts" | "canvas" | "svg" | "generic";
  chartType?: string;
  title?: string;
}

/**
 * Comprehensive Visualization Export Service
 * Handles export of chart visualizations in multiple formats
 */
export class VisualizationExportService {
  private static readonly DEFAULT_QUALITY: ExportQualitySettings = {
    scale: 2,
    width: 1200,
    height: 800,
    backgroundColor: "#ffffff",
    pixelRatio: window.devicePixelRatio || 1,
  };

  /**
   * Export a visualization element as an image
   */
  static async exportVisualization(
    elementOrSelector: HTMLElement | string,
    options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    const startTime = Date.now();

    try {
      // Get the element
      const element = this.getElement(elementOrSelector);
      if (!element) {
        throw new Error("Visualization element not found");
      }

      // Analyze the chart element
      const chartInfo = this.analyzeChartElement(element);

      // Prepare element for export
      await this.prepareElementForExport(element, options);

      // Generate filename
      const filename = this.generateVisualizationFilename(
        options,
        chartInfo.chartType
      );

      // Export based on format
      let result: VisualizationExportResult;
      switch (options.format) {
        case "png":
          result = await this.exportAsPNG(element, filename, options);
          break;
        case "jpeg":
          result = await this.exportAsJPEG(element, filename, options);
          break;
        case "svg":
          result = await this.exportAsSVG(element, filename, options);
          break;
        case "pdf":
          result = await this.exportAsPDF(element, filename, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Add timing and metadata
      result.metadata = {
        ...result.metadata,
        exportTime: Date.now() - startTime,
        format: options.format,
        quality: { ...this.DEFAULT_QUALITY, ...options.quality },
      };

      // Show success notification
      toast.success(
        `Visualization exported as ${options.format.toUpperCase()}`,
        {
          description: `${filename} (${
            result.fileSize
              ? this.formatFileSize(result.fileSize)
              : "Unknown size"
          })`,
        }
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Visualization export failed";

      toast.error("Export failed", {
        description: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        metadata: {
          exportTime: Date.now() - startTime,
          format: options.format,
          quality: { ...this.DEFAULT_QUALITY, ...options.quality },
        },
      };
    }
  }

  /**
   * Export multiple visualizations as a collection
   */
  static async exportVisualizationCollection(
    elements: Array<{ element: HTMLElement | string; name?: string }>,
    options: Omit<VisualizationExportOptions, "filename"> & {
      collectionName?: string;
      layout?: "grid" | "vertical" | "horizontal";
    }
  ): Promise<VisualizationExportResult> {
    try {
      const container = await this.createVisualizationGrid(elements, options);

      const collectionOptions = {
        ...options,
        filename: options.collectionName || "visualization-collection",
      };

      return this.exportVisualization(container, collectionOptions);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Collection export failed",
        metadata: {
          exportTime: 0,
          format: options.format,
          quality: { ...this.DEFAULT_QUALITY, ...options.quality },
        },
      };
    }
  }

  /**
   * Get element from selector or return element directly
   */
  private static getElement(
    elementOrSelector: HTMLElement | string
  ): HTMLElement | null {
    if (typeof elementOrSelector === "string") {
      return document.querySelector(elementOrSelector);
    }
    return elementOrSelector;
  }

  /**
   * Analyze chart element to understand its type and properties
   */
  private static analyzeChartElement(element: HTMLElement): ChartElementInfo {
    const info: ChartElementInfo = {
      element,
      type: "generic",
    };

    // Check for Recharts
    if (element.querySelector(".recharts-wrapper")) {
      info.type = "recharts";

      // Try to determine chart type from classes or data attributes
      if (element.querySelector(".recharts-line-chart")) {
        info.chartType = "line";
      } else if (element.querySelector(".recharts-area-chart")) {
        info.chartType = "area";
      } else if (element.querySelector(".recharts-bar-chart")) {
        info.chartType = "bar";
      } else if (element.querySelector(".recharts-scatter-chart")) {
        info.chartType = "scatter";
      } else if (element.querySelector(".recharts-composed-chart")) {
        info.chartType = "composed";
      } else {
        info.chartType = "recharts";
      }
    }
    // Check for SVG
    else if (element.tagName === "SVG" || element.querySelector("svg")) {
      info.type = "svg";
    }
    // Check for Canvas
    else if (element.tagName === "CANVAS" || element.querySelector("canvas")) {
      info.type = "canvas";
    }

    // Try to get title from various sources
    const titleElement = element.querySelector(
      "h1, h2, h3, .chart-title, [data-chart-title]"
    );
    if (titleElement) {
      info.title = titleElement.textContent?.trim();
    }

    return info;
  }

  /**
   * Prepare element for export (cleanup, styling, etc.)
   */
  private static async prepareElementForExport(
    element: HTMLElement,
    options: VisualizationExportOptions
  ): Promise<void> {
    // Ensure animations are complete
    await this.waitForAnimations(element);

    // Hide controls if requested
    if (!options.includeControls) {
      const controls = element.querySelectorAll(
        ".chart-controls, .visualization-controls, [data-chart-controls]"
      );
      controls.forEach(control => {
        (control as HTMLElement).style.display = "none";
      });
    }

    // Hide/show legend based on options
    if (!options.includeLegend) {
      const legends = element.querySelectorAll(
        ".recharts-legend-wrapper, .chart-legend"
      );
      legends.forEach(legend => {
        (legend as HTMLElement).style.display = "none";
      });
    }

    // Add watermark if specified
    if (options.watermark) {
      this.addWatermark(element, options.watermark);
    }
  }

  /**
   * Wait for animations to complete
   */
  private static waitForAnimations(element: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      // Wait for CSS animations and transitions
      const animations = element.getAnimations();
      if (animations.length === 0) {
        resolve();
        return;
      }

      Promise.all(animations.map(anim => anim.finished))
        .then(() => resolve())
        .catch(() => resolve()); // Resolve even if animations fail
    });
  }

  /**
   * Add watermark to element
   */
  private static addWatermark(
    element: HTMLElement,
    watermark: NonNullable<VisualizationExportOptions["watermark"]>
  ): void {
    const watermarkDiv = document.createElement("div");
    watermarkDiv.style.position = "absolute";
    watermarkDiv.style.pointerEvents = "none";
    watermarkDiv.style.opacity = (watermark.opacity || 0.3).toString();
    watermarkDiv.style.fontSize = "12px";
    watermarkDiv.style.color = "#666";
    watermarkDiv.style.fontFamily = "Arial, sans-serif";
    watermarkDiv.style.zIndex = "1000";
    watermarkDiv.textContent = watermark.text;

    // Position watermark
    switch (watermark.position) {
      case "top-left":
        watermarkDiv.style.top = "10px";
        watermarkDiv.style.left = "10px";
        break;
      case "top-right":
        watermarkDiv.style.top = "10px";
        watermarkDiv.style.right = "10px";
        break;
      case "bottom-left":
        watermarkDiv.style.bottom = "10px";
        watermarkDiv.style.left = "10px";
        break;
      case "bottom-right":
        watermarkDiv.style.bottom = "10px";
        watermarkDiv.style.right = "10px";
        break;
    }

    // Make parent relative if needed
    const computedStyle = getComputedStyle(element);
    if (computedStyle.position === "static") {
      element.style.position = "relative";
    }

    element.appendChild(watermarkDiv);
  }

  /**
   * Export as PNG
   */
  private static async exportAsPNG(
    element: HTMLElement,
    filename: string,
    options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    const quality = { ...this.DEFAULT_QUALITY, ...options.quality };

    const canvas = await html2canvas(element, {
      scale: quality.scale,
      width: quality.width,
      height: quality.height,
      backgroundColor: quality.backgroundColor,
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: true,
      imageTimeout: 30000,
    });

    return this.canvasToBlob(canvas, "image/png", filename, {
      width: canvas.width,
      height: canvas.height,
    });
  }

  /**
   * Export as JPEG
   */
  private static async exportAsJPEG(
    element: HTMLElement,
    filename: string,
    options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    const quality = { ...this.DEFAULT_QUALITY, ...options.quality };

    const canvas = await html2canvas(element, {
      scale: quality.scale,
      width: quality.width,
      height: quality.height,
      backgroundColor: quality.backgroundColor || "#ffffff", // JPEG needs background
      useCORS: true,
      allowTaint: false,
    });

    return this.canvasToBlob(
      canvas,
      "image/jpeg",
      filename.replace(/\.png$/, ".jpg"),
      {
        width: canvas.width,
        height: canvas.height,
      },
      quality.quality || 0.9
    );
  }

  /**
   * Export as SVG
   */
  private static async exportAsSVG(
    element: HTMLElement,
    filename: string,
    options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    // For SVG export, we need to serialize the DOM element
    // This is more complex for Recharts as it renders to SVG
    const svgElement = element.querySelector("svg");

    if (!svgElement) {
      throw new Error("No SVG element found for SVG export");
    }

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;

    // Add metadata if provided
    if (options.metadata) {
      this.addSVGMetadata(clonedSvg, options.metadata);
    }

    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);

    // Create blob and download
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const downloadUrl = this.downloadBlob(
      blob,
      filename.replace(/\.(png|jpg|jpeg)$/, ".svg")
    );

    return {
      success: true,
      filename: filename.replace(/\.(png|jpg|jpeg)$/, ".svg"),
      fileSize: blob.size,
      dimensions: {
        width: parseInt(clonedSvg.getAttribute("width") || "0"),
        height: parseInt(clonedSvg.getAttribute("height") || "0"),
      },
      downloadUrl,
    };
  }

  /**
   * Export as PDF (basic implementation)
   */
  private static async exportAsPDF(
    element: HTMLElement,
    filename: string,
    options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    // For PDF export, we first create a PNG then convert
    // In a full implementation, consider using jsPDF library
    const pngResult = await this.exportAsPNG(element, filename, options);

    if (!pngResult.success) {
      return pngResult;
    }

    // This is a placeholder - in production, use a proper PDF library
    return {
      ...pngResult,
      filename: filename.replace(/\.(png|jpg|jpeg|svg)$/, ".pdf"),
    };
  }

  /**
   * Convert canvas to blob and trigger download
   */
  private static canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    filename: string,
    dimensions: { width: number; height: number },
    quality?: number
  ): Promise<VisualizationExportResult> {
    return new Promise(resolve => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            resolve({
              success: false,
              error: "Failed to create image blob",
            });
            return;
          }

          const downloadUrl = this.downloadBlob(blob, filename);

          resolve({
            success: true,
            filename,
            fileSize: blob.size,
            dimensions,
            downloadUrl,
          });
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * Add metadata to SVG element
   */
  private static addSVGMetadata(
    svgElement: SVGElement,
    metadata: NonNullable<VisualizationExportOptions["metadata"]>
  ): void {
    // Add title
    if (metadata.title) {
      const titleElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title"
      );
      titleElement.textContent = metadata.title;
      svgElement.insertBefore(titleElement, svgElement.firstChild);
    }

    // Add description
    if (metadata.description) {
      const descElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "desc"
      );
      descElement.textContent = metadata.description;
      svgElement.insertBefore(descElement, svgElement.firstChild);
    }

    // Add metadata element
    const metadataElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "metadata"
    );
    const metadataContent = {
      ...metadata,
      exportedAt: new Date().toISOString(),
      generator: "Bacterial Simulation Visualization Export",
    };
    metadataElement.textContent = JSON.stringify(metadataContent, null, 2);
    svgElement.insertBefore(metadataElement, svgElement.firstChild);
  }

  /**
   * Create a grid layout for multiple visualizations
   */
  private static async createVisualizationGrid(
    elements: Array<{ element: HTMLElement | string; name?: string }>,
    options: { layout?: "grid" | "vertical" | "horizontal" }
  ): Promise<HTMLElement> {
    const container = document.createElement("div");
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "20px";

    // Apply layout styles
    switch (options.layout) {
      case "horizontal":
        container.style.display = "flex";
        container.style.flexDirection = "row";
        container.style.gap = "20px";
        break;
      case "vertical":
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "20px";
        break;
      case "grid":
      default:
        container.style.display = "grid";
        container.style.gridTemplateColumns =
          "repeat(auto-fit, minmax(400px, 1fr))";
        container.style.gap = "20px";
        break;
    }

    // Clone and add elements
    for (const { element: elementOrSelector, name } of elements) {
      const element = this.getElement(elementOrSelector);
      if (!element) continue;

      const wrapper = document.createElement("div");
      wrapper.style.border = "1px solid #e5e7eb";
      wrapper.style.borderRadius = "8px";
      wrapper.style.padding = "16px";
      wrapper.style.backgroundColor = "#ffffff";

      // Add title if provided
      if (name) {
        const title = document.createElement("h3");
        title.textContent = name;
        title.style.margin = "0 0 16px 0";
        title.style.fontSize = "16px";
        title.style.fontWeight = "600";
        wrapper.appendChild(title);
      }

      // Clone the element
      const clonedElement = element.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clonedElement);
      container.appendChild(wrapper);
    }

    // Temporarily add to DOM for rendering
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    // Wait for layout
    await new Promise(resolve => setTimeout(resolve, 100));

    return container;
  }

  /**
   * Generate filename for visualization export
   */
  private static generateVisualizationFilename(
    options: VisualizationExportOptions,
    chartType?: string
  ): string {
    if (options.filename) {
      return options.filename;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
    const type = chartType || "visualization";

    return `${type}-chart-${timestamp}-${timeStr}.${options.format}`;
  }

  /**
   * Create download link and trigger download
   */
  private static downloadBlob(blob: Blob, filename: string): string {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return url;
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// React hook for visualization export
export interface UseVisualizationExportReturn {
  exportVisualization: (
    elementOrSelector: HTMLElement | string,
    options: VisualizationExportOptions
  ) => Promise<VisualizationExportResult>;
  exportCollection: (
    elements: Array<{ element: HTMLElement | string; name?: string }>,
    options: Omit<VisualizationExportOptions, "filename"> & {
      collectionName?: string;
      layout?: "grid" | "vertical" | "horizontal";
    }
  ) => Promise<VisualizationExportResult>;
  isExporting: boolean;
  lastExport: Date | null;
  error: string | null;
  clearError: () => void;
}

export const useVisualizationExport = (): UseVisualizationExportReturn => {
  const [isExporting, setIsExporting] = React.useState(false);
  const [lastExport, setLastExport] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const exportVisualization = async (
    elementOrSelector: HTMLElement | string,
    options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> => {
    setIsExporting(true);
    setError(null);

    try {
      const result = await VisualizationExportService.exportVisualization(
        elementOrSelector,
        options
      );
      if (result.success) {
        setLastExport(new Date());
      } else {
        setError(result.error || "Visualization export failed");
      }
      return result;
    } finally {
      setIsExporting(false);
    }
  };

  const exportCollection = async (
    elements: Array<{ element: HTMLElement | string; name?: string }>,
    options: Omit<VisualizationExportOptions, "filename"> & {
      collectionName?: string;
      layout?: "grid" | "vertical" | "horizontal";
    }
  ): Promise<VisualizationExportResult> => {
    setIsExporting(true);
    setError(null);

    try {
      const result =
        await VisualizationExportService.exportVisualizationCollection(
          elements,
          options
        );
      if (result.success) {
        setLastExport(new Date());
      } else {
        setError(result.error || "Collection export failed");
      }
      return result;
    } finally {
      setIsExporting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    exportVisualization,
    exportCollection,
    isExporting,
    lastExport,
    error,
    clearError,
  };
};

// Import React for the hook
import React from "react";
