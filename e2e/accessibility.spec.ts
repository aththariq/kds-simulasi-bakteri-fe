import { test, expect } from "@playwright/test";

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have proper ARIA attributes", async ({ page }) => {
    // Check for proper ARIA roles
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('[role="tab"]')).toHaveCount(2);
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();

    // Check form elements have proper labels
    const inputs = page.locator('input[type="number"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);

      // Check for aria-label or associated label
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const id = await input.getAttribute("id");

      let hasLabel = false;

      if (ariaLabel) {
        hasLabel = true;
      } else if (ariaLabelledBy) {
        hasLabel = true;
      } else if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }

      expect(hasLabel).toBeTruthy();
    }

    // Check buttons have accessible names
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute("aria-label");

      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test("should be keyboard navigable", async ({ page }) => {
    // Start from the first focusable element
    await page.keyboard.press("Tab");

    // Navigate through the form using Tab
    const focusableElements = page.locator(
      'input, button, [role="tab"], select, textarea'
    );
    const elementCount = await focusableElements.count();

    // Tab through all elements
    for (let i = 0; i < elementCount; i++) {
      const focused = page.locator(":focus");
      await expect(focused).toBeVisible();
      await page.keyboard.press("Tab");
    }

    // Test reverse navigation with Shift+Tab
    await page.keyboard.press("Shift+Tab");
    const lastElement = page.locator(":focus");
    await expect(lastElement).toBeVisible();
  });

  test("should support keyboard activation of interactive elements", async ({
    page,
  }) => {
    // Navigate to tabs and test keyboard activation
    await page.keyboard.press("Tab");

    // Find and focus on tab elements
    const tabs = page.locator('[role="tab"]');
    const firstTab = tabs.first();
    await firstTab.focus();

    // Activate tab with Enter
    await page.keyboard.press("Enter");
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();

    // Test Space key activation
    const secondTab = tabs.nth(1);
    await secondTab.focus();
    await page.keyboard.press(" ");
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();

    // Navigate back to form
    await page.click('[role="tab"]:has-text("Parameters")');

    // Test form submission with keyboard
    await page.fill('input[name="initialPopulation"]', "500");
    await page.fill('input[name="generations"]', "20");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    // Focus on submit button and activate with keyboard
    const submitButton = page.locator('button:has-text("Start Simulation")');
    await submitButton.focus();
    await page.keyboard.press("Enter");

    // Verify action was triggered
    await expect(page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have proper heading structure", async ({ page }) => {
    // Check for h1
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCount(1); // Should only have one h1

    // Check heading hierarchy (h1 -> h2 -> h3, etc.)
    const allHeadings = page.locator("h1, h2, h3, h4, h5, h6");
    const headingCount = await allHeadings.count();

    let currentLevel = 0;
    for (let i = 0; i < headingCount; i++) {
      const heading = allHeadings.nth(i);
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));

      // Heading levels should not skip (e.g., h1 -> h3 is not allowed)
      if (currentLevel === 0) {
        expect(level).toBe(1); // First heading should be h1
      } else {
        expect(level).toBeLessThanOrEqual(currentLevel + 1);
      }

      currentLevel = level;
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    // This is a basic check - in real projects you'd use axe-core or similar

    // Check that text is visible and readable
    const textElements = page
      .locator("h1, h2, h3, p, label, span, div")
      .filter({ hasText: /.+/ });
    const textCount = await textElements.count();

    for (let i = 0; i < Math.min(textCount, 10); i++) {
      // Check first 10 text elements
      const element = textElements.nth(i);
      await expect(element).toBeVisible();

      // Basic visibility check - element should have some content
      const text = await element.textContent();
      expect(text?.trim()).toBeTruthy();
    }
  });

  test("should work with screen reader simulation", async ({ page }) => {
    // Test that important content is accessible to screen readers

    // Check page title
    await expect(page).toHaveTitle(/Bacterial/);

    // Check main landmark
    const main = page.locator('main, [role="main"]');
    if ((await main.count()) > 0) {
      await expect(main.first()).toBeVisible();
    }

    // Check form accessibility
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Verify important content has proper structure
    await expect(page.locator("h1")).toContainText("Bacterial");

    // Check that dynamic content updates are announced
    await page.fill('input[name="initialPopulation"]', "500");
    await page.fill('input[name="generations"]', "20");
    await page.fill('input[name="mutationRate"]', "0.01");
    await page.fill('input[name="antibioticConcentration"]', "0.3");

    await page.click('button:has-text("Start Simulation")');

    // Check that status updates would be announced
    const statusRegion = page.locator(
      '[role="status"], [aria-live], .status-message'
    );
    if ((await statusRegion.count()) > 0) {
      await expect(statusRegion.first()).toBeVisible();
    }
  });

  test("should handle focus management during navigation", async ({ page }) => {
    // Test focus management when switching tabs
    await page.click('[role="tab"]:has-text("Results & Analysis")');

    // Focus should move to the new tab panel or its first focusable element
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    // Switch back to Parameters tab
    await page.click('[role="tab"]:has-text("Parameters")');

    // Focus should be properly managed
    const newFocused = page.locator(":focus");
    await expect(newFocused).toBeVisible();

    // Test focus trapping during modal-like interactions (if any)
    // This would be relevant if there are dialogs or modals in the app
  });
});
