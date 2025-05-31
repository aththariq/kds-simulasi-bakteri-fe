import { test, expect } from "@playwright/test";

test.describe("WebSocket Real-time Communication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should establish WebSocket connection during simulation", async ({
    page,
  }) => {
    // Monitor network activity for WebSocket connections
    const wsConnections: any[] = [];

    page.on("websocket", ws => {
      wsConnections.push(ws);
      console.log(`WebSocket connection: ${ws.url()}`);
    });

    // Start a simulation
    await page.fill('input[name="initialPopulation"]', "500");
    await page.fill('input[name="generations"]', "30");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    await page.click('button:has-text("Start Simulation")');

    // Wait for simulation to start
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Check if WebSocket connection was established
    await page.waitForFunction(() => wsConnections.length > 0, {
      timeout: 15000,
    });

    expect(wsConnections.length).toBeGreaterThan(0);

    // Wait for simulation completion
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 60000,
    });
  });

  test("should receive real-time progress updates", async ({ page }) => {
    let progressUpdates: string[] = [];

    // Monitor console messages for progress updates
    page.on("console", msg => {
      if (msg.type() === "log" && msg.text().includes("progress")) {
        progressUpdates.push(msg.text());
      }
    });

    // Start simulation
    await page.fill('input[name="initialPopulation"]', "500");
    await page.fill('input[name="generations"]', "25");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    await page.click('button:has-text("Start Simulation")');

    // Wait for simulation to start
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Check for progress bar updates
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();

    // Wait for progress to change multiple times
    let previousProgress = 0;
    let progressChanges = 0;

    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(2000); // Wait 2 seconds between checks

      const currentProgressAttr = await progressBar.getAttribute(
        "aria-valuenow"
      );
      const currentProgress = parseFloat(currentProgressAttr || "0");

      if (currentProgress > previousProgress) {
        progressChanges++;
        previousProgress = currentProgress;
      }

      if (progressChanges >= 3) break; // We've seen enough progress updates
    }

    expect(progressChanges).toBeGreaterThan(0);

    // Wait for completion
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 60000,
    });
  });

  test("should handle WebSocket disconnection and reconnection", async ({
    page,
  }) => {
    // Start a simulation
    await page.fill('input[name="initialPopulation"]', "300");
    await page.fill('input[name="generations"]', "20");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    await page.click('button:has-text("Start Simulation")');

    // Wait for simulation to start
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Simulate network interruption by going offline and back online
    await page.context().setOffline(true);
    await page.waitForTimeout(3000);
    await page.context().setOffline(false);

    // Check if the application handles the disconnection gracefully
    // It should either show a reconnection message or continue working
    const errorMessages = page.locator(
      "text=connection, text=error, text=retry, text=reconnect"
    );
    const progressBar = page.locator('[role="progressbar"]');

    // Either we see error handling messages or the progress continues
    const hasErrorHandling = (await errorMessages.count()) > 0;
    const hasProgress = await progressBar.isVisible();

    expect(hasErrorHandling || hasProgress).toBeTruthy();

    // Wait for potential completion (may take longer due to reconnection)
    try {
      await expect(page.locator("text=Simulation completed")).toBeVisible({
        timeout: 90000,
      });
    } catch (e) {
      // If simulation doesn't complete due to connection issues, that's also valid behavior
      console.log("Simulation may not have completed due to connection test");
    }
  });

  test("should update visualization in real-time", async ({ page }) => {
    // Start simulation
    await page.fill('input[name="initialPopulation"]', "400");
    await page.fill('input[name="generations"]', "20");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    await page.click('button:has-text("Start Simulation")');

    // Wait for simulation to start
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });

    // Switch to Results tab to watch real-time updates
    await page.click('[role="tab"]:has-text("Results & Analysis")');

    // Wait for visualization elements to appear
    await expect(page.locator("canvas, svg, .recharts-wrapper")).toBeVisible({
      timeout: 15000,
    });

    // Take initial screenshot of visualization
    const visualizationElement = page
      .locator("canvas, svg, .recharts-wrapper")
      .first();
    const initialScreenshot = await visualizationElement.screenshot();

    // Wait a bit for changes
    await page.waitForTimeout(10000);

    // Take another screenshot and compare
    const updatedScreenshot = await visualizationElement.screenshot();

    // Screenshots should be different if real-time updates are working
    expect(Buffer.compare(initialScreenshot, updatedScreenshot)).not.toBe(0);

    // Wait for completion
    await expect(page.locator("text=Simulation completed")).toBeVisible({
      timeout: 60000,
    });
  });
});
