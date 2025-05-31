import { PopulationDataPoint } from "@/components/visualization/PopulationChart";
import { SimulationDataPoint } from "@/components/visualization/hooks/useSimulationData";
import { Session } from "./schemas/session";
import { toast } from "sonner";
import {
  simulationParametersSchema,
  validateSimulationParameters,
} from "./validation";

// Export format types
export type ExportFormat = "json" | "csv" | "tsv" | "xlsx";

// Comprehensive simulation data for export
export interface SimulationExportData {
  metadata: {
    version: string;
    exportTimestamp: string;
    simulationId?: string;
    sessionId?: string;
    sessionName?: string;
    description?: string;
    parameters?: Record<string, unknown>;
    startTime?: string;
    endTime?: string;
    totalGenerations: number;
    totalDataPoints: number;
    exportFormat: ExportFormat;
    applicationVersion?: string;
  };
  populationData: PopulationDataPoint[];
  rawData?: SimulationDataPoint[];
  spatialData?: any[];
  mutationData?: any[];
  environmentalData?: any[];
  statistics?: {
    averagePopulation: number;
    peakPopulation: number;
    averageResistance: number;
    peakResistance: number;
    resistanceEmergenceGeneration?: number;
    finalResistancePercentage: number;
    populationGrowthRate: number;
    extinctionEvents: number;
  };
}

// Export options
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeStatistics?: boolean;
  includeRawData?: boolean;
  includeSpatialData?: boolean;
  includeMutationData?: boolean;
  includeEnvironmentalData?: boolean;
  filename?: string;
  compression?: boolean;
  precision?: number; // decimal places for numbers
  dateFormat?: "iso" | "locale" | "timestamp";
  delimiter?: string; // for CSV/TSV
  headers?: boolean; // include headers in CSV
}

// Export result
export interface ExportResult {
  success: boolean;
  filename?: string;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
  metadata?: {
    recordsExported: number;
    exportTime: number;
    compressionRatio?: number;
  };
}

// CSV field configuration
interface CSVFieldConfig {
  key: string;
  header: string;
  formatter?: (value: any) => string;
  precision?: number;
}

// Parameter export formats
export type ParameterExportFormat = "json" | "json-simple" | "csv" | "template";

// Enhanced parameter export options
export interface ParameterExportOptions {
  format: ParameterExportFormat;
  includeMetadata?: boolean;
  includeDocumentation?: boolean;
  includeValidationRules?: boolean;
  includeExamples?: boolean;
  filename?: string;
  validate?: boolean;
  templateMode?: boolean;
}

// Enhanced parameter export data structure
export interface ParameterExportData {
  version: string;
  type: "parameter_set";
  exportTimestamp: string;
  metadata: {
    applicationVersion: string;
    schemaVersion: string;
    exportFormat: ParameterExportFormat;
    description?: string;
    tags?: string[];
    author?: string;
    compatibility: {
      minAppVersion: string;
      maxAppVersion?: string;
      requiredFeatures: string[];
    };
  };
  parameters: Record<string, unknown>;
  documentation?: {
    description: string;
    parameterDescriptions: Record<string, string>;
    validationRules: Record<string, any>;
    examples: Record<string, any>;
    usageNotes: string[];
    bestPractices: string[];
  };
  validation: {
    isValid: boolean;
    validatedAt: string;
    schema: string;
    errors?: any[];
  };
}

/**
 * Comprehensive Data Export Service
 * Handles export of simulation data in multiple formats
 */
export class DataExportService {
  private static readonly VERSION = "1.0.0";
  private static readonly DEFAULT_PRECISION = 6;

  /**
   * Export simulation data in the specified format
   */
  static async exportSimulationData(
    data: PopulationDataPoint[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Validate input data
      if (!data || data.length === 0) {
        throw new Error("No data to export");
      }

      // Create export data structure
      const exportData = this.createExportData(data, options);

      // Generate filename if not provided
      const filename = this.generateFilename(options);

      // Export based on format
      let result: ExportResult;
      switch (options.format) {
        case "json":
          result = await this.exportJSON(exportData, filename, options);
          break;
        case "csv":
          result = await this.exportCSV(exportData, filename, options);
          break;
        case "tsv":
          result = await this.exportTSV(exportData, filename, options);
          break;
        case "xlsx":
          result = await this.exportXLSX(exportData, filename, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Add timing metadata
      result.metadata = {
        recordsExported: result.metadata?.recordsExported || 0,
        exportTime: Date.now() - startTime,
        ...result.metadata,
      };

      // Show success toast
      toast.success(
        `Data exported successfully as ${options.format.toUpperCase()}`,
        {
          description: `${
            result.metadata?.recordsExported || 0
          } records exported in ${result.metadata?.exportTime || 0}ms`,
        }
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Export failed";

      toast.error("Export failed", {
        description: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        metadata: {
          recordsExported: 0,
          exportTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Export session data including all simulations
   */
  static async exportSessionData(
    session: Session,
    simulationData: Record<string, PopulationDataPoint[]>,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const sessionExportData = {
        session: {
          metadata: session.metadata,
          config: session.config,
          performance: session.performance,
          simulations: session.simulations,
        },
        simulationData,
        exportMetadata: {
          version: this.VERSION,
          exportTimestamp: new Date().toISOString(),
          exportFormat: options.format,
          totalSimulations: session.simulations.length,
        },
      };

      const filename =
        options.filename ||
        `session-${session.metadata.name}-${Date.now()}.${options.format}`;

      if (options.format === "json") {
        return this.exportJSON(sessionExportData, filename, options);
      } else {
        // For CSV/TSV, flatten the data
        const flattenedData = this.flattenSessionData(sessionExportData);
        return this.exportCSV(flattenedData, filename, options);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Session export failed";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create comprehensive export data structure
   */
  private static createExportData(
    data: PopulationDataPoint[],
    options: ExportOptions
  ): SimulationExportData {
    const statistics = this.calculateStatistics(data);

    return {
      metadata: {
        version: this.VERSION,
        exportTimestamp: new Date().toISOString(),
        totalGenerations: data.length,
        totalDataPoints: data.length,
        exportFormat: options.format,
        applicationVersion: "1.0.0", // Could be from package.json
      },
      populationData: data,
      ...(options.includeStatistics && { statistics }),
    };
  }

  /**
   * Calculate statistics from population data
   */
  private static calculateStatistics(data: PopulationDataPoint[]) {
    if (data.length === 0) {
      return {
        averagePopulation: 0,
        peakPopulation: 0,
        averageResistance: 0,
        peakResistance: 0,
        finalResistancePercentage: 0,
        populationGrowthRate: 0,
        extinctionEvents: 0,
      };
    }

    const populations = data.map(d => d.totalPopulation);
    const resistantPops = data.map(d => d.resistantPopulation);
    const resistancePercentages = data.map(
      d => (d.resistantPopulation / d.totalPopulation) * 100
    );

    const averagePopulation =
      populations.reduce((a, b) => a + b, 0) / populations.length;
    const peakPopulation = Math.max(...populations);
    const averageResistance =
      resistancePercentages.reduce((a, b) => a + b, 0) /
      resistancePercentages.length;
    const peakResistance = Math.max(...resistancePercentages);

    // Find resistance emergence generation (first time resistance > 1%)
    const resistanceEmergenceGeneration = data.findIndex(
      d => d.resistantPopulation / d.totalPopulation > 0.01
    );

    const finalResistancePercentage =
      resistancePercentages[resistancePercentages.length - 1] || 0;

    // Calculate population growth rate
    const growthRates = populations.slice(1).map((pop, i) => {
      const prevPop = populations[i];
      return prevPop > 0 ? (pop - prevPop) / prevPop : 0;
    });
    const populationGrowthRate =
      growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

    // Count extinction events (population drops to 0)
    const extinctionEvents = populations.filter(pop => pop === 0).length;

    return {
      averagePopulation: Number(averagePopulation.toFixed(2)),
      peakPopulation,
      averageResistance: Number(averageResistance.toFixed(2)),
      peakResistance: Number(peakResistance.toFixed(2)),
      resistanceEmergenceGeneration:
        resistanceEmergenceGeneration >= 0
          ? resistanceEmergenceGeneration
          : undefined,
      finalResistancePercentage: Number(finalResistancePercentage.toFixed(2)),
      populationGrowthRate: Number(populationGrowthRate.toFixed(4)),
      extinctionEvents,
    };
  }

  /**
   * Export data as JSON
   */
  private static async exportJSON(
    data: any,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const jsonString = JSON.stringify(data, null, options.compression ? 0 : 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    const downloadUrl = this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      downloadUrl,
      metadata: {
        recordsExported:
          data.populationData?.length || Object.keys(data).length,
        exportTime: 0, // Will be set by caller
      },
    };
  }

  /**
   * Export data as CSV
   */
  private static async exportCSV(
    data: SimulationExportData,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const delimiter = options.delimiter || ",";
    const precision = options.precision || this.DEFAULT_PRECISION;

    // Define CSV fields
    const fields: CSVFieldConfig[] = [
      { key: "generation", header: "Generation" },
      { key: "timestamp", header: "Timestamp" },
      { key: "totalPopulation", header: "Total Population" },
      { key: "resistantPopulation", header: "Resistant Population" },
      { key: "sensitivePopulation", header: "Sensitive Population" },
      {
        key: "resistancePercentage",
        header: "Resistance Percentage",
        formatter: (value: any) => {
          // This will be calculated dynamically in the CSV generation
          return value;
        },
      },
      {
        key: "antibioticConcentration",
        header: "Antibiotic Concentration",
        precision,
      },
    ];

    // Create CSV content
    let csvContent = "";

    // Add headers if requested
    if (options.headers !== false) {
      csvContent += fields.map(field => field.header).join(delimiter) + "\n";
    }

    // Add data rows
    data.populationData.forEach(point => {
      const row = fields.map(field => {
        let value = (point as any)[field.key];

        if (field.key === "resistancePercentage") {
          value =
            point.totalPopulation > 0
              ? (
                  (point.resistantPopulation / point.totalPopulation) *
                  100
                ).toFixed(precision)
              : "0";
        } else if (typeof value === "number" && field.precision !== undefined) {
          value = value.toFixed(field.precision);
        } else if (field.formatter) {
          value = field.formatter(value);
        }

        // Escape values that contain delimiter or quotes
        if (
          typeof value === "string" &&
          (value.includes(delimiter) || value.includes('"'))
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      });

      csvContent += row.join(delimiter) + "\n";
    });

    // Add metadata as comments if included
    if (options.includeMetadata && data.metadata) {
      const metadataComments = Object.entries(data.metadata)
        .map(([key, value]) => `# ${key}: ${value}`)
        .join("\n");
      csvContent = metadataComments + "\n\n" + csvContent;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const downloadUrl = this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      downloadUrl,
      metadata: {
        recordsExported: data.populationData.length,
        exportTime: 0,
      },
    };
  }

  /**
   * Export data as TSV (Tab-Separated Values)
   */
  private static async exportTSV(
    data: SimulationExportData,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    return this.exportCSV(data, filename, { ...options, delimiter: "\t" });
  }

  /**
   * Export data as Excel (XLSX) - Basic implementation
   * Note: For full Excel support, consider using a library like SheetJS
   */
  private static async exportXLSX(
    data: SimulationExportData,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    // For now, export as CSV with Excel-compatible format
    // In a full implementation, you'd use a library like xlsx or SheetJS
    const csvResult = await this.exportCSV(
      data,
      filename.replace(".xlsx", ".csv"),
      {
        ...options,
        delimiter: ",",
        headers: true,
      }
    );

    return {
      ...csvResult,
      filename: filename.replace(".csv", ".xlsx"),
    };
  }

  /**
   * Generate filename based on options and current date
   */
  private static generateFilename(options: ExportOptions): string {
    if (options.filename) {
      return options.filename;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");

    return `bacterial-simulation-${timestamp}-${timeStr}.${options.format}`;
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

    // Clean up URL after a delay to allow download
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return url;
  }

  /**
   * Flatten session data for CSV export
   */
  private static flattenSessionData(sessionData: any): SimulationExportData {
    // Combine all simulation data into a single dataset
    const allData: PopulationDataPoint[] = [];

    Object.entries(sessionData.simulationData).forEach(([simId, data]) => {
      (data as PopulationDataPoint[]).forEach((point, index) => {
        allData.push({
          ...point,
          simulationId: simId,
          dataPointIndex: index,
        } as any);
      });
    });

    return {
      metadata: {
        ...sessionData.exportMetadata,
        totalGenerations: allData.length,
        totalDataPoints: allData.length,
      },
      populationData: allData,
    };
  }

  /**
   * Enhanced parameter set export with validation and documentation
   */
  static exportParameterSet(
    parameters: Record<string, unknown>,
    options: ParameterExportOptions,
    metadata?: Record<string, unknown>
  ): ExportResult {
    try {
      // Validate parameters if requested
      let validationResult: any = {
        success: true,
        data: parameters,
        errors: null,
      };
      if (options.validate !== false) {
        validationResult = validateSimulationParameters(parameters);
      }

      // Create comprehensive parameter export data
      const parameterExportData: ParameterExportData = {
        version: this.VERSION,
        type: "parameter_set",
        exportTimestamp: new Date().toISOString(),
        metadata: {
          applicationVersion: this.VERSION,
          schemaVersion: "1.0.0",
          exportFormat: options.format,
          description:
            (metadata?.description as string) ||
            "Bacterial simulation parameter set",
          tags: (metadata?.tags as string[]) || [
            "simulation",
            "bacterial-evolution",
          ],
          author: (metadata?.author as string) || "KDS Simulation User",
          compatibility: {
            minAppVersion: "1.0.0",
            requiredFeatures: [
              "population-dynamics",
              "spatial-simulation",
              "hgt",
            ],
          },
        },
        parameters: validationResult.success
          ? validationResult.data
          : parameters,
        validation: {
          isValid: validationResult.success,
          validatedAt: new Date().toISOString(),
          schema: "simulationParametersSchema",
          errors: validationResult.errors,
        },
      };

      // Add documentation if requested
      if (options.includeDocumentation !== false) {
        parameterExportData.documentation =
          this.generateParameterDocumentation(parameters);
      }

      // Generate filename
      const filename =
        options.filename || this.generateParameterFilename(options.format);

      // Export based on format
      switch (options.format) {
        case "json":
          return this.exportParametersAsJSON(
            parameterExportData,
            filename,
            options
          );
        case "json-simple":
          return this.exportParametersAsSimpleJSON(
            parameterExportData,
            filename
          );
        case "csv":
          return this.exportParametersAsCSV(parameterExportData, filename);
        case "template":
          return this.exportParametersAsTemplate(parameterExportData, filename);
        default:
          throw new Error(
            `Unsupported parameter export format: ${options.format}`
          );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Parameter export failed";

      toast.error("Parameter export failed", {
        description: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate parameter documentation from schema
   */
  private static generateParameterDocumentation(
    parameters: Record<string, unknown>
  ) {
    return {
      description:
        "Bacterial evolution simulation parameters for modeling antibiotic resistance development",
      parameterDescriptions: {
        populationSize:
          "Initial number of bacterial cells in the population (1,000-100,000)",
        generations: "Number of generations to simulate (10-1,000)",
        mutationRate:
          "Probability of mutation per bacterium per generation (0.01%-1%)",
        hgtRate: "Horizontal gene transfer rate between bacteria (0.1%-10%)",
        initialResistanceFrequency:
          "Initial fraction of population with resistance (0.1%-50%)",
        antibioticConcentration: "Relative antibiotic concentration (0.1x-10x)",
        fitnessValues:
          "Fitness parameters for resistant and sensitive bacteria",
        gridSize:
          "Spatial grid dimensions for spatial simulation (50x50 to 200x200 cells)",
      },
      validationRules: {
        populationSize: "Integer between 1,000 and 100,000",
        generations: "Integer between 10 and 1,000",
        mutationRate: "Float between 0.0001 and 0.01",
        hgtRate: "Float between 0.001 and 0.1",
        initialResistanceFrequency: "Float between 0.001 and 0.5",
        antibioticConcentration: "Float between 0.1 and 10",
        "fitnessValues.resistantFitness": "Float between 0.1 and 1.5",
        "fitnessValues.sensitiveFitness": "Float between 0.1 and 1.5",
        "fitnessValues.resistanceCost": "Float between 0 and 0.5",
        "gridSize.width": "Integer between 50 and 200",
        "gridSize.height": "Integer between 50 and 200",
      },
      examples: {
        basic: {
          populationSize: 10000,
          generations: 100,
          mutationRate: 0.001,
          hgtRate: 0.01,
          initialResistanceFrequency: 0.01,
          antibioticConcentration: 1.0,
          fitnessValues: {
            resistantFitness: 0.9,
            sensitiveFitness: 1.0,
            resistanceCost: 0.1,
          },
          gridSize: { width: 100, height: 100 },
        },
        highSelection: {
          populationSize: 20000,
          generations: 200,
          mutationRate: 0.005,
          hgtRate: 0.05,
          initialResistanceFrequency: 0.001,
          antibioticConcentration: 5.0,
          fitnessValues: {
            resistantFitness: 1.2,
            sensitiveFitness: 0.3,
            resistanceCost: 0.2,
          },
          gridSize: { width: 150, height: 150 },
        },
      },
      usageNotes: [
        "Higher antibiotic concentrations favor resistance evolution",
        "Large population sizes allow for more complex evolutionary dynamics",
        "Horizontal gene transfer accelerates resistance spread",
        "Grid size affects spatial clustering and local competition",
        "Resistance cost should be balanced against fitness advantages",
      ],
      bestPractices: [
        "Start with default parameters and modify incrementally",
        "Use higher mutation rates for exploratory simulations",
        "Enable spatial simulation for realistic population dynamics",
        "Consider computational constraints with large populations",
        "Validate parameter combinations before running long simulations",
      ],
    };
  }

  /**
   * Export parameters as full JSON with metadata
   */
  private static exportParametersAsJSON(
    data: ParameterExportData,
    filename: string,
    options: ParameterExportOptions
  ): ExportResult {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const downloadUrl = this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      downloadUrl,
      metadata: {
        recordsExported: Object.keys(data.parameters).length,
        exportTime: 0,
      },
    };
  }

  /**
   * Export parameters as simple JSON (parameters only)
   */
  private static exportParametersAsSimpleJSON(
    data: ParameterExportData,
    filename: string
  ): ExportResult {
    const simpleData = {
      parameters: data.parameters,
      exportedAt: data.exportTimestamp,
      valid: data.validation.isValid,
    };

    const jsonString = JSON.stringify(simpleData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const downloadUrl = this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      downloadUrl,
      metadata: {
        recordsExported: Object.keys(data.parameters).length,
        exportTime: 0,
      },
    };
  }

  /**
   * Export parameters as CSV for spreadsheet editing
   */
  private static exportParametersAsCSV(
    data: ParameterExportData,
    filename: string
  ): ExportResult {
    const flattenObject = (obj: any, prefix = ""): Record<string, any> => {
      const flattened: Record<string, any> = {};

      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      }

      return flattened;
    };

    const flatParams = flattenObject(data.parameters);
    const headers = ["Parameter", "Value", "Description", "Validation Rule"];
    const rows = [headers];

    Object.entries(flatParams).forEach(([key, value]) => {
      const description = data.documentation?.parameterDescriptions[key] || "";
      const validationRule = data.documentation?.validationRules[key] || "";
      rows.push([key, String(value), description, validationRule]);
    });

    const csvContent = rows
      .map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const downloadUrl = this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      downloadUrl,
      metadata: {
        recordsExported: Object.keys(flatParams).length,
        exportTime: 0,
      },
    };
  }

  /**
   * Export parameters as template with examples
   */
  private static exportParametersAsTemplate(
    data: ParameterExportData,
    filename: string
  ): ExportResult {
    const template = {
      _metadata: {
        type: "parameter_template",
        description: "Template for bacterial simulation parameters",
        usage: "Copy and modify the example parameters below",
        documentation: data.documentation,
      },
      examples: data.documentation?.examples || {},
      template: data.parameters,
      validation: {
        required: Object.keys(data.parameters),
        schema: data.validation.schema,
      },
    };

    const jsonString = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const downloadUrl = this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      downloadUrl,
      metadata: {
        recordsExported: Object.keys(data.parameters).length,
        exportTime: 0,
      },
    };
  }

  /**
   * Generate filename for parameter export
   */
  private static generateParameterFilename(
    format: ParameterExportFormat
  ): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");

    const extensions: Record<ParameterExportFormat, string> = {
      json: "json",
      "json-simple": "json",
      csv: "csv",
      template: "json",
    };

    const prefixes: Record<ParameterExportFormat, string> = {
      json: "parameters",
      "json-simple": "parameters-simple",
      csv: "parameters",
      template: "parameter-template",
    };

    return `${prefixes[format]}-${timestamp}-${timeStr}.${extensions[format]}`;
  }
}

// React hook for data export functionality
export interface UseDataExportReturn {
  exportData: (
    data: PopulationDataPoint[],
    options: ExportOptions
  ) => Promise<ExportResult>;
  exportSession: (
    session: Session,
    simulationData: Record<string, PopulationDataPoint[]>,
    options: ExportOptions
  ) => Promise<ExportResult>;
  exportParameters: (
    parameters: Record<string, unknown>,
    options: ParameterExportOptions,
    metadata?: Record<string, unknown>
  ) => Promise<ExportResult>;
  isExporting: boolean;
  lastExport: Date | null;
  error: string | null;
  clearError: () => void;
}

export const useDataExport = (): UseDataExportReturn => {
  const [isExporting, setIsExporting] = React.useState(false);
  const [lastExport, setLastExport] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const exportData = async (
    data: PopulationDataPoint[],
    options: ExportOptions
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setError(null);

    try {
      const result = await DataExportService.exportSimulationData(
        data,
        options
      );
      if (result.success) {
        setLastExport(new Date());
      } else {
        setError(result.error || "Export failed");
      }
      return result;
    } finally {
      setIsExporting(false);
    }
  };

  const exportSession = async (
    session: Session,
    simulationData: Record<string, PopulationDataPoint[]>,
    options: ExportOptions
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setError(null);

    try {
      const result = await DataExportService.exportSessionData(
        session,
        simulationData,
        options
      );
      if (result.success) {
        setLastExport(new Date());
      } else {
        setError(result.error || "Session export failed");
      }
      return result;
    } finally {
      setIsExporting(false);
    }
  };

  const exportParameters = async (
    parameters: Record<string, unknown>,
    options: ParameterExportOptions,
    metadata?: Record<string, unknown>
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setError(null);

    try {
      const result = await DataExportService.exportParameterSet(
        parameters,
        options,
        metadata
      );
      if (result.success) {
        setLastExport(new Date());
      } else {
        setError(result.error || "Parameter export failed");
      }
      return result;
    } finally {
      setIsExporting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    exportData,
    exportSession,
    exportParameters,
    isExporting,
    lastExport,
    error,
    clearError,
  };
};

// Need to import React for the hook
import React from "react";
