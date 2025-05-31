import {
  DataExportService,
  ParameterExportOptions,
} from "../lib/export-service";
import { ParameterExportUtils } from "../lib/parameter-export-utils";
import { SimulationParameters } from "../lib/validation";

// Mock toast from sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Parameter Export Functionality", () => {
  const testParameters: SimulationParameters = {
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
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("DataExportService.exportParameterSet", () => {
    it("should export parameters in JSON format", () => {
      const options: ParameterExportOptions = {
        format: "json",
        includeMetadata: true,
        includeDocumentation: true,
      };

      const result = DataExportService.exportParameterSet(
        testParameters,
        options,
        { description: "Test export" }
      );

      expect(result.success).toBe(true);
      expect(result.filename).toContain("parameters-");
      expect(result.filename).toContain(".json");
      expect(result.metadata?.recordsExported).toBe(
        Object.keys(testParameters).length
      );
    });

    it("should export parameters in CSV format", () => {
      const options: ParameterExportOptions = {
        format: "csv",
        includeDocumentation: true,
      };

      const result = DataExportService.exportParameterSet(
        testParameters,
        options
      );

      expect(result.success).toBe(true);
      expect(result.filename).toContain("parameters-");
      expect(result.filename).toContain(".csv");
    });

    it("should export parameters as template", () => {
      const options: ParameterExportOptions = {
        format: "template",
        includeExamples: true,
      };

      const result = DataExportService.exportParameterSet(
        testParameters,
        options
      );

      expect(result.success).toBe(true);
      expect(result.filename).toContain("parameter-template-");
      expect(result.filename).toContain(".json");
    });

    it("should validate parameters before export", () => {
      const invalidParameters = {
        ...testParameters,
        populationSize: -1, // Invalid
      };

      const options: ParameterExportOptions = {
        format: "json",
        validate: true,
      };

      const result = DataExportService.exportParameterSet(
        invalidParameters,
        options
      );

      expect(result.success).toBe(true); // Export should still succeed but include validation errors
    });
  });

  describe("ParameterExportUtils", () => {
    it("should save and retrieve parameter presets", () => {
      const preset = {
        name: "Test Preset",
        description: "Test description",
        parameters: testParameters,
        tags: ["test"],
        author: "Test User",
      };

      const savedPreset = ParameterExportUtils.saveParameterPreset(preset);

      expect(savedPreset.id).toBeDefined();
      expect(savedPreset.createdAt).toBeDefined();
      expect(savedPreset.usageCount).toBe(0);

      const presets = ParameterExportUtils.getParameterPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe("Test Preset");
    });

    it("should delete parameter presets", () => {
      const preset = {
        name: "Test Preset",
        description: "Test description",
        parameters: testParameters,
        tags: ["test"],
      };

      const savedPreset = ParameterExportUtils.saveParameterPreset(preset);
      expect(ParameterExportUtils.getParameterPresets()).toHaveLength(1);

      const deleted = ParameterExportUtils.deleteParameterPreset(
        savedPreset.id
      );
      expect(deleted).toBe(true);
      expect(ParameterExportUtils.getParameterPresets()).toHaveLength(0);
    });

    it("should increment preset usage count", () => {
      const preset = {
        name: "Test Preset",
        description: "Test description",
        parameters: testParameters,
        tags: ["test"],
      };

      const savedPreset = ParameterExportUtils.saveParameterPreset(preset);

      ParameterExportUtils.incrementPresetUsage(savedPreset.id);

      const presets = ParameterExportUtils.getParameterPresets();
      expect(presets[0].usageCount).toBe(1);
    });

    it("should provide default presets", () => {
      const defaultPresets = ParameterExportUtils.getDefaultPresets();

      expect(defaultPresets).toHaveLength(3);
      expect(defaultPresets[0].name).toBe("Basic Simulation");
      expect(defaultPresets[1].name).toBe("High Selection Pressure");
      expect(defaultPresets[2].name).toBe("Spatial Dynamics");

      // Verify all presets have valid parameters
      defaultPresets.forEach(preset => {
        expect(preset.parameters.populationSize).toBeGreaterThan(0);
        expect(preset.parameters.generations).toBeGreaterThan(0);
        expect(preset.parameters.mutationRate).toBeGreaterThan(0);
      });
    });

    it("should import parameters from JSON", async () => {
      const exportData = {
        parameters: testParameters,
        metadata: { description: "Test" },
      };

      const result = await ParameterExportUtils.importParameterSet(
        JSON.stringify(exportData),
        "test.json"
      );

      expect(result.success).toBe(true);
      expect(result.parameters).toEqual(testParameters);
    });

    it("should handle import validation errors", async () => {
      const invalidParameters = {
        ...testParameters,
        populationSize: -1, // Invalid
      };

      const exportData = {
        parameters: invalidParameters,
      };

      const result = await ParameterExportUtils.importParameterSet(
        JSON.stringify(exportData),
        "test.json"
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
