/**
 * Spatial Clustering Analysis Module
 *
 * Provides comprehensive spatial analysis capabilities for resistance distribution data,
 * including clustering algorithms, spatial statistics, proximity analysis, and interpolation.
 */

import { ResistanceDataPoint, ResistancePattern } from "./resistance-analysis";

// Types and interfaces for spatial analysis
export interface SpatialPoint {
  x: number;
  y: number;
  value: number;
  id?: string;
  metadata?: Record<string, unknown>;
}

export interface SpatialCluster {
  id: number;
  points: SpatialPoint[];
  centroid: { x: number; y: number };
  density: number;
  isCore: boolean;
  noise: boolean;
}

export interface DBSCANConfig {
  epsilon: number;
  minPoints: number;
  distanceFunction?: (p1: SpatialPoint, p2: SpatialPoint) => number;
}

export interface KMeansConfig {
  k: number;
  maxIterations: number;
  tolerance: number;
  initializationMethod: "random" | "kmeans++";
}

export interface SpatialStatistics {
  moransI: number;
  moransIPValue: number;
  spatialAutocorrelation: "positive" | "negative" | "none";
  globalClusteringIndex: number;
}

export interface HotspotAnalysis {
  hotspots: SpatialPoint[];
  coldspots: SpatialPoint[];
  giStarStatistics: Array<{
    point: SpatialPoint;
    giStar: number;
    zScore: number;
    pValue: number;
    significance: "high" | "medium" | "low" | "none";
  }>;
}

export interface ProximityAnalysis {
  neighborPairs: Array<{
    point1: SpatialPoint;
    point2: SpatialPoint;
    distance: number;
    similarityScore: number;
  }>;
  averageNearestNeighborDistance: number;
  clustering: "clustered" | "dispersed" | "random";
}

export interface InterpolationResult {
  gridPoints: Array<{
    x: number;
    y: number;
    interpolatedValue: number;
    confidence: number;
  }>;
  contourLines: Array<{
    level: number;
    coordinates: Array<{ x: number; y: number }>;
  }>;
}

export interface SpreadPrediction {
  predictedCenters: SpatialPoint[];
  riskAreas: Array<{
    x: number;
    y: number;
    riskLevel: number;
    confidence: number;
  }>;
  spreadDirection: {
    angle: number;
    magnitude: number;
    confidence: number;
  };
}

/**
 * Core spatial clustering and analysis class
 */
export class SpatialClusteringAnalyzer {
  private spatialPoints: SpatialPoint[] = [];

  constructor() {}

  /**
   * Convert resistance data to spatial points for clustering analysis
   * Since ResistanceDataPoint doesn't have built-in spatial fields,
   * this method accepts custom coordinate extraction functions
   */
  public convertResistanceToSpatial(
    resistanceData: ResistanceDataPoint[],
    options: {
      xExtractor?: (data: ResistanceDataPoint, index: number) => number;
      yExtractor?: (data: ResistanceDataPoint, index: number) => number;
      valueExtractor?: (data: ResistanceDataPoint) => number;
      useGeneration?: boolean;
      useIndex?: boolean;
    } = {}
  ): SpatialPoint[] {
    const {
      xExtractor = options.useGeneration
        ? (data: ResistanceDataPoint) => data.generation
        : options.useIndex
        ? (_: ResistanceDataPoint, index: number) => index
        : (data: ResistanceDataPoint) => data.generation,
      yExtractor = (data: ResistanceDataPoint) =>
        data.resistanceFrequency * 100,
      valueExtractor = (data: ResistanceDataPoint) => data.resistantCount,
    } = options;

    return resistanceData.map((dataPoint, index) => ({
      x: xExtractor(dataPoint, index),
      y: yExtractor(dataPoint, index),
      value: valueExtractor(dataPoint),
      id: `resistance_${index}`,
      metadata: {
        generation: dataPoint.generation,
        resistanceFrequency: dataPoint.resistanceFrequency,
        totalPopulation: dataPoint.totalPopulation,
        hgtEvents: dataPoint.hgtEvents,
        mutationEvents: dataPoint.mutationEvents,
        timestamp: dataPoint.timestamp,
      },
    }));
  }

  /**
   * Convert simple coordinate arrays to spatial points
   */
  public convertCoordinatesToSpatial(
    coordinates: Array<{ x: number; y: number; value?: number }>,
    metadata?: Record<string, unknown>
  ): SpatialPoint[] {
    return coordinates.map((coord, index) => ({
      x: coord.x,
      y: coord.y,
      value: coord.value ?? 1,
      id: `spatial_${index}`,
      metadata: metadata ?? {},
    }));
  }

  /**
   * DBSCAN clustering algorithm implementation
   */
  public dbscan(
    points: SpatialPoint[],
    config: DBSCANConfig
  ): SpatialCluster[] {
    const {
      epsilon,
      minPoints,
      distanceFunction = this.euclideanDistance,
    } = config;
    const clusters: SpatialCluster[] = [];
    const visited = new Set<number>();
    const clustered = new Set<number>();
    const noise: SpatialPoint[] = [];
    let clusterId = 0;

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      visited.add(i);

      const neighbors = this.getNeighbors(points, i, epsilon, distanceFunction);

      if (neighbors.length < minPoints) {
        noise.push(points[i]);
        continue;
      }

      // Create new cluster
      const cluster: SpatialCluster = {
        id: clusterId++,
        points: [points[i]],
        centroid: { x: points[i].x, y: points[i].y },
        density: 0,
        isCore: true,
        noise: false,
      };

      clustered.add(i);

      // Expand cluster
      const seedSet = [...neighbors];
      for (let j = 0; j < seedSet.length; j++) {
        const neighborIndex = seedSet[j];

        if (!visited.has(neighborIndex)) {
          visited.add(neighborIndex);
          const neighborNeighbors = this.getNeighbors(
            points,
            neighborIndex,
            epsilon,
            distanceFunction
          );

          if (neighborNeighbors.length >= minPoints) {
            seedSet.push(
              ...neighborNeighbors.filter(n => !seedSet.includes(n))
            );
          }
        }

        if (!clustered.has(neighborIndex)) {
          cluster.points.push(points[neighborIndex]);
          clustered.add(neighborIndex);
        }
      }

      // Calculate cluster properties
      cluster.centroid = this.calculateCentroid(cluster.points);
      cluster.density = cluster.points.length / (Math.PI * epsilon * epsilon);
      clusters.push(cluster);
    }

    // Add noise as separate cluster
    if (noise.length > 0) {
      clusters.push({
        id: -1,
        points: noise,
        centroid: this.calculateCentroid(noise),
        density: 0,
        isCore: false,
        noise: true,
      });
    }

    return clusters;
  }

  /**
   * K-means clustering algorithm implementation
   */
  public kmeans(
    points: SpatialPoint[],
    config: KMeansConfig
  ): SpatialCluster[] {
    const { k, maxIterations, tolerance, initializationMethod } = config;

    // Initialize centroids
    let centroids = this.initializeCentroids(points, k, initializationMethod);
    let clusters: SpatialCluster[] = [];
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < maxIterations) {
      // Assign points to clusters
      clusters = this.assignPointsToClustersCentroids(points, centroids);

      // Update centroids
      const newCentroids = clusters.map(cluster =>
        this.calculateCentroid(cluster.points)
      );

      // Check convergence
      converged = this.checkConvergence(centroids, newCentroids, tolerance);
      centroids = newCentroids;
      iteration++;
    }

    // Calculate final cluster properties
    clusters.forEach((cluster, index) => {
      cluster.id = index;
      cluster.centroid = centroids[index];
      cluster.density = this.calculateClusterDensity(cluster);
      cluster.isCore = cluster.points.length > 1;
      cluster.noise = false;
    });

    return clusters;
  }

  /**
   * Calculate Moran's I spatial autocorrelation statistic
   */
  public calculateMoransI(
    points: SpatialPoint[],
    weights?: number[][]
  ): SpatialStatistics {
    const n = points.length;
    const values = points.map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // Create spatial weights matrix if not provided
    const w = weights || this.createSpatialWeightsMatrix(points);

    // Calculate Moran's I
    let numerator = 0;
    let denominator = 0;
    let sumWeights = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          numerator += w[i][j] * (values[i] - mean) * (values[j] - mean);
          sumWeights += w[i][j];
        }
      }
      denominator += (values[i] - mean) ** 2;
    }

    const moransI = (n / sumWeights) * (numerator / denominator);

    // Calculate expected value and variance for significance testing
    const expectedI = -1 / (n - 1);
    const varianceI = this.calculateMoransIVariance(n, sumWeights, w);
    const zScore = (moransI - expectedI) / Math.sqrt(varianceI);
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    return {
      moransI,
      moransIPValue: pValue,
      spatialAutocorrelation:
        moransI > expectedI
          ? pValue < 0.05
            ? "positive"
            : "none"
          : pValue < 0.05
          ? "negative"
          : "none",
      globalClusteringIndex: Math.abs(moransI - expectedI),
    };
  }

  /**
   * Calculate Getis-Ord Gi* statistics for hotspot analysis
   */
  public calculateGetisOrdGiStar(
    points: SpatialPoint[],
    distance?: number
  ): HotspotAnalysis {
    const n = points.length;
    const values = points.map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance =
      values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);

    const maxDist = distance || this.calculateOptimalDistance(points);
    const giStarStatistics: HotspotAnalysis["giStarStatistics"] = [];
    const hotspots: SpatialPoint[] = [];
    const coldspots: SpatialPoint[] = [];

    for (let i = 0; i < n; i++) {
      const neighbors = this.getNeighborsWithinDistance(points, i, maxDist);
      neighbors.push(i); // Include the point itself

      const neighborSum = neighbors.reduce((sum, idx) => sum + values[idx], 0);
      const neighborCount = neighbors.length;

      const expectedSum = mean * neighborCount;
      const standardError =
        sd * Math.sqrt((neighborCount * (n - neighborCount)) / (n - 1));

      const giStar = (neighborSum - expectedSum) / standardError;
      const zScore = giStar;
      const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

      const significance: "high" | "medium" | "low" | "none" =
        pValue < 0.01
          ? "high"
          : pValue < 0.05
          ? "medium"
          : pValue < 0.1
          ? "low"
          : "none";

      const stat = {
        point: points[i],
        giStar,
        zScore,
        pValue,
        significance,
      };

      giStarStatistics.push(stat);

      // Classify as hotspot or coldspot
      if (significance !== "none") {
        if (giStar > 0) {
          hotspots.push(points[i]);
        } else {
          coldspots.push(points[i]);
        }
      }
    }

    return {
      hotspots,
      coldspots,
      giStarStatistics,
    };
  }

  /**
   * Perform proximity analysis
   */
  public analyzeProximity(points: SpatialPoint[]): ProximityAnalysis {
    const neighborPairs: ProximityAnalysis["neighborPairs"] = [];
    const distances: number[] = [];

    for (let i = 0; i < points.length; i++) {
      let nearestDistance = Infinity;
      let nearestIndex = -1;

      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          const distance = this.euclideanDistance(points[i], points[j]);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }
      }

      if (nearestIndex !== -1) {
        distances.push(nearestDistance);

        const similarityScore = this.calculateSimilarityScore(
          points[i],
          points[nearestIndex]
        );

        neighborPairs.push({
          point1: points[i],
          point2: points[nearestIndex],
          distance: nearestDistance,
          similarityScore,
        });
      }
    }

    const averageNearestNeighborDistance =
      distances.reduce((sum, d) => sum + d, 0) / distances.length;

    // Calculate Clark-Evans ratio for clustering assessment
    const expectedDistance =
      0.5 / Math.sqrt(points.length / this.getStudyAreaSize(points));
    const clarkEvansRatio = averageNearestNeighborDistance / expectedDistance;

    const clustering: "clustered" | "dispersed" | "random" =
      clarkEvansRatio < 1
        ? "clustered"
        : clarkEvansRatio > 1
        ? "dispersed"
        : "random";

    return {
      neighborPairs,
      averageNearestNeighborDistance,
      clustering,
    };
  }

  /**
   * Inverse Distance Weighting (IDW) interpolation
   */
  public interpolateIDW(
    points: SpatialPoint[],
    gridResolution: number = 50,
    power: number = 2
  ): InterpolationResult {
    const bounds = this.calculateBounds(points);
    const stepX = (bounds.maxX - bounds.minX) / gridResolution;
    const stepY = (bounds.maxY - bounds.minY) / gridResolution;

    const gridPoints: InterpolationResult["gridPoints"] = [];

    for (let x = bounds.minX; x <= bounds.maxX; x += stepX) {
      for (let y = bounds.minY; y <= bounds.maxY; y += stepY) {
        const interpolatedValue = this.idwInterpolation(
          points,
          { x, y },
          power
        );
        const confidence = this.calculateInterpolationConfidence(points, {
          x,
          y,
        });

        gridPoints.push({
          x,
          y,
          interpolatedValue,
          confidence,
        });
      }
    }

    // Generate contour lines
    const contourLines = this.generateContourLines(gridPoints, 5);

    return {
      gridPoints,
      contourLines,
    };
  }

  /**
   * Predict resistance spread patterns
   */
  public predictSpread(
    points: SpatialPoint[],
    historicalData?: SpatialPoint[][]
  ): SpreadPrediction {
    // Analyze current clusters
    const clusters = this.kmeans(points, {
      k: Math.min(5, Math.floor(points.length / 3)),
      maxIterations: 100,
      tolerance: 0.001,
      initializationMethod: "kmeans++",
    });

    // Predict future centers based on cluster dynamics
    const predictedCenters: SpatialPoint[] = clusters
      .filter(cluster => !cluster.noise && cluster.points.length > 2)
      .map(cluster => {
        const centroid = cluster.centroid;
        const growthVector = this.calculateClusterGrowthVector(
          cluster,
          historicalData
        );

        return {
          x: centroid.x + growthVector.x,
          y: centroid.y + growthVector.y,
          value:
            cluster.points.reduce((sum, p) => sum + p.value, 0) /
            cluster.points.length,
          id: `predicted_center_${cluster.id}`,
          metadata: {
            originalClusterId: cluster.id,
            confidence: growthVector.confidence,
          },
        };
      });

    // Calculate risk areas
    const riskAreas = this.calculateRiskAreas(points, predictedCenters);

    // Determine overall spread direction
    const spreadDirection = this.calculateSpreadDirection(
      points,
      historicalData
    );

    return {
      predictedCenters,
      riskAreas,
      spreadDirection,
    };
  }

  // Private helper methods

  private euclideanDistance(p1: SpatialPoint, p2: SpatialPoint): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  private getNeighbors(
    points: SpatialPoint[],
    pointIndex: number,
    epsilon: number,
    distanceFunction: (p1: SpatialPoint, p2: SpatialPoint) => number
  ): number[] {
    const neighbors: number[] = [];
    const point = points[pointIndex];

    for (let i = 0; i < points.length; i++) {
      if (i !== pointIndex && distanceFunction(point, points[i]) <= epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  private getNeighborsWithinDistance(
    points: SpatialPoint[],
    pointIndex: number,
    distance: number
  ): number[] {
    return this.getNeighbors(
      points,
      pointIndex,
      distance,
      this.euclideanDistance
    );
  }

  private calculateCentroid(points: SpatialPoint[]): { x: number; y: number } {
    if (points.length === 0) return { x: 0, y: 0 };

    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);

    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  }

  private initializeCentroids(
    points: SpatialPoint[],
    k: number,
    method: "random" | "kmeans++"
  ): { x: number; y: number }[] {
    if (method === "random") {
      const bounds = this.calculateBounds(points);
      return Array.from({ length: k }, () => ({
        x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
      }));
    } else {
      // K-means++ initialization
      const centroids: { x: number; y: number }[] = [];

      // Choose first centroid randomly
      centroids.push({
        x: points[Math.floor(Math.random() * points.length)].x,
        y: points[Math.floor(Math.random() * points.length)].y,
      });

      // Choose remaining centroids
      for (let i = 1; i < k; i++) {
        const distances = points.map(point => {
          const minDist = Math.min(
            ...centroids.map(centroid =>
              this.euclideanDistance(point, {
                x: centroid.x,
                y: centroid.y,
                value: 0,
              })
            )
          );
          return minDist * minDist;
        });

        const totalDistance = distances.reduce((sum, d) => sum + d, 0);
        const randomValue = Math.random() * totalDistance;

        let cumulative = 0;
        for (let j = 0; j < points.length; j++) {
          cumulative += distances[j];
          if (cumulative >= randomValue) {
            centroids.push({ x: points[j].x, y: points[j].y });
            break;
          }
        }
      }

      return centroids;
    }
  }

  private assignPointsToClustersCentroids(
    points: SpatialPoint[],
    centroids: { x: number; y: number }[]
  ): SpatialCluster[] {
    const clusters: SpatialCluster[] = centroids.map((centroid, index) => ({
      id: index,
      points: [],
      centroid,
      density: 0,
      isCore: false,
      noise: false,
    }));

    points.forEach(point => {
      let minDistance = Infinity;
      let closestClusterIndex = 0;

      centroids.forEach((centroid, index) => {
        const distance = this.euclideanDistance(point, {
          x: centroid.x,
          y: centroid.y,
          value: 0,
        });
        if (distance < minDistance) {
          minDistance = distance;
          closestClusterIndex = index;
        }
      });

      clusters[closestClusterIndex].points.push(point);
    });

    return clusters;
  }

  private checkConvergence(
    oldCentroids: { x: number; y: number }[],
    newCentroids: { x: number; y: number }[],
    tolerance: number
  ): boolean {
    for (let i = 0; i < oldCentroids.length; i++) {
      const distance = this.euclideanDistance(
        { x: oldCentroids[i].x, y: oldCentroids[i].y, value: 0 },
        { x: newCentroids[i].x, y: newCentroids[i].y, value: 0 }
      );
      if (distance > tolerance) {
        return false;
      }
    }
    return true;
  }

  private calculateClusterDensity(cluster: SpatialCluster): number {
    if (cluster.points.length < 2) return 0;

    const distances = cluster.points.map(point =>
      this.euclideanDistance(point, {
        x: cluster.centroid.x,
        y: cluster.centroid.y,
        value: 0,
      })
    );

    const maxDistance = Math.max(...distances);
    const area = Math.PI * maxDistance * maxDistance;

    return cluster.points.length / area;
  }

  private createSpatialWeightsMatrix(points: SpatialPoint[]): number[][] {
    const n = points.length;
    const weights: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));
    const threshold = this.calculateOptimalDistance(points);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const distance = this.euclideanDistance(points[i], points[j]);
          weights[i][j] = distance <= threshold ? 1 : 0;
        }
      }
    }

    return weights;
  }

  private calculateOptimalDistance(points: SpatialPoint[]): number {
    const distances: number[] = [];

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        distances.push(this.euclideanDistance(points[i], points[j]));
      }
    }

    distances.sort((a, b) => a - b);
    return distances[Math.floor(distances.length * 0.1)]; // 10th percentile
  }

  private calculateMoransIVariance(
    n: number,
    sumWeights: number,
    weights: number[][]
  ): number {
    let s1 = 0;
    let s2 = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          s1 += weights[i][j] * weights[i][j];
          s2 +=
            (weights[i][j] + weights[j][i]) * (weights[i][j] + weights[j][i]);
        }
      }
    }

    s2 *= 0.5;

    const b2 =
      (n * s1 - sumWeights * sumWeights) /
      ((n - 1) * (n - 2) * (n - 3) * sumWeights * sumWeights);
    const expectedI = -1 / (n - 1);

    return (
      (n * ((n * n - 3 * n + 3) * s1 - n * s2 + 3 * sumWeights * sumWeights) -
        4 * (n - 1) * (n - 2) * (n - 3) * sumWeights * sumWeights) /
      ((n - 1) * (n - 2) * (n - 3) * sumWeights * sumWeights)
    );
  }

  private normalCDF(z: number): number {
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateSimilarityScore(p1: SpatialPoint, p2: SpatialPoint): number {
    const valueDiff = Math.abs(p1.value - p2.value);
    const maxValue = Math.max(p1.value, p2.value, 1); // Avoid division by zero
    return 1 - valueDiff / maxValue;
  }

  private getStudyAreaSize(points: SpatialPoint[]): number {
    const bounds = this.calculateBounds(points);
    return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
  }

  private calculateBounds(points: SpatialPoint[]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    if (points.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    return {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y)),
    };
  }

  private idwInterpolation(
    points: SpatialPoint[],
    target: { x: number; y: number },
    power: number
  ): number {
    let numerator = 0;
    let denominator = 0;

    for (const point of points) {
      const distance = this.euclideanDistance(
        { x: target.x, y: target.y, value: 0 },
        point
      );

      if (distance === 0) {
        return point.value; // Exact match
      }

      const weight = 1 / Math.pow(distance, power);
      numerator += weight * point.value;
      denominator += weight;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateInterpolationConfidence(
    points: SpatialPoint[],
    target: { x: number; y: number }
  ): number {
    const distances = points.map(point =>
      this.euclideanDistance({ x: target.x, y: target.y, value: 0 }, point)
    );

    const minDistance = Math.min(...distances);
    const maxDistance = Math.max(...distances);

    // Confidence decreases with distance from nearest point
    const normalizedDistance = minDistance / (maxDistance || 1);
    return Math.max(0, 1 - normalizedDistance);
  }

  private generateContourLines(
    gridPoints: InterpolationResult["gridPoints"],
    levels: number
  ): InterpolationResult["contourLines"] {
    // Simplified contour generation - in a full implementation,
    // you would use a more sophisticated algorithm like marching squares
    const values = gridPoints.map(p => p.interpolatedValue);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const step = (maxValue - minValue) / levels;

    const contourLines: InterpolationResult["contourLines"] = [];

    for (let i = 1; i < levels; i++) {
      const level = minValue + i * step;
      contourLines.push({
        level,
        coordinates: [], // Simplified - would contain actual contour coordinates
      });
    }

    return contourLines;
  }

  private calculateClusterGrowthVector(
    cluster: SpatialCluster,
    historicalData?: SpatialPoint[][]
  ): { x: number; y: number; confidence: number } {
    // Simplified growth vector calculation
    // In a full implementation, this would analyze historical cluster movement
    const avgValue =
      cluster.points.reduce((sum, p) => sum + p.value, 0) /
      cluster.points.length;
    const growthFactor = Math.min(avgValue / 100, 1); // Normalize growth factor

    return {
      x: Math.random() * 10 * growthFactor - 5, // Random direction for demo
      y: Math.random() * 10 * growthFactor - 5,
      confidence: historicalData ? 0.8 : 0.5,
    };
  }

  private calculateRiskAreas(
    currentPoints: SpatialPoint[],
    predictedCenters: SpatialPoint[]
  ): SpreadPrediction["riskAreas"] {
    const riskAreas: SpreadPrediction["riskAreas"] = [];
    const bounds = this.calculateBounds([
      ...currentPoints,
      ...predictedCenters,
    ]);

    const resolution = 20;
    const stepX = (bounds.maxX - bounds.minX) / resolution;
    const stepY = (bounds.maxY - bounds.minY) / resolution;

    for (let x = bounds.minX; x <= bounds.maxX; x += stepX) {
      for (let y = bounds.minY; y <= bounds.maxY; y += stepY) {
        const riskLevel = this.calculateRiskLevel({ x, y }, predictedCenters);
        const confidence = this.calculateRiskConfidence(
          { x, y },
          currentPoints
        );

        if (riskLevel > 0.1) {
          // Only include areas with significant risk
          riskAreas.push({
            x,
            y,
            riskLevel,
            confidence,
          });
        }
      }
    }

    return riskAreas;
  }

  private calculateRiskLevel(
    point: { x: number; y: number },
    predictedCenters: SpatialPoint[]
  ): number {
    if (predictedCenters.length === 0) return 0;

    const distances = predictedCenters.map(center =>
      this.euclideanDistance({ x: point.x, y: point.y, value: 0 }, center)
    );

    const minDistance = Math.min(...distances);
    const maxInfluence = 50; // Maximum influence radius

    return Math.max(0, 1 - minDistance / maxInfluence);
  }

  private calculateRiskConfidence(
    point: { x: number; y: number },
    currentPoints: SpatialPoint[]
  ): number {
    if (currentPoints.length === 0) return 0;

    const distances = currentPoints.map(p =>
      this.euclideanDistance({ x: point.x, y: point.y, value: 0 }, p)
    );

    const minDistance = Math.min(...distances);
    const maxConfidenceRadius = 30;

    return Math.max(0, 1 - minDistance / maxConfidenceRadius);
  }

  private calculateSpreadDirection(
    currentPoints: SpatialPoint[],
    historicalData?: SpatialPoint[][]
  ): SpreadPrediction["spreadDirection"] {
    if (!historicalData || historicalData.length < 2) {
      return {
        angle: 0,
        magnitude: 0,
        confidence: 0.1,
      };
    }

    // Calculate movement vectors between time periods
    const vectors: { angle: number; magnitude: number }[] = [];

    for (let i = 1; i < historicalData.length; i++) {
      const prevCentroid = this.calculateCentroid(historicalData[i - 1]);
      const currentCentroid = this.calculateCentroid(historicalData[i]);

      const dx = currentCentroid.x - prevCentroid.x;
      const dy = currentCentroid.y - prevCentroid.y;

      const angle = Math.atan2(dy, dx);
      const magnitude = Math.sqrt(dx * dx + dy * dy);

      vectors.push({ angle, magnitude });
    }

    // Calculate average direction
    const avgX =
      vectors.reduce((sum, v) => sum + Math.cos(v.angle) * v.magnitude, 0) /
      vectors.length;
    const avgY =
      vectors.reduce((sum, v) => sum + Math.sin(v.angle) * v.magnitude, 0) /
      vectors.length;

    const avgAngle = Math.atan2(avgY, avgX);
    const avgMagnitude = Math.sqrt(avgX * avgX + avgY * avgY);

    // Calculate confidence based on consistency of direction
    const angleVariance =
      vectors.reduce((sum, v) => {
        const angleDiff = Math.abs(v.angle - avgAngle);
        return sum + Math.min(angleDiff, 2 * Math.PI - angleDiff);
      }, 0) / vectors.length;

    const confidence = Math.max(0, 1 - angleVariance / Math.PI);

    return {
      angle: avgAngle,
      magnitude: avgMagnitude,
      confidence,
    };
  }
}

/**
 * Factory function to create spatial clustering analyzer instance
 */
export function createSpatialClusteringAnalyzer(): SpatialClusteringAnalyzer {
  return new SpatialClusteringAnalyzer();
}

/**
 * Utility functions for spatial analysis
 */
export const SpatialUtils = {
  /**
   * Convert degrees to radians
   */
  degreesToRadians: (degrees: number): number => degrees * (Math.PI / 180),

  /**
   * Convert radians to degrees
   */
  radiansToDegrees: (radians: number): number => radians * (180 / Math.PI),

  /**
   * Calculate great circle distance between two geographic points
   */
  haversineDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = SpatialUtils.degreesToRadians(lat2 - lat1);
    const dLon = SpatialUtils.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(SpatialUtils.degreesToRadians(lat1)) *
        Math.cos(SpatialUtils.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Calculate the bearing between two geographic points
   */
  calculateBearing: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const dLon = SpatialUtils.degreesToRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(SpatialUtils.degreesToRadians(lat2));
    const x =
      Math.cos(SpatialUtils.degreesToRadians(lat1)) *
        Math.sin(SpatialUtils.degreesToRadians(lat2)) -
      Math.sin(SpatialUtils.degreesToRadians(lat1)) *
        Math.cos(SpatialUtils.degreesToRadians(lat2)) *
        Math.cos(dLon);

    const bearing = Math.atan2(y, x);
    return (SpatialUtils.radiansToDegrees(bearing) + 360) % 360;
  },

  /**
   * Check if a point is inside a polygon (ray casting algorithm)
   */
  isPointInPolygon: (
    point: { x: number; y: number },
    polygon: Array<{ x: number; y: number }>
  ): boolean => {
    let inside = false;
    const x = point.x;
    const y = point.y;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  },

  /**
   * Calculate polygon area
   */
  calculatePolygonArea: (polygon: Array<{ x: number; y: number }>): number => {
    let area = 0;
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }

    return Math.abs(area) / 2;
  },

  /**
   * Generate random points within a bounding box
   */
  generateRandomPoints: (
    count: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): SpatialPoint[] => {
    return Array.from({ length: count }, (_, index) => ({
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
      value: Math.random() * 100,
      id: `random_point_${index}`,
    }));
  },
};

export default SpatialClusteringAnalyzer;
