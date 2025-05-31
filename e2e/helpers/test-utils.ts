import { Page, expect } from "@playwright/test";

export class SimulationHelper {
  constructor(private page: Page) {}

  async fillBasicParameters(
    options: {
      initialPopulation?: number;
      generations?: number;
      mutationRate?: number;
      antibioticConcentration?: number;
    } = {}
  ) {
    const {
      initialPopulation = 500,
      generations = 20,
      mutationRate = 0.01,
      antibioticConcentration = 0.3,
    } = options;

    await this.page.fill(
      'input[name="initialPopulation"]',
      initialPopulation.toString()
    );
    await this.page.fill('input[name="generations"]', generations.toString());
    await this.page.fill('input[name="mutationRate"]', mutationRate.toString());
    await this.page.fill(
      'input[name="antibioticConcentration"]',
      antibioticConcentration.toString()
    );
  }

  async startSimulation() {
    const startButton = this.page.locator(
      'button:has-text("Start Simulation")'
    );
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for simulation to start
    await expect(this.page.locator("text=Simulation started")).toBeVisible({
      timeout: 10000,
    });
  }

  async waitForCompletion(timeout = 60000) {
    await expect(this.page.locator("text=Simulation completed")).toBeVisible({
      timeout,
    });
  }

  async runQuickSimulation(
    options: {
      initialPopulation?: number;
      generations?: number;
      mutationRate?: number;
      antibioticConcentration?: number;
    } = {}
  ) {
    await this.fillBasicParameters(options);
    await this.startSimulation();
    await this.waitForCompletion();
  }
}

export class NavigationHelper {
  constructor(private page: Page) {}

  async switchToResultsTab() {
    await this.page.click('[role="tab"]:has-text("Results & Analysis")');
    await expect(this.page.locator('[role="tabpanel"]')).toBeVisible();
  }

  async switchToParametersTab() {
    await this.page.click('[role="tab"]:has-text("Parameters")');
    await expect(this.page.locator("form")).toBeVisible();
  }

  async waitForVisualization(timeout = 15000) {
    await expect(
      this.page.locator("canvas, svg, .recharts-wrapper")
    ).toBeVisible({ timeout });
  }
}

export class FormHelper {
  constructor(private page: Page) {}

  async fillInvalidParameters() {
    await this.page.fill('input[name="initialPopulation"]', "-100");
    await this.page.fill('input[name="generations"]', "0");
    await this.page.fill('input[name="mutationRate"]', "2.0");
    await this.page.fill('input[name="antibioticConcentration"]', "-1");
  }

  async expectValidationErrors() {
    // Look for common validation error patterns
    const errorSelectors = [
      "text=must be positive",
      "text=must be greater than",
      "text=must be between",
      "text=invalid",
      "text=required",
      ".error",
      '[role="alert"]',
      ".text-destructive",
    ];

    let foundError = false;
    for (const selector of errorSelectors) {
      const elements = this.page.locator(selector);
      if ((await elements.count()) > 0) {
        await expect(elements.first()).toBeVisible();
        foundError = true;
        break;
      }
    }

    if (!foundError) {
      // If no specific error messages found, check if form submission was prevented
      const startButton = this.page.locator(
        'button:has-text("Start Simulation")'
      );
      await startButton.click();

      // Wait a bit and check that simulation didn't start
      await this.page.waitForTimeout(2000);
      const simulationStarted = this.page.locator("text=Simulation started");
      expect(await simulationStarted.count()).toBe(0);
    }
  }
}

export class AccessibilityHelper {
  constructor(private page: Page) {}

  async checkBasicAccessibility() {
    // Check page has title
    await expect(this.page).toHaveTitle(/.+/);

    // Check for h1
    await expect(this.page.locator("h1")).toBeVisible();

    // Check for proper landmark structure
    const main = this.page.locator('main, [role="main"]');
    if ((await main.count()) > 0) {
      await expect(main.first()).toBeVisible();
    }
  }

  async testKeyboardNavigation() {
    // Tab through focusable elements
    const focusableElements = this.page.locator(
      'input, button, [role="tab"], select, textarea, a[href]'
    );
    const elementCount = await focusableElements.count();

    if (elementCount > 0) {
      await this.page.keyboard.press("Tab");

      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const focused = this.page.locator(":focus");
        await expect(focused).toBeVisible();
        await this.page.keyboard.press("Tab");
      }
    }
  }
}

export class PerformanceHelper {
  constructor(private page: Page) {}

  async measurePageLoad() {
    const startTime = Date.now();
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
    const endTime = Date.now();

    return endTime - startTime;
  }

  async measureFormInteraction() {
    const startTime = Date.now();

    await this.page.fill('input[name="initialPopulation"]', "500");
    await this.page.fill('input[name="generations"]', "20");
    await this.page.fill('input[name="mutationRate"]', "0.01");
    await this.page.fill('input[name="antibioticConcentration"]', "0.3");

    const endTime = Date.now();

    return endTime - startTime;
  }
}

// Common test data
export const testData = {
  quickSimulation: {
    initialPopulation: 200,
    generations: 10,
    mutationRate: 0.01,
    antibioticConcentration: 0.2,
  },
  standardSimulation: {
    initialPopulation: 500,
    generations: 25,
    mutationRate: 0.01,
    antibioticConcentration: 0.3,
  },
  longSimulation: {
    initialPopulation: 1000,
    generations: 50,
    mutationRate: 0.02,
    antibioticConcentration: 0.5,
  },
  invalidParameters: {
    initialPopulation: -100,
    generations: 0,
    mutationRate: 2.0,
    antibioticConcentration: -1,
  },
};
