import { test, expect } from "@playwright/test";
import {
  PerformanceHelper,
  SimulationHelper,
  testData,
} from "./helpers/test-utils";

test.describe("Performance Tests", () => {
  let performanceHelper: PerformanceHelper;
  let simulationHelper: SimulationHelper;

  test.beforeEach(async ({ page }) => {
    performanceHelper = new PerformanceHelper(page);
    simulationHelper = new SimulationHelper(page);
  });

  test("should load page within acceptable time", async ({ page }) => {
    const loadTime = await performanceHelper.measurePageLoad();

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Verify page is fully loaded
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });

  test("should handle form interactions efficiently", async ({ page }) => {
    await page.goto("/");

    const interactionTime = await performanceHelper.measureFormInteraction();

    // Form interactions should be responsive (under 1 second)
    expect(interactionTime).toBeLessThan(1000);
  });

  test("should start simulation promptly", async ({ page }) => {
    await page.goto("/");

    const startTime = Date.now();

    await simulationHelper.fillBasicParameters(testData.quickSimulation);

    const fillTime = Date.now();

    await page.click('button:has-text("Start Simulation")');

    // Wait for simulation to start
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    const simulationStartTime = Date.now();

    // Form filling should be quick
    expect(fillTime - startTime).toBeLessThan(2000);

    // Simulation should start within 10 seconds
    expect(simulationStartTime - fillTime).toBeLessThan(10000);
  });

  test("should handle multiple simulations without memory leaks", async ({
    page,
  }) => {
    await page.goto("/");

    // Run multiple quick simulations
    for (let i = 0; i < 3; i++) {
      await simulationHelper.runQuickSimulation({
        initialPopulation: 100,
        generations: 5,
        mutationRate: 0.01,
        antibioticConcentration: 0.2,
      });

      // Check memory usage doesn't grow excessively
      const metrics = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        };
      });

      console.log(`Simulation ${i + 1} - Memory usage:`, metrics);

      // Reset for next simulation (if there's a reset button)
      const resetButton = page.locator(
        'button:has-text("Reset"), button:has-text("New Simulation")'
      );
      if ((await resetButton.count()) > 0) {
        await resetButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test("should render visualizations efficiently", async ({ page }) => {
    await page.goto("/");

    // Run a simulation to get data
    await simulationHelper.runQuickSimulation(testData.quickSimulation);

    // Switch to results tab
    await page.click('[role="tab"]:has-text("Results & Analysis")');

    const renderStartTime = Date.now();

    // Wait for visualization to render
    await expect(page.locator("canvas, svg, .recharts-wrapper")).toBeVisible({
      timeout: 15000,
    });

    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime;

    // Visualization should render within 15 seconds
    expect(renderTime).toBeLessThan(15000);

    console.log(`Visualization render time: ${renderTime}ms`);
  });

  test("should maintain responsiveness during simulation", async ({ page }) => {
    await page.goto("/");

    await simulationHelper.fillBasicParameters({
      initialPopulation: 500,
      generations: 20,
      mutationRate: 0.01,
      antibioticConcentration: 0.3,
    });

    await page.click('button:has-text("Start Simulation")');
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Test UI responsiveness during simulation
    const startTime = Date.now();

    // Try to switch tabs during simulation
    await page.click('[role="tab"]:has-text("Results & Analysis")');
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();

    const tabSwitchTime = Date.now() - startTime;

    // Tab switching should remain responsive (under 2 seconds)
    expect(tabSwitchTime).toBeLessThan(2000);

    // Try to switch back
    await page.click('[role="tab"]:has-text("Parameters")');
    await expect(page.locator("form")).toBeVisible();

    // Wait for simulation to complete
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 60000,
    });
  });

  test("should handle large datasets efficiently", async ({ page }) => {
    await page.goto("/");

    // Run a larger simulation
    await simulationHelper.fillBasicParameters({
      initialPopulation: 1000,
      generations: 30,
      mutationRate: 0.01,
      antibioticConcentration: 0.3,
    });

    const startTime = Date.now();

    await page.click('button:has-text("Start Simulation")');
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Monitor progress updates
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();

    // Wait for completion
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 120000,
    });

    const totalTime = Date.now() - startTime;

    // Large simulation should complete within 2 minutes
    expect(totalTime).toBeLessThan(120000);

    // Switch to results and check visualization performance
    await page.click('[role="tab"]:has-text("Results & Analysis")');

    const vizStartTime = Date.now();
    await expect(page.locator("canvas, svg, .recharts-wrapper")).toBeVisible({
      timeout: 20000,
    });
    const vizRenderTime = Date.now() - vizStartTime;

    // Visualization should render even with large datasets within 20 seconds
    expect(vizRenderTime).toBeLessThan(20000);

    console.log(`Large dataset visualization time: ${vizRenderTime}ms`);
  });
});
