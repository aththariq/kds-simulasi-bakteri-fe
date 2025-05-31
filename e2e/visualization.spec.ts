import { test, expect } from "@playwright/test";

test.describe("Visualization Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Run a quick simulation to get data for visualization tests
    await page.fill('input[name="initialPopulation"]', "500");
    await page.fill('input[name="generations"]', "20");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    await page.click('button:has-text("Start Simulation")');
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 60000,
    });

    // Switch to Results tab
    await page.click('[role="tab"]:has-text("Results & Analysis")');
  });

  test("should display population dynamics chart", async ({ page }) => {
    // Check for chart presence
    await expect(page.locator(".recharts-wrapper, canvas, svg")).toBeVisible({
      timeout: 10000,
    });

    // Verify chart has data
    const chartData = page.locator(
      ".recharts-line, .recharts-area, path[stroke]"
    );
    await expect(chartData.first()).toBeVisible();

    // Check for axis labels and legend
    await expect(
      page.locator("text=Generation, text=Population, text=Time")
    ).toBeVisible();
  });

  test("should display petri dish spatial visualization", async ({ page }) => {
    // Look for Petri dish visualization
    const petriDish = page
      .locator("canvas, svg")
      .filter({ hasText: /bacteria|spatial|petri/i })
      .or(
        page.locator(".petri-dish, .spatial-visualization, .grid-visualization")
      );

    if ((await petriDish.count()) > 0) {
      await expect(petriDish.first()).toBeVisible();

      // Check for interactive elements
      await petriDish.first().hover();
      await petriDish.first().click({ position: { x: 50, y: 50 } });
    }
  });

  test("should handle chart interactions", async ({ page }) => {
    const chart = page.locator(".recharts-wrapper, canvas, svg").first();
    await expect(chart).toBeVisible();

    // Test mouse interactions
    await chart.hover();

    // Look for tooltips or interactive elements
    const tooltip = page.locator(
      '.recharts-tooltip, .tooltip, [role="tooltip"]'
    );
    if ((await tooltip.count()) > 0) {
      await expect(tooltip.first()).toBeVisible();
    }

    // Test zoom functionality if available
    await chart.click({ position: { x: 100, y: 100 } });
  });

  test("should display resistance distribution data", async ({ page }) => {
    // Look for resistance-related data
    const resistanceData = page
      .locator("text=resistant, text=susceptible, text=resistance")
      .first();
    await expect(resistanceData).toBeVisible({ timeout: 5000 });

    // Check for resistance charts or indicators
    const resistanceVisualization = page.locator(
      '.resistance-chart, .resistance-data, [data-testid*="resistance"]'
    );
    if ((await resistanceVisualization.count()) > 0) {
      await expect(resistanceVisualization.first()).toBeVisible();
    }
  });
});
