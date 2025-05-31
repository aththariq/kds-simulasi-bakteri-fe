/**
 * Data Transformation Utilities for Population Dynamics Visualization
 *
 * This module provides comprehensive data transformation functions for converting
 * bacterial simulation data into chart-ready formats for various visualization types.
 */

// Local type definitions for data points
export interface PopulationDataPoint {
  generation: number;
  totalPopulation: number;
  resistantPopulation: number;
  sensitivePopulation: number;
  antibioticConcentration: number;
  timestamp: string;
}

export interface ResistanceDataPoint {
  generation: number;
  resistanceFrequency: number;
  mutationRate: number;
  selectedGenes: number;
  totalMutations: number;
  fitnessAdvantage: number;
  selectionPressure: number;
  timestamp: string;
}

export interface GrowthDataPoint {
  generation: number;
  populationSize: number;
  growthRate: number;
  carryingCapacity: number;
  populationDensity: number;
  birthRate: number;
  deathRate: number;
  netGrowth: number;
  environmentalStress: number;
  competitionIndex: number;
  timestamp: string;
}

export interface MutationDataPoint {
  generation: number;
  totalMutations: number;
  pointMutations: number;
  insertions: number;
  deletions: number;
  beneficialMutations: number;
  neutralMutations: number;
  deleteriousMutations: number;
  lethalMutations: number;
  mutationRate: number;
  averageFitnessEffect: number;
  mutationSpectrum: number;
  hotspotActivity: number;
  timestamp: string;
}

export interface MutationEvent {
  generation: number;
  type?: string;
  position: number;
  fitness_effect: number;
  mutationType?: string;
  effectType?: string;
  mutation_type?: string;
  effect_type?: string;
}

// Raw simulation data interface from WebSocket/API
export interface RawSimulationData {
  generation?: number;
  timestamp?: string;
  population?: {
    total?: number;
    resistant?: number;
    sensitive?: number;
    birth_rate?: number;
    death_rate?: number;
    growth_rate?: number;
    density?: number;
  };
  environment?: {
    antibiotic_concentration?: number;
    carrying_capacity?: number;
    selection_pressure?: number;
    environmental_stress?: number;
    competition_index?: number;
  };
  genetics?: {
    mutation_rate?: number;
    total_mutations?: number;
    resistance_genes?: number;
    fitness_advantage?: number;
  };
  mutations?: {
    total?: number;
    point?: number;
    insertions?: number;
    deletions?: number;
    beneficial?: number;
    neutral?: number;
    deleterious?: number;
    lethal?: number;
    rate?: number;
    average_fitness_effect?: number;
  };
  events?: Array<{
    generation: number;
    type: string;
    position: number;
    fitness_effect: number;
    mutation_type?: string;
    effect_type?: string;
  }>;
}

// Aggregation options for large datasets
export interface AggregationOptions {
  windowSize?: number; // Number of generations to aggregate
  method?: "average" | "max" | "min" | "sum" | "median";
  preserveEvents?: boolean; // Keep significant events during aggregation
}

// Statistical summary for data quality assessment
export interface DataQualityMetrics {
  totalGenerations: number;
  missingDataPoints: number;
  dataCompleteness: number;
  generationGaps: number[];
  outliers: number[];
  recommendedAggregation?: AggregationOptions;
}

/**
 * Main transformation function for population data
 */
export const transformPopulationData = (
  rawData: RawSimulationData[]
): PopulationDataPoint[] => {
  return rawData.map((update, index) => {
    const population = update.population || {};
    const environment = update.environment || {};
    const totalPop = population.total || 0;
    const resistantPop = population.resistant || 0;
    const sensitivePop = population.sensitive || totalPop - resistantPop;

    return {
      generation: update.generation || index,
      totalPopulation: totalPop,
      resistantPopulation: resistantPop,
      sensitivePopulation: sensitivePop,
      antibioticConcentration: environment.antibiotic_concentration || 0,
      timestamp: update.timestamp || new Date().toISOString(),
    };
  });
};

/**
 * Enhanced resistance evolution data transformation
 */
export const transformResistanceData = (
  rawData: RawSimulationData[]
): ResistanceDataPoint[] => {
  return rawData.map((update, index) => {
    const population = update.population || {};
    const environment = update.environment || {};
    const genetics = update.genetics || {};
    const mutations = update.mutations || {};

    const totalPop = population.total || 1;
    const resistantCount = population.resistant || 0;

    return {
      generation: update.generation || index,
      resistanceFrequency: resistantCount / totalPop,
      mutationRate: genetics.mutation_rate || mutations.rate || 0,
      selectedGenes: genetics.resistance_genes || 0,
      totalMutations: genetics.total_mutations || mutations.total || 0,
      fitnessAdvantage: genetics.fitness_advantage || 0,
      selectionPressure: environment.selection_pressure || 0,
      timestamp: update.timestamp || new Date().toISOString(),
    };
  });
};

/**
 * Population growth dynamics transformation
 */
export const transformGrowthData = (
  rawData: RawSimulationData[]
): GrowthDataPoint[] => {
  return rawData.map((update, index) => {
    const population = update.population || {};
    const environment = update.environment || {};

    const populationSize = population.total || 0;
    const birthRate = population.birth_rate || 0;
    const deathRate = population.death_rate || 0;

    // Calculate growth rate if not provided
    let growthRate = population.growth_rate;
    if (!growthRate && index > 0) {
      const prevSize = rawData[index - 1]?.population?.total || 0;
      growthRate = prevSize > 0 ? (populationSize - prevSize) / prevSize : 0;
    }

    return {
      generation: update.generation || index,
      populationSize,
      growthRate: growthRate || 0,
      carryingCapacity: environment.carrying_capacity || populationSize * 1.5,
      populationDensity: population.density || populationSize / 100,
      birthRate,
      deathRate,
      netGrowth: birthRate - deathRate,
      environmentalStress: environment.environmental_stress || 0,
      competitionIndex: environment.competition_index || 0,
      timestamp: update.timestamp || new Date().toISOString(),
    };
  });
};

/**
 * Mutation tracking data transformation
 */
export const transformMutationData = (
  rawData: RawSimulationData[]
): MutationDataPoint[] => {
  return rawData.map((update, index) => {
    const mutations = update.mutations || {};

    return {
      generation: update.generation || index,
      totalMutations: mutations.total || 0,
      pointMutations: mutations.point || 0,
      insertions: mutations.insertions || 0,
      deletions: mutations.deletions || 0,
      beneficialMutations: mutations.beneficial || 0,
      neutralMutations: mutations.neutral || 0,
      deleteriousMutations: mutations.deleterious || 0,
      lethalMutations: mutations.lethal || 0,
      mutationRate: mutations.rate || 0,
      averageFitnessEffect: mutations.average_fitness_effect || 0,
      // Calculate mutation spectrum diversity
      mutationSpectrum: calculateMutationSpectrum(mutations),
      // Placeholder for hotspot activity - would need genomic position data
      hotspotActivity: Math.random() * 0.5, // Replace with actual calculation
      timestamp: update.timestamp || new Date().toISOString(),
    };
  });
};

/**
 * Extract mutation events for scatter plot visualization
 */
export const extractMutationEvents = (
  rawData: RawSimulationData[]
): MutationEvent[] => {
  const events: MutationEvent[] = [];

  rawData.forEach((update, index) => {
    if (update.events) {
      update.events.forEach(event => {
        events.push({
          generation: update.generation || index,
          type: event.type,
          position: event.position,
          fitness_effect: event.fitness_effect,
          mutationType: event.mutation_type || "point",
          effectType: event.effect_type || "neutral",
        });
      });
    }
  });

  return events;
};

/**
 * Aggregate data for performance optimization with large datasets
 */
export const aggregateData = <
  T extends { generation: number } & Record<string, unknown>
>(
  data: T[],
  options: AggregationOptions
): T[] => {
  const { windowSize = 10, method = "average" } = options;

  if (data.length <= windowSize) return data;

  const aggregated: T[] = [];

  for (let i = 0; i < data.length; i += windowSize) {
    const window = data.slice(i, i + windowSize);
    if (window.length === 0) continue;

    const aggregatedPoint = { ...window[0] };

    // Aggregate numeric fields based on method
    Object.keys(aggregatedPoint).forEach(key => {
      const values = window
        .map(item => item[key])
        .filter(val => typeof val === "number" && !isNaN(val)) as number[];

      if (values.length > 0) {
        switch (method) {
          case "average":
            (aggregatedPoint as Record<string, unknown>)[key] =
              values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case "max":
            (aggregatedPoint as Record<string, unknown>)[key] = Math.max(
              ...values
            );
            break;
          case "min":
            (aggregatedPoint as Record<string, unknown>)[key] = Math.min(
              ...values
            );
            break;
          case "sum":
            (aggregatedPoint as Record<string, unknown>)[key] = values.reduce(
              (a, b) => a + b,
              0
            );
            break;
          case "median":
            const sorted = values.sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            (aggregatedPoint as Record<string, unknown>)[key] =
              sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid];
            break;
        }
      }
    });

    // Use the middle generation for time reference
    aggregatedPoint.generation =
      window[Math.floor(window.length / 2)].generation;

    aggregated.push(aggregatedPoint);
  }

  return aggregated;
};

/**
 * Analyze data quality and provide optimization recommendations
 */
export const analyzeDataQuality = (
  rawData: RawSimulationData[]
): DataQualityMetrics => {
  const totalGenerations = rawData.length;
  let missingDataPoints = 0;
  const generationGaps: number[] = [];
  const outliers: number[] = [];

  // Check for missing data
  rawData.forEach((update, index) => {
    if (!update.population?.total || update.population.total === 0) {
      missingDataPoints++;
    }

    // Check for generation gaps
    if (index > 0) {
      const expectedGen = rawData[index - 1].generation! + 1;
      const actualGen = update.generation || index;
      if (actualGen !== expectedGen) {
        generationGaps.push(actualGen);
      }
    }

    // Simple outlier detection for population size
    if (update.population?.total) {
      const populationSizes = rawData
        .map(d => d.population?.total || 0)
        .filter(size => size > 0);

      const mean =
        populationSizes.reduce((a, b) => a + b, 0) / populationSizes.length;
      const stdDev = Math.sqrt(
        populationSizes.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) /
          populationSizes.length
      );

      if (Math.abs(update.population.total - mean) > 3 * stdDev) {
        outliers.push(update.generation || index);
      }
    }
  });

  const dataCompleteness =
    (totalGenerations - missingDataPoints) / totalGenerations;

  // Recommend aggregation for large datasets
  let recommendedAggregation: AggregationOptions | undefined;
  if (totalGenerations > 1000) {
    recommendedAggregation = {
      windowSize: Math.max(5, Math.floor(totalGenerations / 200)),
      method: "average",
      preserveEvents: true,
    };
  }

  return {
    totalGenerations,
    missingDataPoints,
    dataCompleteness,
    generationGaps,
    outliers,
    recommendedAggregation,
  };
};

/**
 * Calculate mutation spectrum diversity index
 */
function calculateMutationSpectrum(mutations: {
  point?: number;
  insertions?: number;
  deletions?: number;
}): number {
  const types = [
    mutations.point || 0,
    mutations.insertions || 0,
    mutations.deletions || 0,
  ];

  const total = types.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  // Shannon diversity index for mutation types
  const proportions = types.map(count => count / total).filter(p => p > 0);
  return (
    -proportions.reduce((sum, p) => sum + p * Math.log2(p), 0) /
    Math.log2(types.length)
  );
}

/**
 * Normalize data to handle different scales and units
 */
export const normalizeData = <T extends Record<string, unknown>>(
  data: T[],
  fields: (keyof T)[]
): T[] => {
  const normalized = [...data];

  fields.forEach(field => {
    const values = data
      .map(item => item[field])
      .filter(val => typeof val === "number" && !isNaN(val)) as number[];

    if (values.length === 0) return;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) return;

    normalized.forEach(item => {
      if (typeof item[field] === "number") {
        // Create a new object with the normalized value
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mutableItem = item as any;
        mutableItem[field] = ((item[field] as number) - min) / range;
      }
    });
  });

  return normalized;
};

/**
 * Filter data by generation range for focused analysis
 */
export const filterByGenerationRange = <T extends { generation: number }>(
  data: T[],
  startGeneration: number,
  endGeneration: number
): T[] => {
  return data.filter(
    item =>
      item.generation >= startGeneration && item.generation <= endGeneration
  );
};

/**
 * Calculate rolling averages for smoother trend visualization
 */
export const calculateRollingAverage = <T extends Record<string, unknown>>(
  data: T[],
  field: keyof T,
  windowSize: number = 5
): T[] => {
  return data.map((item, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(data.length, start + windowSize);
    const window = data.slice(start, end);

    const values = window
      .map(w => w[field])
      .filter(val => typeof val === "number" && !isNaN(val)) as number[];

    const average =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : item[field];

    return {
      ...item,
      [field]: average,
    };
  });
};
