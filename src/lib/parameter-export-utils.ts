import {
  SimulationParameters,
  validateSimulationParameters,
} from "./validation";
import {
  ParameterExportData,
  ParameterExportOptions,
  ParameterExportFormat,
  DataExportService,
  ExportResult,
} from "./export-service";

/**
 * Parameter Import/Export Utilities
 * Provides high-level functionality for managing parameter sets
 */

// Parameter preset interface
export interface ParameterPreset {
  id: string;
  name: string;
  description: string;
  parameters: SimulationParameters;
  tags: string[];
  author?: string;
  createdAt: string;
  usageCount?: number;
  rating?: number;
}

// Parameter import result
export interface ParameterImportResult {
  success: boolean;
  parameters?: SimulationParameters;
  metadata?: any;
  errors?: string[];
  warnings?: string[];
}

/**
 * Parameter export utilities class
 */
export class ParameterExportUtils {
  private static readonly PRESET_STORAGE_KEY =
    "bacterial-sim-parameter-presets";

  /**
   * Export parameters with preset configuration
   */
  static async exportParameterPreset(
    parameters: SimulationParameters,
    presetInfo: {
      name: string;
      description: string;
      tags?: string[];
      author?: string;
    },
    format: ParameterExportFormat = "json"
  ): Promise<ExportResult> {
    const options: ParameterExportOptions = {
      format,
      includeMetadata: true,
      includeDocumentation: true,
      includeValidationRules: true,
      includeExamples: true,
      validate: true,
      filename: `preset-${presetInfo.name
        .toLowerCase()
        .replace(/\s+/g, "-")}-${Date.now()}.${
        format === "csv" ? "csv" : "json"
      }`,
    };

    const metadata = {
      description: presetInfo.description,
      tags: presetInfo.tags || [],
      author: presetInfo.author || "Unknown",
      preset: true,
      presetName: presetInfo.name,
    };

    return DataExportService.exportParameterSet(parameters, options, metadata);
  }

  /**
   * Import parameters from file content
   */
  static async importParameterSet(
    fileContent: string,
    filename: string
  ): Promise<ParameterImportResult> {
    try {
      let data: any;

      // Parse based on file extension
      if (filename.endsWith(".json")) {
        data = JSON.parse(fileContent);
      } else if (filename.endsWith(".csv")) {
        return this.importParametersFromCSV(fileContent);
      } else {
        return {
          success: false,
          errors: ["Unsupported file format. Please use JSON or CSV files."],
        };
      }

      // Extract parameters based on data structure
      let parameters: Record<string, unknown>;
      let metadata: any = {};

      if (data.parameters) {
        // Full export format
        parameters = data.parameters;
        metadata = data.metadata || {};
      } else if (data.template) {
        // Template format
        parameters = data.template;
        metadata = data._metadata || {};
      } else {
        // Simple parameters object
        parameters = data;
      }

      // Validate parameters
      const validationResult = validateSimulationParameters(parameters);

      if (!validationResult.success) {
        return {
          success: false,
          parameters: parameters as SimulationParameters,
          metadata,
          errors: this.extractValidationErrors(validationResult.errors),
        };
      }

      return {
        success: true,
        parameters: validationResult.data,
        metadata,
        warnings: this.checkParameterWarnings(validationResult.data),
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to parse parameter file",
        ],
      };
    }
  }

  /**
   * Import parameters from CSV format
   */
  private static async importParametersFromCSV(
    csvContent: string
  ): Promise<ParameterImportResult> {
    try {
      const lines = csvContent.split("\n");
      const parameters: Record<string, any> = {};

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = this.parseCSVLine(line);
        if (columns.length < 2) continue;

        const [paramPath, value] = columns;
        this.setNestedProperty(parameters, paramPath, this.parseValue(value));
      }

      const validationResult = validateSimulationParameters(parameters);

      if (!validationResult.success) {
        return {
          success: false,
          parameters: parameters as SimulationParameters,
          errors: this.extractValidationErrors(validationResult.errors),
        };
      }

      return {
        success: true,
        parameters: validationResult.data,
        warnings: this.checkParameterWarnings(validationResult.data),
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          error instanceof Error ? error.message : "Failed to parse CSV file",
        ],
      };
    }
  }

  /**
   * Save parameter preset locally
   */
  static saveParameterPreset(
    preset: Omit<ParameterPreset, "id" | "createdAt">
  ): ParameterPreset {
    const fullPreset: ParameterPreset = {
      ...preset,
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    const presets = this.getParameterPresets();
    presets.push(fullPreset);

    localStorage.setItem(this.PRESET_STORAGE_KEY, JSON.stringify(presets));

    return fullPreset;
  }

  /**
   * Get all saved parameter presets
   */
  static getParameterPresets(): ParameterPreset[] {
    try {
      const stored = localStorage.getItem(this.PRESET_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Delete parameter preset
   */
  static deleteParameterPreset(presetId: string): boolean {
    const presets = this.getParameterPresets();
    const filteredPresets = presets.filter(p => p.id !== presetId);

    if (filteredPresets.length === presets.length) {
      return false; // Preset not found
    }

    localStorage.setItem(
      this.PRESET_STORAGE_KEY,
      JSON.stringify(filteredPresets)
    );
    return true;
  }

  /**
   * Update preset usage count
   */
  static incrementPresetUsage(presetId: string): void {
    const presets = this.getParameterPresets();
    const preset = presets.find(p => p.id === presetId);

    if (preset) {
      preset.usageCount = (preset.usageCount || 0) + 1;
      localStorage.setItem(this.PRESET_STORAGE_KEY, JSON.stringify(presets));
    }
  }

  /**
   * Get default parameter presets
   */
  static getDefaultPresets(): ParameterPreset[] {
    return [
      {
        id: "default-basic",
        name: "Basic Simulation",
        description:
          "Standard parameters for basic bacterial evolution simulation",
        parameters: {
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
        tags: ["basic", "default"],
        author: "KDS Simulation",
        createdAt: new Date().toISOString(),
        usageCount: 0,
      },
      {
        id: "default-high-selection",
        name: "High Selection Pressure",
        description:
          "Parameters for studying evolution under strong antibiotic pressure",
        parameters: {
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
        tags: ["high-selection", "resistance"],
        author: "KDS Simulation",
        createdAt: new Date().toISOString(),
        usageCount: 0,
      },
      {
        id: "default-spatial-focus",
        name: "Spatial Dynamics",
        description: "Optimized for studying spatial patterns and clustering",
        parameters: {
          populationSize: 15000,
          generations: 150,
          mutationRate: 0.002,
          hgtRate: 0.03,
          initialResistanceFrequency: 0.005,
          antibioticConcentration: 2.0,
          fitnessValues: {
            resistantFitness: 1.0,
            sensitiveFitness: 0.8,
            resistanceCost: 0.15,
          },
          gridSize: { width: 200, height: 200 },
        },
        tags: ["spatial", "clustering"],
        author: "KDS Simulation",
        createdAt: new Date().toISOString(),
        usageCount: 0,
      },
    ];
  }

  /**
   * Helper functions
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private static parseValue(value: string): any {
    const trimmed = value.trim();

    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Try to parse as boolean
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;

    // Return as string
    return trimmed;
  }

  private static setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private static extractValidationErrors(errors: any): string[] {
    if (!errors) return [];

    const errorList: string[] = [];

    const extractFromObject = (obj: any, path = ""): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (Array.isArray(value)) {
          errorList.push(...value.map(msg => `${currentPath}: ${msg}`));
        } else if (value && typeof value === "object") {
          extractFromObject(value, currentPath);
        } else if (typeof value === "string") {
          errorList.push(`${currentPath}: ${value}`);
        }
      }
    };

    extractFromObject(errors);
    return errorList;
  }

  private static checkParameterWarnings(
    parameters: SimulationParameters
  ): string[] {
    const warnings: string[] = [];

    // Check for potentially problematic parameter combinations
    if (parameters.populationSize > 50000 && parameters.generations > 500) {
      warnings.push(
        "Large population with many generations may cause performance issues"
      );
    }

    if (parameters.mutationRate > 0.005 && parameters.hgtRate > 0.05) {
      warnings.push(
        "Very high mutation and HGT rates may lead to unrealistic evolution"
      );
    }

    if (
      parameters.antibioticConcentration > 5.0 &&
      parameters.fitnessValues.resistanceCost < 0.05
    ) {
      warnings.push(
        "High antibiotic concentration with low resistance cost may result in rapid fixation"
      );
    }

    if (parameters.gridSize.width * parameters.gridSize.height > 30000) {
      warnings.push("Large grid size may impact simulation performance");
    }

    return warnings;
  }
}

/**
 * React hook for parameter export/import functionality
 */
export interface UseParameterManagerReturn {
  exportPreset: (
    parameters: SimulationParameters,
    presetInfo: {
      name: string;
      description: string;
      tags?: string[];
      author?: string;
    },
    format?: ParameterExportFormat
  ) => Promise<ExportResult>;
  importParameters: (file: File) => Promise<ParameterImportResult>;
  savePreset: (
    preset: Omit<ParameterPreset, "id" | "createdAt">
  ) => ParameterPreset;
  deletePreset: (presetId: string) => boolean;
  presets: ParameterPreset[];
  defaultPresets: ParameterPreset[];
  isExporting: boolean;
  isImporting: boolean;
  error: string | null;
  clearError: () => void;
}

import React from "react";

export const useParameterManager = (): UseParameterManagerReturn => {
  const [presets, setPresets] = React.useState<ParameterPreset[]>([]);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load presets on mount
  React.useEffect(() => {
    setPresets(ParameterExportUtils.getParameterPresets());
  }, []);

  const exportPreset = async (
    parameters: SimulationParameters,
    presetInfo: {
      name: string;
      description: string;
      tags?: string[];
      author?: string;
    },
    format: ParameterExportFormat = "json"
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setError(null);

    try {
      const result = await ParameterExportUtils.exportParameterPreset(
        parameters,
        presetInfo,
        format
      );

      if (!result.success) {
        setError(result.error || "Export failed");
      }

      return result;
    } finally {
      setIsExporting(false);
    }
  };

  const importParameters = async (
    file: File
  ): Promise<ParameterImportResult> => {
    setIsImporting(true);
    setError(null);

    try {
      const content = await file.text();
      const result = await ParameterExportUtils.importParameterSet(
        content,
        file.name
      );

      if (!result.success) {
        setError(result.errors?.join(", ") || "Import failed");
      }

      return result;
    } finally {
      setIsImporting(false);
    }
  };

  const savePreset = (
    preset: Omit<ParameterPreset, "id" | "createdAt">
  ): ParameterPreset => {
    const savedPreset = ParameterExportUtils.saveParameterPreset(preset);
    setPresets(ParameterExportUtils.getParameterPresets());
    return savedPreset;
  };

  const deletePreset = (presetId: string): boolean => {
    const success = ParameterExportUtils.deleteParameterPreset(presetId);
    if (success) {
      setPresets(ParameterExportUtils.getParameterPresets());
    }
    return success;
  };

  const clearError = () => setError(null);

  return {
    exportPreset,
    importParameters,
    savePreset,
    deletePreset,
    presets,
    defaultPresets: ParameterExportUtils.getDefaultPresets(),
    isExporting,
    isImporting,
    error,
    clearError,
  };
};
