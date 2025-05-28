import { z } from "zod";

export const simulationParametersSchema = z.object({
  populationSize: z
    .number()
    .min(1000, "Population size must be at least 1,000")
    .max(100000, "Population size cannot exceed 100,000")
    .int("Population size must be a whole number"),

  generations: z
    .number()
    .min(10, "Must simulate at least 10 generations")
    .max(1000, "Cannot exceed 1,000 generations")
    .int("Number of generations must be a whole number"),

  mutationRate: z
    .number()
    .min(0.0001, "Mutation rate must be at least 0.01%")
    .max(0.01, "Mutation rate cannot exceed 1%")
    .refine((val) => val >= 0, "Mutation rate must be positive"),

  hgtRate: z
    .number()
    .min(0.001, "HGT rate must be at least 0.1%")
    .max(0.1, "HGT rate cannot exceed 10%")
    .refine((val) => val >= 0, "HGT rate must be positive"),

  initialResistanceFrequency: z
    .number()
    .min(0.001, "Initial resistance frequency must be at least 0.1%")
    .max(0.5, "Initial resistance frequency cannot exceed 50%")
    .refine((val) => val >= 0, "Initial resistance frequency must be positive"),

  antibioticConcentration: z
    .number()
    .min(0.1, "Antibiotic concentration must be at least 0.1x")
    .max(10, "Antibiotic concentration cannot exceed 10x")
    .refine((val) => val > 0, "Antibiotic concentration must be positive"),

  fitnessValues: z.object({
    resistantFitness: z
      .number()
      .min(0.1, "Resistant fitness must be at least 0.1")
      .max(1.5, "Resistant fitness cannot exceed 1.5")
      .refine((val) => val > 0, "Resistant fitness must be positive"),

    sensitiveFitness: z
      .number()
      .min(0.1, "Sensitive fitness must be at least 0.1")
      .max(1.5, "Sensitive fitness cannot exceed 1.5")
      .refine((val) => val > 0, "Sensitive fitness must be positive"),

    resistanceCost: z
      .number()
      .min(0, "Resistance cost cannot be negative")
      .max(0.5, "Resistance cost cannot exceed 0.5")
      .refine((val) => val >= 0, "Resistance cost must be non-negative"),
  }).refine(
    (data) => data.resistantFitness + data.resistanceCost <= data.sensitiveFitness + 0.5,
    {
      message: "Fitness values are biologically unrealistic",
      path: ["resistantFitness"],
    }
  ),

  gridSize: z.object({
    width: z
      .number()
      .min(50, "Grid width must be at least 50")
      .max(200, "Grid width cannot exceed 200")
      .int("Grid width must be a whole number"),

    height: z
      .number()
      .min(50, "Grid height must be at least 50")
      .max(200, "Grid height cannot exceed 200")
      .int("Grid height must be a whole number"),
  }).refine(
    (data) => data.width * data.height <= 40000,
    {
      message: "Total grid size cannot exceed 40,000 cells for performance reasons",
      path: ["width"],
    }
  ),
});

export type SimulationParameters = z.infer<typeof simulationParametersSchema>;

// Validation helper functions
export const validateSimulationParameters = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: simulationParametersSchema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.format(),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: { _errors: ["Unknown validation error"] },
    };
  }
};

// Individual parameter validators for real-time validation
export const parameterValidators = {
  populationSize: (value: number) => {
    try {
      simulationParametersSchema.shape.populationSize.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || "Invalid value";
      }
      return "Invalid value";
    }
  },

  generations: (value: number) => {
    try {
      simulationParametersSchema.shape.generations.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || "Invalid value";
      }
      return "Invalid value";
    }
  },

  mutationRate: (value: number) => {
    try {
      simulationParametersSchema.shape.mutationRate.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || "Invalid value";
      }
      return "Invalid value";
    }
  },

  hgtRate: (value: number) => {
    try {
      simulationParametersSchema.shape.hgtRate.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || "Invalid value";
      }
      return "Invalid value";
    }
  },

  initialResistanceFrequency: (value: number) => {
    try {
      simulationParametersSchema.shape.initialResistanceFrequency.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || "Invalid value";
      }
      return "Invalid value";
    }
  },

  antibioticConcentration: (value: number) => {
    try {
      simulationParametersSchema.shape.antibioticConcentration.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || "Invalid value";
      }
      return "Invalid value";
    }
  },
}; 