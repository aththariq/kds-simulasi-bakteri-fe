/**
 * Test utilities for validating resistance analysis algorithms
 */

import {
  ResistanceDistributionAnalyzer,
  ResistanceStatistics,
  ResistancePatternAnalysis,
  ResistanceTrendAnalysis,
  ResistanceClusterAnalysis,
  ResistanceOutlierDetection,
  ResistanceDataPreprocessor,
  type ResistanceDataPoint,
} from "../lib/resistance-analysis";

// Sample test data
export const sampleResistanceData: ResistanceDataPoint[] = [
  {
    generation: 0,
    resistanceFrequency: 0.01,
    geneFrequencies: { beta_lactamase: 0.01, efflux_pump: 0.005 },
    totalPopulation: 1000,
    resistantCount: 10,
    hgtEvents: 0,
    mutationEvents: 2,
    fitnessAdvantage: -0.05,
    selectionPressure: 0.1,
    timestamp: "2024-01-01T00:00:00Z",
  },
  {
    generation: 10,
    resistanceFrequency: 0.05,
    geneFrequencies: { beta_lactamase: 0.03, efflux_pump: 0.02 },
    totalPopulation: 1200,
    resistantCount: 60,
    hgtEvents: 3,
    mutationEvents: 8,
    fitnessAdvantage: 0.02,
    selectionPressure: 0.3,
    timestamp: "2024-01-01T01:00:00Z",
  },
  {
    generation: 20,
    resistanceFrequency: 0.15,
    geneFrequencies: {
      beta_lactamase: 0.08,
      efflux_pump: 0.07,
      target_modification: 0.02,
    },
    totalPopulation: 1500,
    resistantCount: 225,
    hgtEvents: 8,
    mutationEvents: 15,
    fitnessAdvantage: 0.15,
    selectionPressure: 0.5,
    timestamp: "2024-01-01T02:00:00Z",
  },
  {
    generation: 30,
    resistanceFrequency: 0.35,
    geneFrequencies: {
      beta_lactamase: 0.2,
      efflux_pump: 0.15,
      target_modification: 0.08,
    },
    totalPopulation: 1800,
    resistantCount: 630,
    hgtEvents: 12,
    mutationEvents: 25,
    fitnessAdvantage: 0.25,
    selectionPressure: 0.7,
    timestamp: "2024-01-01T03:00:00Z",
  },
  {
    generation: 40,
    resistanceFrequency: 0.65,
    geneFrequencies: {
      beta_lactamase: 0.4,
      efflux_pump: 0.25,
      target_modification: 0.15,
    },
    totalPopulation: 2000,
    resistantCount: 1300,
    hgtEvents: 18,
    mutationEvents: 35,
    fitnessAdvantage: 0.35,
    selectionPressure: 0.9,
    timestamp: "2024-01-01T04:00:00Z",
  },
];

// Test runner for resistance analysis
export class ResistanceAnalysisTestRunner {
  /**
   * Run comprehensive tests on all resistance analysis algorithms
   */
  static async runAllTests(): Promise<{
    statisticsTest: boolean;
    patternTest: boolean;
    trendTest: boolean;
    clusterTest: boolean;
    outlierTest: boolean;
    preprocessorTest: boolean;
    fullAnalysisTest: boolean;
    testResults: Record<string, any>;
  }> {
    console.log("Starting resistance analysis tests...");

    const testResults: Record<string, any> = {};

    try {
      // Test 1: Statistics calculation
      console.log("Testing statistics calculation...");
      const resistanceFrequencies = sampleResistanceData.map(
        d => d.resistanceFrequency
      );
      const statistics = ResistanceStatistics.calculateDistributionStatistics(
        resistanceFrequencies
      );
      testResults.statistics = statistics;

      const statisticsTest =
        statistics.mean > 0 &&
        statistics.variance > 0 &&
        statistics.q1 <= statistics.median &&
        statistics.median <= statistics.q3;
      console.log("✓ Statistics test:", statisticsTest ? "PASSED" : "FAILED");

      // Test 2: Pattern identification
      console.log("Testing pattern identification...");
      const patterns =
        ResistancePatternAnalysis.identifyResistancePatterns(
          sampleResistanceData
        );
      testResults.patterns = patterns;

      const patternTest = patterns.length > 0 && patterns[0].genes.length > 0;
      console.log("✓ Pattern test:", patternTest ? "PASSED" : "FAILED");

      // Test 3: Trend analysis
      console.log("Testing trend analysis...");
      const trends = ResistanceTrendAnalysis.analyzeTrend(sampleResistanceData);
      testResults.trends = trends;

      const trendTest =
        typeof trends.slope === "number" &&
        typeof trends.correlation === "number" &&
        ["increasing", "decreasing", "stable"].includes(trends.trendDirection);
      console.log("✓ Trend test:", trendTest ? "PASSED" : "FAILED");

      // Test 4: Clustering analysis
      console.log("Testing clustering analysis...");
      const clusteringData = sampleResistanceData.map(point => [
        point.resistanceFrequency,
        point.fitnessAdvantage,
        point.selectionPressure,
      ]);
      const clusters = ResistanceClusterAnalysis.kMeansClustering(
        clusteringData,
        2
      );
      testResults.clusters = clusters;

      const clusterTest =
        clusters.clusters.length === 2 &&
        clusters.silhouetteScore >= -1 &&
        clusters.silhouetteScore <= 1;
      console.log("✓ Cluster test:", clusterTest ? "PASSED" : "FAILED");

      // Test 5: Outlier detection
      console.log("Testing outlier detection...");
      const outliers = ResistanceOutlierDetection.detectOutliers(
        resistanceFrequencies
      );
      testResults.outliers = outliers;

      const outlierTest =
        typeof outliers.outlierPercentage === "number" &&
        outliers.outlierPercentage >= 0 &&
        outliers.cleanedData.length <= resistanceFrequencies.length;
      console.log("✓ Outlier test:", outlierTest ? "PASSED" : "FAILED");

      // Test 6: Data preprocessing
      console.log("Testing data preprocessing...");
      const normalizedData = ResistanceDataPreprocessor.normalizeData(
        resistanceFrequencies,
        "minmax"
      );
      const smoothedData = ResistanceDataPreprocessor.smoothData(
        resistanceFrequencies,
        3
      );
      testResults.preprocessing = { normalizedData, smoothedData };

      const preprocessorTest =
        normalizedData.length === resistanceFrequencies.length &&
        smoothedData.length === resistanceFrequencies.length &&
        Math.max(...normalizedData) <= 1 &&
        Math.min(...normalizedData) >= 0;
      console.log(
        "✓ Preprocessor test:",
        preprocessorTest ? "PASSED" : "FAILED"
      );

      // Test 7: Full analysis
      console.log("Testing full resistance distribution analysis...");
      const fullAnalysis =
        await ResistanceDistributionAnalyzer.analyzeResistanceDistribution(
          sampleResistanceData,
          {
            includeStatistics: true,
            includeTrends: true,
            includePatterns: true,
            includeClustering: true,
            includeOutliers: true,
            clusterCount: 2,
            smoothingWindow: 3,
          }
        );
      testResults.fullAnalysis = fullAnalysis;

      const fullAnalysisTest =
        fullAnalysis.statistics !== undefined &&
        fullAnalysis.trends !== undefined &&
        fullAnalysis.patterns !== undefined &&
        fullAnalysis.clusters !== undefined &&
        fullAnalysis.outliers !== undefined &&
        fullAnalysis.metadata.dataPoints === sampleResistanceData.length;
      console.log(
        "✓ Full analysis test:",
        fullAnalysisTest ? "PASSED" : "FAILED"
      );

      console.log("\n=== Test Summary ===");
      console.log(`Statistics: ${statisticsTest ? "✓" : "✗"}`);
      console.log(`Patterns: ${patternTest ? "✓" : "✗"}`);
      console.log(`Trends: ${trendTest ? "✓" : "✗"}`);
      console.log(`Clustering: ${clusterTest ? "✓" : "✗"}`);
      console.log(`Outliers: ${outlierTest ? "✓" : "✗"}`);
      console.log(`Preprocessing: ${preprocessorTest ? "✓" : "✗"}`);
      console.log(`Full Analysis: ${fullAnalysisTest ? "✓" : "✗"}`);

      const allTestsPassed =
        statisticsTest &&
        patternTest &&
        trendTest &&
        clusterTest &&
        outlierTest &&
        preprocessorTest &&
        fullAnalysisTest;

      console.log(`\nAll tests: ${allTestsPassed ? "✓ PASSED" : "✗ FAILED"}`);

      return {
        statisticsTest,
        patternTest,
        trendTest,
        clusterTest,
        outlierTest,
        preprocessorTest,
        fullAnalysisTest,
        testResults,
      };
    } catch (error) {
      console.error("Test failed with error:", error);
      return {
        statisticsTest: false,
        patternTest: false,
        trendTest: false,
        clusterTest: false,
        outlierTest: false,
        preprocessorTest: false,
        fullAnalysisTest: false,
        testResults: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Test specific algorithms with custom data
   */
  static testWithCustomData(customData: ResistanceDataPoint[]): void {
    console.log("Testing with custom data...");

    try {
      // Validate data format
      customData.forEach((point, index) => {
        if (
          !point.generation ||
          point.resistanceFrequency < 0 ||
          point.resistanceFrequency > 1
        ) {
          throw new Error(`Invalid data point at index ${index}`);
        }
      });

      // Run basic statistics
      const frequencies = customData.map(d => d.resistanceFrequency);
      const stats =
        ResistanceStatistics.calculateDistributionStatistics(frequencies);
      console.log("Custom data statistics:", stats);

      // Run trend analysis
      const trends = ResistanceTrendAnalysis.analyzeTrend(customData);
      console.log("Custom data trends:", trends);

      console.log("✓ Custom data test completed successfully");
    } catch (error) {
      console.error("✗ Custom data test failed:", error);
    }
  }

  /**
   * Performance benchmark test
   */
  static async benchmarkPerformance(): Promise<{
    dataSize: number;
    statisticsTime: number;
    trendTime: number;
    patternTime: number;
    fullAnalysisTime: number;
  }> {
    console.log("Running performance benchmarks...");

    // Generate larger dataset for benchmarking
    const largeDataset: ResistanceDataPoint[] = [];
    for (let i = 0; i < 100; i++) {
      largeDataset.push({
        generation: i,
        resistanceFrequency: Math.random(),
        geneFrequencies: {
          beta_lactamase: Math.random() * 0.5,
          efflux_pump: Math.random() * 0.3,
          target_modification: Math.random() * 0.2,
        },
        totalPopulation: 1000 + Math.floor(Math.random() * 1000),
        resistantCount: Math.floor(Math.random() * 500),
        hgtEvents: Math.floor(Math.random() * 20),
        mutationEvents: Math.floor(Math.random() * 50),
        fitnessAdvantage: (Math.random() - 0.5) * 0.4,
        selectionPressure: Math.random(),
        timestamp: new Date().toISOString(),
      });
    }

    const frequencies = largeDataset.map(d => d.resistanceFrequency);

    // Benchmark statistics
    const statStart = performance.now();
    ResistanceStatistics.calculateDistributionStatistics(frequencies);
    const statisticsTime = performance.now() - statStart;

    // Benchmark trend analysis
    const trendStart = performance.now();
    ResistanceTrendAnalysis.analyzeTrend(largeDataset);
    const trendTime = performance.now() - trendStart;

    // Benchmark pattern analysis
    const patternStart = performance.now();
    ResistancePatternAnalysis.identifyResistancePatterns(largeDataset);
    const patternTime = performance.now() - patternStart;

    // Benchmark full analysis
    const fullStart = performance.now();
    await ResistanceDistributionAnalyzer.analyzeResistanceDistribution(
      largeDataset
    );
    const fullAnalysisTime = performance.now() - fullStart;

    const results = {
      dataSize: largeDataset.length,
      statisticsTime,
      trendTime,
      patternTime,
      fullAnalysisTime,
    };

    console.log("Performance benchmark results:", results);
    return results;
  }
}

// Export test utilities
export default ResistanceAnalysisTestRunner;
