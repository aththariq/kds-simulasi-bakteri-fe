import { test, expect } from "@playwright/test";

test.describe("Responsive Design Tests", () => {
  const viewports = [
    { name: "Mobile", width: 375, height: 667 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Desktop", width: 1920, height: 1080 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should display correctly on ${name} (${width}x${height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      // Check basic layout
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator('[role="tablist"]')).toBeVisible();

      // Verify form is accessible
      await expect(page.locator("form")).toBeVisible();

      // Check if form inputs are properly sized
      const inputs = page.locator('input[type="number"], input[type="text"]');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        await expect(input).toBeVisible();

        // Verify input is clickable and not cut off
        await input.click();
      }

      // Test navigation tabs work on different screen sizes
      await page.click('[role="tab"]:has-text("Results & Analysis")');
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();

      await page.click('[role="tab"]:has-text("Parameters")');
      await expect(page.locator("form")).toBeVisible();

      // Mobile-specific tests
      if (width <= 768) {
        // Check if mobile layout adjustments are applied
        const container = page.locator(
          '.container, main, [data-testid="main-container"]'
        );
        if ((await container.count()) > 0) {
          await expect(container.first()).toBeVisible();
        }
      }
    });
  });

  test("should handle orientation changes on mobile", async ({ page }) => {
    // Start in portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible();

    // Switch to landscape mode
    await page.setViewportSize({ width: 667, height: 375 });

    // Verify layout still works
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("form")).toBeVisible();

    // Test that tabs still work in landscape
    await page.click('[role="tab"]:has-text("Results & Analysis")');
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();
  });

  test("should maintain functionality across viewports", async ({ page }) => {
    for (const { width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      // Fill form with basic parameters
      await page.fill('input[name="initialPopulation"]', "100");
      await page.fill('input[name="generations"]', "10");
      await page.fill('input[name="mutationRate"]', "0.01");

      // Verify start button is accessible
      const startButton = page.locator('button:has-text("Start Simulation")');
      await expect(startButton).toBeVisible();

      // Check button is clickable (not hidden or cut off)
      const buttonBox = await startButton.boundingBox();
      expect(buttonBox).toBeTruthy();
      expect(buttonBox!.width).toBeGreaterThan(0);
      expect(buttonBox!.height).toBeGreaterThan(0);
    }
  });
});
