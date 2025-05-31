/**
 * Resistance Distribution Analysis Utilities
 *
 * Comprehensive algorithms for analyzing bacterial resistance distribution patterns,
 * including statistical analysis, pattern detection, and temporal trend analysis.
 */

import { z } from "zod";

// ============================
// Type Definitions
// ============================

export interface ResistanceDataPoint {
  generation: number;
  resistanceFrequency: number;
  geneFrequencies: Record<string, number>;
  totalPopulation: number;
  resistantCount: number;
  hgtEvents: number;
  mutationEvents: number;
  fitnessAdvantage: number;
  selectionPressure: number;
  timestamp: string;
}

export interface GeneFrequencyData {
  geneName: string;
  count: number;
  frequency: number;
  hgtDerived: number;
  hgtFrequency: number;
}

export interface ResistancePattern {
  genes: string[];
  frequency: number;
  firstAppearance: number;
  lastSeen: number;
  generations: number[];
  associatedFitness: number;
}

export interface DistributionStatistics {
  mean: number;
  median: number;
  mode: number;
  variance: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  outliers: number[];
}

export interface TrendAnalysis {
  slope: number;
  intercept: number;
  correlation: number;
  pValue: number;
  isSignificant: boolean;
  trendDirection: "increasing" | "decreasing" | "stable";
  confidenceInterval: [number, number];
}

export interface ClusterAnalysis {
  clusters: Array<{
    id: number;
    center: number[];
    members: number[];
    size: number;
    variance: number;
  }>;
  silhouetteScore: number;
  withinClusterSumSquares: number;
  betweenClusterSumSquares: number;
}

export interface OutlierDetection {
  outliers: Array<{
    index: number;
    value: number;
    zScore: number;
    method: "iqr" | "zscore" | "modified_zscore";
    severity: "mild" | "moderate" | "extreme";
  }>;
  cleanedData: number[];
  outlierPercentage: number;
}

// ============================
// Validation Schemas
// ============================

export const ResistanceDataSchema = z.object({
  generation: z.number().min(0),
  resistanceFrequency: z.number().min(0).max(1),
  geneFrequencies: z.record(z.string(), z.number().min(0)),
  totalPopulation: z.number().min(0),
  resistantCount: z.number().min(0),
  hgtEvents: z.number().min(0),
  mutationEvents: z.number().min(0),
  fitnessAdvantage: z.number(),
  selectionPressure: z.number().min(0),
  timestamp: z.string(),
});

// ============================
// Core Statistical Functions
// ============================

export class ResistanceStatistics {
  /**
   * Calculate comprehensive descriptive statistics for a dataset
   */
  static calculateDistributionStatistics(
    data: number[]
  ): DistributionStatistics {
    if (data.length === 0) {
      throw new Error("Cannot calculate statistics for empty dataset");
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;

    // Basic statistics
    const mean = data.reduce((sum, val) => sum + val, 0) / n;
    const median = this.calculateMedian(sorted);
    const mode = this.calculateMode(data);

    // Variance and standard deviation
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const standardDeviation = Math.sqrt(variance);

    // Skewness and kurtosis
    const skewness = this.calculateSkewness(data, mean, standardDeviation);
    const kurtosis = this.calculateKurtosis(data, mean, standardDeviation);

    // Range and quartiles
    const range = sorted[n - 1] - sorted[0];
    const q1 = this.calculateQuartile(sorted, 0.25);
    const q3 = this.calculateQuartile(sorted, 0.75);
    const iqr = q3 - q1;

    // Outlier detection using IQR method
    const outlierThreshold = 1.5 * iqr;
    const outliers = data.filter(
      val => val < q1 - outlierThreshold || val > q3 + outlierThreshold
    );

    return {
      mean,
      median,
      mode,
      variance,
      standardDeviation,
      skewness,
      kurtosis,
      range,
      q1,
      q3,
      iqr,
      outliers,
    };
  }

  private static calculateMedian(sortedData: number[]): number {
    const n = sortedData.length;
    if (n % 2 === 0) {
      return (sortedData[n / 2 - 1] + sortedData[n / 2]) / 2;
    }
    return sortedData[Math.floor(n / 2)];
  }

  private static calculateMode(data: number[]): number {
    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    let mode = data[0];

    data.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
        mode = val;
      }
    });

    return mode;
  }

  private static calculateQuartile(
    sortedData: number[],
    percentile: number
  ): number {
    const index = percentile * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedData.length) {
      return sortedData[sortedData.length - 1];
    }

    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
  }

  private static calculateSkewness(
    data: number[],
    mean: number,
    std: number
  ): number {
    if (std === 0) return 0;

    const n = data.length;
    const sum = data.reduce(
      (acc, val) => acc + Math.pow((val - mean) / std, 3),
      0
    );

    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private static calculateKurtosis(
    data: number[],
    mean: number,
    std: number
  ): number {
    if (std === 0) return 0;

    const n = data.length;
    const sum = data.reduce(
      (acc, val) => acc + Math.pow((val - mean) / std, 4),
      0
    );

    return (
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum -
      (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))
    );
  }
}

// ============================
// Pattern Detection Algorithms
// ============================

export class ResistancePatternAnalysis {
  /**
   * Identify resistance patterns from gene frequency data
   */
  static identifyResistancePatterns(
    data: ResistanceDataPoint[],
    minFrequency: number = 0.01
  ): ResistancePattern[] {
    const patterns: Map<string, ResistancePattern> = new Map();

    data.forEach((point, index) => {
      Object.entries(point.geneFrequencies).forEach(([geneName, frequency]) => {
        if (frequency >= minFrequency) {
          const key = geneName;

          if (!patterns.has(key)) {
            patterns.set(key, {
              genes: [geneName],
              frequency: 0,
              firstAppearance: point.generation,
              lastSeen: point.generation,
              generations: [],
              associatedFitness: 0,
            });
          }

          const pattern = patterns.get(key)!;
          pattern.lastSeen = point.generation;
          pattern.generations.push(point.generation);
          pattern.frequency = Math.max(pattern.frequency, frequency);
          pattern.associatedFitness = point.fitnessAdvantage;
        }
      });
    });

    return Array.from(patterns.values()).sort(
      (a, b) => b.frequency - a.frequency
    );
  }

  /**
   * Detect co-occurring resistance genes
   */
  static detectGeneCooccurrence(
    data: ResistanceDataPoint[],
    threshold: number = 0.5
  ): Array<{ genes: string[]; cooccurrenceScore: number; frequency: number }> {
    const geneNames = new Set<string>();
    data.forEach(point => {
      Object.keys(point.geneFrequencies).forEach(gene => geneNames.add(gene));
    });

    const genes = Array.from(geneNames);
    const cooccurrences: Array<{
      genes: string[];
      cooccurrenceScore: number;
      frequency: number;
    }> = [];

    // Check all pairs of genes
    for (let i = 0; i < genes.length; i++) {
      for (let j = i + 1; j < genes.length; j++) {
        const gene1 = genes[i];
        const gene2 = genes[j];

        let cooccurrenceCount = 0;
        let totalOccurrences = 0;

        data.forEach(point => {
          const freq1 = point.geneFrequencies[gene1] || 0;
          const freq2 = point.geneFrequencies[gene2] || 0;

          if (freq1 > 0 || freq2 > 0) {
            totalOccurrences++;
            if (freq1 > 0 && freq2 > 0) {
              cooccurrenceCount++;
            }
          }
        });

        if (totalOccurrences > 0) {
          const cooccurrenceScore = cooccurrenceCount / totalOccurrences;
          const frequency = Math.max(
            ...data.map(point =>
              Math.min(
                point.geneFrequencies[gene1] || 0,
                point.geneFrequencies[gene2] || 0
              )
            )
          );

          if (cooccurrenceScore >= threshold) {
            cooccurrences.push({
              genes: [gene1, gene2],
              cooccurrenceScore,
              frequency,
            });
          }
        }
      }
    }

    return cooccurrences.sort(
      (a, b) => b.cooccurrenceScore - a.cooccurrenceScore
    );
  }
}

// ============================
// Temporal Trend Analysis
// ============================

export class ResistanceTrendAnalysis {
  /**
   * Perform linear regression analysis on resistance frequency over time
   */
  static analyzeTrend(data: ResistanceDataPoint[]): TrendAnalysis {
    if (data.length < 2) {
      throw new Error("Need at least 2 data points for trend analysis");
    }

    const x = data.map(point => point.generation);
    const y = data.map(point => point.resistanceFrequency);

    const { slope, intercept, correlation } = this.linearRegression(x, y);
    const { pValue, isSignificant } = this.calculateSignificance(
      x,
      y,
      slope,
      intercept
    );
    const confidenceInterval = this.calculateConfidenceInterval(x, y, slope);

    let trendDirection: "increasing" | "decreasing" | "stable" = "stable";
    if (Math.abs(slope) > 0.001) {
      trendDirection = slope > 0 ? "increasing" : "decreasing";
    }

    return {
      slope,
      intercept,
      correlation,
      pValue,
      isSignificant,
      trendDirection,
      confidenceInterval,
    };
  }

  private static linearRegression(
    x: number[],
    y: number[]
  ): { slope: number; intercept: number; correlation: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, intercept, correlation };
  }

  private static calculateSignificance(
    x: number[],
    y: number[],
    slope: number,
    intercept: number
  ): { pValue: number; isSignificant: boolean } {
    const n = x.length;
    const yPred = x.map(xi => slope * xi + intercept);
    const residuals = y.map((yi, i) => yi - yPred[i]);
    const sse = residuals.reduce((acc, r) => acc + r * r, 0);
    const mse = sse / (n - 2);

    const sumX = x.reduce((a, b) => a + b, 0);
    const meanX = sumX / n;
    const sxx = x.reduce((acc, xi) => acc + (xi - meanX) ** 2, 0);

    const slopeStdError = Math.sqrt(mse / sxx);
    const tStat = Math.abs(slope / slopeStdError);

    // Simplified p-value calculation (assumes normal distribution)
    const pValue = 2 * (1 - this.normalCDF(tStat));
    const isSignificant = pValue < 0.05;

    return { pValue, isSignificant };
  }

  private static normalCDF(x: number): number {
    // Approximation of the standard normal cumulative distribution function
    return (
      0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp((-2 * x * x) / Math.PI)))
    );
  }

  private static calculateConfidenceInterval(
    x: number[],
    y: number[],
    slope: number
  ): [number, number] {
    // Simplified 95% confidence interval calculation
    const n = x.length;
    const standardError = Math.sqrt(
      y.reduce((acc, yi, i) => acc + (yi - slope * x[i]) ** 2, 0) / (n - 2)
    );

    const margin = 1.96 * standardError; // 95% confidence interval
    return [slope - margin, slope + margin];
  }

  /**
   * Detect change points in resistance frequency
   */
  static detectChangePoints(
    data: ResistanceDataPoint[],
    windowSize: number = 5
  ): Array<{
    generation: number;
    changeType: "increase" | "decrease";
    magnitude: number;
  }> {
    if (data.length < windowSize * 2) {
      return [];
    }

    const changePoints: Array<{
      generation: number;
      changeType: "increase" | "decrease";
      magnitude: number;
    }> = [];

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const beforeWindow = data.slice(i - windowSize, i);
      const afterWindow = data.slice(i, i + windowSize);

      const beforeMean =
        beforeWindow.reduce(
          (sum, point) => sum + point.resistanceFrequency,
          0
        ) / windowSize;
      const afterMean =
        afterWindow.reduce((sum, point) => sum + point.resistanceFrequency, 0) /
        windowSize;

      const change = afterMean - beforeMean;
      const magnitude = Math.abs(change);

      // Threshold for significant change (can be adjusted)
      if (magnitude > 0.05) {
        changePoints.push({
          generation: data[i].generation,
          changeType: change > 0 ? "increase" : "decrease",
          magnitude,
        });
      }
    }

    return changePoints;
  }
}

// ============================
// Clustering Analysis
// ============================

export class ResistanceClusterAnalysis {
  /**
   * Perform K-means clustering on resistance frequency data
   */
  static kMeansClustering(
    data: number[][],
    k: number,
    maxIterations: number = 100
  ): ClusterAnalysis {
    if (data.length < k) {
      throw new Error("Number of data points must be >= number of clusters");
    }

    // Initialize centroids randomly
    let centroids = this.initializeCentroids(data, k);
    let assignments = new Array(data.length).fill(0);
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < maxIterations) {
      // Assign points to nearest centroid
      const newAssignments = data.map(point =>
        this.findNearestCentroid(point, centroids)
      );

      // Check for convergence
      converged = newAssignments.every(
        (assignment, i) => assignment === assignments[i]
      );
      assignments = newAssignments;

      // Update centroids
      centroids = this.updateCentroids(data, assignments, k);
      iteration++;
    }

    // Calculate cluster statistics
    const clusters = this.buildClusters(data, assignments, centroids);
    const silhouetteScore = this.calculateSilhouetteScore(
      data,
      assignments,
      centroids
    );
    const { withinClusterSumSquares, betweenClusterSumSquares } =
      this.calculateClusterVariances(data, assignments, centroids);

    return {
      clusters,
      silhouetteScore,
      withinClusterSumSquares,
      betweenClusterSumSquares,
    };
  }

  private static initializeCentroids(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const dimensions = data[0].length;

    for (let i = 0; i < k; i++) {
      const centroid: number[] = [];
      for (let j = 0; j < dimensions; j++) {
        const values = data.map(point => point[j]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        centroid.push(min + Math.random() * (max - min));
      }
      centroids.push(centroid);
    }

    return centroids;
  }

  private static findNearestCentroid(
    point: number[],
    centroids: number[][]
  ): number {
    let minDistance = Infinity;
    let nearestIndex = 0;

    centroids.forEach((centroid, index) => {
      const distance = this.euclideanDistance(point, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  private static euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0)
    );
  }

  private static updateCentroids(
    data: number[][],
    assignments: number[],
    k: number
  ): number[][] {
    const centroids: number[][] = [];
    const dimensions = data[0].length;

    for (let cluster = 0; cluster < k; cluster++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === cluster);

      if (clusterPoints.length === 0) {
        // Keep the old centroid if no points assigned
        centroids.push(new Array(dimensions).fill(0));
        continue;
      }

      const centroid: number[] = [];
      for (let dim = 0; dim < dimensions; dim++) {
        const sum = clusterPoints.reduce((acc, point) => acc + point[dim], 0);
        centroid.push(sum / clusterPoints.length);
      }
      centroids.push(centroid);
    }

    return centroids;
  }

  private static buildClusters(
    data: number[][],
    assignments: number[],
    centroids: number[][]
  ): ClusterAnalysis["clusters"] {
    const clusters: ClusterAnalysis["clusters"] = [];

    centroids.forEach((centroid, clusterId) => {
      const members = assignments
        .map((assignment, index) => (assignment === clusterId ? index : -1))
        .filter(index => index !== -1);

      const clusterPoints = members.map(index => data[index]);
      const variance =
        clusterPoints.length > 0
          ? clusterPoints.reduce(
              (sum, point) =>
                sum + this.euclideanDistance(point, centroid) ** 2,
              0
            ) / clusterPoints.length
          : 0;

      clusters.push({
        id: clusterId,
        center: centroid,
        members,
        size: members.length,
        variance,
      });
    });

    return clusters;
  }

  private static calculateSilhouetteScore(
    data: number[][],
    assignments: number[],
    centroids: number[][]
  ): number {
    if (data.length === 0) return 0;

    let totalSilhouette = 0;
    let validPoints = 0;

    data.forEach((point, i) => {
      const cluster = assignments[i];
      const clusterPoints = data.filter(
        (_, j) => assignments[j] === cluster && j !== i
      );

      if (clusterPoints.length === 0) return;

      // Calculate average distance to points in same cluster
      const a =
        clusterPoints.reduce(
          (sum, otherPoint) => sum + this.euclideanDistance(point, otherPoint),
          0
        ) / clusterPoints.length;

      // Calculate average distance to points in nearest other cluster
      let minB = Infinity;
      centroids.forEach((_, otherCluster) => {
        if (otherCluster === cluster) return;

        const otherClusterPoints = data.filter(
          (_, j) => assignments[j] === otherCluster
        );
        if (otherClusterPoints.length === 0) return;

        const b =
          otherClusterPoints.reduce(
            (sum, otherPoint) =>
              sum + this.euclideanDistance(point, otherPoint),
            0
          ) / otherClusterPoints.length;

        minB = Math.min(minB, b);
      });

      if (minB !== Infinity) {
        const silhouette = (minB - a) / Math.max(a, minB);
        totalSilhouette += silhouette;
        validPoints++;
      }
    });

    return validPoints > 0 ? totalSilhouette / validPoints : 0;
  }

  private static calculateClusterVariances(
    data: number[][],
    assignments: number[],
    centroids: number[][]
  ): { withinClusterSumSquares: number; betweenClusterSumSquares: number } {
    const overallCentroid = this.calculateOverallCentroid(data);

    let withinClusterSumSquares = 0;
    let betweenClusterSumSquares = 0;

    centroids.forEach((centroid, clusterId) => {
      const clusterPoints = data.filter((_, i) => assignments[i] === clusterId);

      // Within-cluster sum of squares
      clusterPoints.forEach(point => {
        withinClusterSumSquares += this.euclideanDistance(point, centroid) ** 2;
      });

      // Between-cluster sum of squares
      betweenClusterSumSquares +=
        clusterPoints.length *
        this.euclideanDistance(centroid, overallCentroid) ** 2;
    });

    return { withinClusterSumSquares, betweenClusterSumSquares };
  }

  private static calculateOverallCentroid(data: number[][]): number[] {
    if (data.length === 0) return [];

    const dimensions = data[0].length;
    const centroid: number[] = [];

    for (let dim = 0; dim < dimensions; dim++) {
      const sum = data.reduce((acc, point) => acc + point[dim], 0);
      centroid.push(sum / data.length);
    }

    return centroid;
  }
}

// ============================
// Outlier Detection
// ============================

export class ResistanceOutlierDetection {
  /**
   * Detect outliers using multiple methods
   */
  static detectOutliers(
    data: number[],
    methods: ("iqr" | "zscore" | "modified_zscore")[] = ["iqr", "zscore"]
  ): OutlierDetection {
    const outliers: OutlierDetection["outliers"] = [];
    const outlierIndices = new Set<number>();

    methods.forEach(method => {
      const methodOutliers = this.detectOutliersByMethod(data, method);
      methodOutliers.forEach(outlier => {
        outliers.push(outlier);
        outlierIndices.add(outlier.index);
      });
    });

    // Remove duplicates and sort by index
    const uniqueOutliers = Array.from(
      new Map(outliers.map(o => [o.index, o])).values()
    ).sort((a, b) => a.index - b.index);

    const cleanedData = data.filter((_, index) => !outlierIndices.has(index));
    const outlierPercentage = (outlierIndices.size / data.length) * 100;

    return {
      outliers: uniqueOutliers,
      cleanedData,
      outlierPercentage,
    };
  }

  private static detectOutliersByMethod(
    data: number[],
    method: "iqr" | "zscore" | "modified_zscore"
  ): OutlierDetection["outliers"] {
    switch (method) {
      case "iqr":
        return this.detectOutliersIQR(data);
      case "zscore":
        return this.detectOutliersZScore(data);
      case "modified_zscore":
        return this.detectOutliersModifiedZScore(data);
      default:
        return [];
    }
  }

  private static detectOutliersIQR(
    data: number[]
  ): OutlierDetection["outliers"] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = ResistanceStatistics["calculateQuartile"](sorted, 0.25);
    const q3 = ResistanceStatistics["calculateQuartile"](sorted, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const extremeLowerBound = q1 - 3 * iqr;
    const extremeUpperBound = q3 + 3 * iqr;

    return data
      .map((value, index) => {
        if (value < lowerBound || value > upperBound) {
          let severity: "mild" | "moderate" | "extreme" = "mild";

          if (value < extremeLowerBound || value > extremeUpperBound) {
            severity = "extreme";
          } else if (value < q1 - 2 * iqr || value > q3 + 2 * iqr) {
            severity = "moderate";
          }

          return {
            index,
            value,
            zScore: 0, // Not applicable for IQR method
            method: "iqr" as const,
            severity,
          };
        }
        return null;
      })
      .filter(
        (outlier): outlier is NonNullable<typeof outlier> => outlier !== null
      );
  }

  private static detectOutliersZScore(
    data: number[]
  ): OutlierDetection["outliers"] {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const std = Math.sqrt(
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    );

    if (std === 0) return [];

    return data
      .map((value, index) => {
        const zScore = Math.abs((value - mean) / std);

        if (zScore > 2) {
          let severity: "mild" | "moderate" | "extreme" = "mild";

          if (zScore > 3.5) {
            severity = "extreme";
          } else if (zScore > 3) {
            severity = "moderate";
          }

          return {
            index,
            value,
            zScore,
            method: "zscore" as const,
            severity,
          };
        }
        return null;
      })
      .filter(
        (outlier): outlier is NonNullable<typeof outlier> => outlier !== null
      );
  }

  private static detectOutliersModifiedZScore(
    data: number[]
  ): OutlierDetection["outliers"] {
    const median = ResistanceStatistics["calculateMedian"](
      [...data].sort((a, b) => a - b)
    );
    const deviations = data.map(val => Math.abs(val - median));
    const mad = ResistanceStatistics["calculateMedian"](
      [...deviations].sort((a, b) => a - b)
    );

    if (mad === 0) return [];

    return data
      .map((value, index) => {
        const modifiedZScore = (0.6745 * (value - median)) / mad;
        const absModifiedZScore = Math.abs(modifiedZScore);

        if (absModifiedZScore > 3.5) {
          let severity: "mild" | "moderate" | "extreme" = "mild";

          if (absModifiedZScore > 7) {
            severity = "extreme";
          } else if (absModifiedZScore > 5) {
            severity = "moderate";
          }

          return {
            index,
            value,
            zScore: modifiedZScore,
            method: "modified_zscore" as const,
            severity,
          };
        }
        return null;
      })
      .filter(
        (outlier): outlier is NonNullable<typeof outlier> => outlier !== null
      );
  }
}

// ============================
// Data Preprocessing
// ============================

export class ResistanceDataPreprocessor {
  /**
   * Normalize resistance frequency data for cross-population comparison
   */
  static normalizeData(
    data: number[],
    method: "minmax" | "zscore" | "robust" = "minmax"
  ): number[] {
    if (data.length === 0) return [];

    switch (method) {
      case "minmax":
        return this.minMaxNormalization(data);
      case "zscore":
        return this.zScoreNormalization(data);
      case "robust":
        return this.robustNormalization(data);
      default:
        return data;
    }
  }

  private static minMaxNormalization(data: number[]): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) return data.map(() => 0);

    return data.map(val => (val - min) / range);
  }

  private static zScoreNormalization(data: number[]): number[] {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const std = Math.sqrt(
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    );

    if (std === 0) return data.map(() => 0);

    return data.map(val => (val - mean) / std);
  }

  private static robustNormalization(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const median = ResistanceStatistics["calculateMedian"](sorted);
    const q1 = ResistanceStatistics["calculateQuartile"](sorted, 0.25);
    const q3 = ResistanceStatistics["calculateQuartile"](sorted, 0.75);
    const iqr = q3 - q1;

    if (iqr === 0) return data.map(() => 0);

    return data.map(val => (val - median) / iqr);
  }

  /**
   * Smooth resistance frequency data using moving average
   */
  static smoothData(data: number[], windowSize: number = 3): number[] {
    if (windowSize <= 1 || data.length === 0) return data;

    const smoothed: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(data.length, i + halfWindow + 1);
      const window = data.slice(start, end);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(average);
    }

    return smoothed;
  }

  /**
   * Interpolate missing data points using linear interpolation
   */
  static interpolateMissingData(
    data: Array<{ x: number; y: number | null }>
  ): Array<{ x: number; y: number }> {
    const result: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < data.length; i++) {
      const current = data[i];

      if (current.y !== null) {
        result.push({ x: current.x, y: current.y });
      } else {
        // Find the nearest non-null values before and after
        let beforeIndex = i - 1;
        let afterIndex = i + 1;

        while (beforeIndex >= 0 && data[beforeIndex].y === null) {
          beforeIndex--;
        }

        while (afterIndex < data.length && data[afterIndex].y === null) {
          afterIndex++;
        }

        if (beforeIndex >= 0 && afterIndex < data.length) {
          // Linear interpolation
          const before = data[beforeIndex];
          const after = data[afterIndex];
          const ratio = (current.x - before.x) / (after.x - before.x);
          const interpolatedY = before.y! + ratio * (after.y! - before.y!);

          result.push({ x: current.x, y: interpolatedY });
        } else if (beforeIndex >= 0) {
          // Use the last known value
          result.push({ x: current.x, y: data[beforeIndex].y! });
        } else if (afterIndex < data.length) {
          // Use the next known value
          result.push({ x: current.x, y: data[afterIndex].y! });
        } else {
          // Default to 0 if no reference points
          result.push({ x: current.x, y: 0 });
        }
      }
    }

    return result;
  }
}

// ============================
// Export Service Integration
// ============================

export class ResistanceAnalysisExporter {
  /**
   * Export analysis results in various formats
   */
  static exportAnalysis(
    analysisResults: {
      statistics: DistributionStatistics;
      trends: TrendAnalysis;
      patterns: ResistancePattern[];
      clusters?: ClusterAnalysis;
      outliers?: OutlierDetection;
    },
    format: "json" | "csv" = "json"
  ): string {
    switch (format) {
      case "json":
        return JSON.stringify(analysisResults, null, 2);
      case "csv":
        return this.exportToCSV(analysisResults);
      default:
        return JSON.stringify(analysisResults, null, 2);
    }
  }

  private static exportToCSV(analysisResults: any): string {
    const rows: string[] = [];

    // Add headers
    rows.push("Type,Metric,Value,Description");

    // Statistics
    Object.entries(analysisResults.statistics).forEach(([key, value]) => {
      rows.push(`Statistics,${key},${value},Distribution statistic`);
    });

    // Trends
    Object.entries(analysisResults.trends).forEach(([key, value]) => {
      rows.push(`Trends,${key},${value},Trend analysis metric`);
    });

    // Patterns
    analysisResults.patterns.forEach(
      (pattern: ResistancePattern, index: number) => {
        rows.push(
          `Pattern,Pattern_${index}_genes,"${pattern.genes.join(
            ";"
          )}",Resistance gene pattern`
        );
        rows.push(
          `Pattern,Pattern_${index}_frequency,${pattern.frequency},Pattern frequency`
        );
      }
    );

    return rows.join("\n");
  }
}

// ============================
// Main Analysis Orchestrator
// ============================

export class ResistanceDistributionAnalyzer {
  /**
   * Perform comprehensive resistance distribution analysis
   */
  static async analyzeResistanceDistribution(
    data: ResistanceDataPoint[],
    options: {
      includeStatistics?: boolean;
      includeTrends?: boolean;
      includePatterns?: boolean;
      includeClustering?: boolean;
      includeOutliers?: boolean;
      clusterCount?: number;
      smoothingWindow?: number;
    } = {}
  ): Promise<{
    statistics?: DistributionStatistics;
    trends?: TrendAnalysis;
    patterns?: ResistancePattern[];
    clusters?: ClusterAnalysis;
    outliers?: OutlierDetection;
    metadata: {
      dataPoints: number;
      generations: number;
      analysisDate: string;
      options: typeof options;
    };
  }> {
    const {
      includeStatistics = true,
      includeTrends = true,
      includePatterns = true,
      includeClustering = false,
      includeOutliers = false,
      clusterCount = 3,
      smoothingWindow = 3,
    } = options;

    // Validate input data
    data.forEach((point, index) => {
      try {
        ResistanceDataSchema.parse(point);
      } catch (error) {
        throw new Error(`Invalid data point at index ${index}: ${error}`);
      }
    });

    const results: any = {};

    // Extract resistance frequencies
    const resistanceFrequencies = data.map(point => point.resistanceFrequency);
    const smoothedFrequencies = ResistanceDataPreprocessor.smoothData(
      resistanceFrequencies,
      smoothingWindow
    );

    // Statistical analysis
    if (includeStatistics) {
      results.statistics =
        ResistanceStatistics.calculateDistributionStatistics(
          smoothedFrequencies
        );
    }

    // Trend analysis
    if (includeTrends) {
      results.trends = ResistanceTrendAnalysis.analyzeTrend(data);
    }

    // Pattern analysis
    if (includePatterns) {
      results.patterns =
        ResistancePatternAnalysis.identifyResistancePatterns(data);
    }

    // Clustering analysis
    if (includeClustering && data.length > clusterCount) {
      const clusteringData = data.map(point => [
        point.resistanceFrequency,
        point.fitnessAdvantage,
        point.selectionPressure,
      ]);

      results.clusters = ResistanceClusterAnalysis.kMeansClustering(
        clusteringData,
        clusterCount
      );
    }

    // Outlier detection
    if (includeOutliers) {
      results.outliers = ResistanceOutlierDetection.detectOutliers(
        resistanceFrequencies,
        ["iqr", "zscore"]
      );
    }

    return {
      ...results,
      metadata: {
        dataPoints: data.length,
        generations:
          data.length > 0
            ? data[data.length - 1].generation - data[0].generation + 1
            : 0,
        analysisDate: new Date().toISOString(),
        options,
      },
    };
  }
}

// ============================
// Default Export
// ============================

export default {
  ResistanceStatistics,
  ResistancePatternAnalysis,
  ResistanceTrendAnalysis,
  ResistanceClusterAnalysis,
  ResistanceOutlierDetection,
  ResistanceDataPreprocessor,
  ResistanceAnalysisExporter,
  ResistanceDistributionAnalyzer,
};
