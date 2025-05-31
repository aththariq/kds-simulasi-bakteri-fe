import { test, expect } from "@playwright/test";

test.describe("Simulation Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should complete full simulation workflow", async ({ page }) => {
    // Check if page loads correctly
    await expect(page).toHaveTitle(
      /Bacterial Antibiotic Resistance Simulation/
    );

    // Verify main components are present
    await expect(page.locator("h1")).toContainText(
      "Bacterial Antibiotic Resistance Simulation"
    );

    // Check if tabs are present
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(
      page.locator('[role="tab"]:has-text("Parameters")')
    ).toBeVisible();
    await expect(
      page.locator('[role="tab"]:has-text("Results & Analysis")')
    ).toBeVisible();

    // Verify parameter form is visible by default
    await expect(page.locator("form")).toBeVisible();

    // Fill in simulation parameters
    await page.fill('input[name="initialPopulation"]', "1000");
    await page.fill('input[name="generations"]', "50");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.5");

    // Submit the simulation
    const startButton = page.locator('button:has-text("Start Simulation")');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for simulation to start
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Check if progress indicators appear
    await expect(page.locator('[role="progressbar"]')).toBeVisible({
      timeout: 5000,
    });

    // Wait for simulation completion (with longer timeout)
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 60000,
    });

    // Switch to Results tab to verify results are displayed
    await page.click('[role="tab"]:has-text("Results & Analysis")');

    // Verify visualization components are present
    await expect(page.locator("canvas, svg")).toBeVisible({ timeout: 10000 });

    // Check if data is displayed (look for charts or data elements)
    const chartElements = page.locator(
      ".recharts-wrapper, .chart-container, canvas, svg"
    );
    await expect(chartElements.first()).toBeVisible({ timeout: 10000 });
  });

  test("should handle simulation parameters validation", async ({ page }) => {
    // Try to submit with invalid parameters
    await page.fill('input[name="initialPopulation"]', "-100");
    await page.fill('input[name="generations"]', "0");
    await page.fill('input[name="mutationRate"]', "2.0");

    const startButton = page.locator('button:has-text("Start Simulation")');
    await startButton.click();

    // Check for validation errors
    await expect(
      page.locator(
        "text=must be positive, text=must be greater than, text=must be between"
      )
    ).toBeVisible();
  });

  test("should display real-time updates during simulation", async ({
    page,
  }) => {
    // Fill valid parameters
    await page.fill('input[name="initialPopulation"]', "500");
    await page.fill('input[name="generations"]', "25");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    // Start simulation
    await page.click('button:has-text("Start Simulation")');

    // Wait for simulation to start
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Check for real-time progress updates
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();

    // Verify progress bar value changes over time
    await page.waitForFunction(
      () => {
        const progressElement = document.querySelector('[role="progressbar"]');
        return (
          progressElement &&
          parseFloat(progressElement.getAttribute("aria-valuenow") || "0") > 0
        );
      },
      { timeout: 30000 }
    );

    // Wait for completion
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 60000,
    });
  });
});
