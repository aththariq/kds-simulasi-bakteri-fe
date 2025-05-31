# End-to-End Testing

This directory contains comprehensive end-to-end tests for the Bacterial Antibiotic Resistance Simulation application using Playwright.

## Test Structure

### Test Files

- **`simulation-workflow.spec.ts`** - Core simulation workflow tests

  - Complete simulation workflow from parameter input to results
  - Parameter validation testing
  - Real-time progress updates verification

- **`visualization.spec.ts`** - Visualization component tests

  - Chart rendering and interaction
  - Petri dish spatial visualization
  - Data visualization accuracy

- **`responsive.spec.ts`** - Responsive design tests

  - Cross-device compatibility (mobile, tablet, desktop)
  - Orientation changes
  - Layout adaptation testing

- **`websocket.spec.ts`** - Real-time communication tests

  - WebSocket connection establishment
  - Real-time progress updates
  - Connection recovery and error handling

- **`accessibility.spec.ts`** - Accessibility compliance tests

  - ARIA attributes and roles
  - Keyboard navigation
  - Screen reader compatibility
  - Focus management

- **`performance.spec.ts`** - Performance and optimization tests
  - Page load times
  - Form interaction responsiveness
  - Memory usage monitoring
  - Large dataset handling

### Helper Utilities

- **`helpers/test-utils.ts`** - Reusable test utilities
  - `SimulationHelper` - Simulation workflow automation
  - `NavigationHelper` - Tab and page navigation
  - `FormHelper` - Form validation testing
  - `AccessibilityHelper` - Accessibility checks
  - `PerformanceHelper` - Performance measurements

## Running Tests

### Prerequisites

1. Ensure the frontend development server is running:

   ```bash
   npm run dev
   ```

2. Ensure the backend server is running on `localhost:8000`

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (with browser UI)
npm run test:e2e:headed

# Run tests with interactive UI
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test simulation-workflow.spec.ts

# Run tests for specific browser
npx playwright test --project=chromium
```

### Browser Support

Tests are configured to run on:

- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5 simulation)
- **Mobile Safari** (iPhone 12 simulation)

## Test Scenarios

### Core Workflow Tests

- Page loading and basic layout verification
- Parameter form filling and validation
- Simulation execution from start to completion
- Results visualization display
- Tab navigation functionality

### Real-time Features

- WebSocket connection establishment
- Progress bar updates during simulation
- Live data streaming to visualizations
- Connection recovery after network interruption

### User Experience

- Form validation with invalid inputs
- Responsive design across screen sizes
- Keyboard-only navigation
- Touch interactions on mobile devices

### Performance Requirements

- Page load: < 5 seconds
- Form interactions: < 1 second
- Simulation start: < 10 seconds
- Visualization render: < 15 seconds
- Large dataset handling: < 2 minutes

### Accessibility Standards

- WCAG 2.1 AA compliance
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Color contrast verification

## Test Data

Common test scenarios use predefined data sets:

```typescript
// Quick simulation for fast tests
testData.quickSimulation = {
  initialPopulation: 200,
  generations: 10,
  mutationRate: 0.01,
  antibioticConcentration: 0.2,
};

// Standard simulation for normal tests
testData.standardSimulation = {
  initialPopulation: 500,
  generations: 25,
  mutationRate: 0.01,
  antibioticConcentration: 0.3,
};

// Large simulation for performance tests
testData.longSimulation = {
  initialPopulation: 1000,
  generations: 50,
  mutationRate: 0.02,
  antibioticConcentration: 0.5,
};
```

## Configuration

### Playwright Configuration (`playwright.config.ts`)

- **Base URL**: `http://localhost:3000`
- **Test Directory**: `./e2e`
- **Parallel Execution**: Enabled
- **Retries**: 2 on CI, 0 locally
- **Reporters**: HTML report generation
- **Auto-start**: Development server during tests

### Environment Variables

- `CI` - Enables CI-specific settings
- `BASE_URL` - Override base URL if needed

## Debugging Tests

### Debug Mode

```bash
npm run test:e2e:debug
```

This opens the Playwright inspector for step-by-step debugging.

### Headed Mode

```bash
npm run test:e2e:headed
```

This runs tests with visible browser windows.

### Interactive UI

```bash
npm run test:e2e:ui
```

This opens the Playwright test runner UI for interactive test management.

### Screenshots and Videos

Failed tests automatically capture:

- Screenshots at failure point
- Video recordings of test execution
- Network logs and console output

## Best Practices

### Test Writing

1. Use descriptive test names that explain the expected behavior
2. Keep tests independent and atomic
3. Use helper functions for common operations
4. Include proper error handling and timeouts
5. Verify both positive and negative test cases

### Performance Considerations

1. Use quick simulations for non-performance tests
2. Implement proper cleanup between tests
3. Monitor memory usage in long-running tests
4. Set appropriate timeouts for different operations

### Maintenance

1. Update selectors when UI changes
2. Review and update test data periodically
3. Keep helper functions synchronized with application changes
4. Monitor test flakiness and address unstable tests

## Continuous Integration

These tests are designed to run in CI environments with:

- Headless browser execution
- Retry logic for flaky tests
- Parallel execution for faster feedback
- Comprehensive reporting and artifact collection

## Troubleshooting

### Common Issues

1. **Test timeouts** - Increase timeout values for slow operations
2. **Element not found** - Update selectors after UI changes
3. **WebSocket connection failures** - Ensure backend is running
4. **Performance test failures** - Check system resources and load

### Logs and Reports

- Test results: `test-results/` directory
- HTML reports: `playwright-report/` directory
- Screenshots: Available in test results for failed tests
- Console logs: Captured automatically during test execution
