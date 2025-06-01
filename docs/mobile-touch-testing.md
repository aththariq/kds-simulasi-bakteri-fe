# Mobile Touch Interaction Testing Guide

This document provides comprehensive guidelines for testing touch interactions on mobile devices for the bacterial resistance simulation application.

## Overview

The application includes comprehensive touch interaction support across all visualization components, designed to provide an optimal user experience on mobile devices, tablets, and touch-enabled desktops.

## Testing Framework

### Core Testing Utilities

#### TouchEventUtils

Provides utilities for simulating various touch gestures:

- `simulateTap()` - Single finger tap
- `simulatePinchZoom()` - Pinch-to-zoom gestures
- `simulatePan()` - Single finger panning
- `simulateSwipe()` - Directional swipe gestures
- `createTouchEvent()` - Low-level touch event creation

#### MobileViewportUtils

Manages viewport simulation for different device types:

- `setMobileViewport()` - 375x667 mobile viewport
- `setTabletViewport()` - 768x1024 tablet viewport
- `setDesktopViewport()` - 1920x1080 desktop viewport
- `simulateOrientationChange()` - Portrait/landscape switching

#### TouchPerformanceUtils

Measures and validates touch interaction performance:

- `measureTouchResponseTime()` - Individual gesture timing
- `testTouchPerformanceWithDataLoad()` - Performance under load

## Touch Interaction Patterns

### 1. Basic Touch Interactions

#### Single Tap

- **Purpose**: Select elements, activate controls
- **Target**: Bacteria, antibiotic zones, buttons, chart elements
- **Expected Response**: Selection feedback, tooltip display, action execution
- **Performance**: < 50ms response time

#### Double Tap

- **Purpose**: Quick zoom functionality
- **Target**: Visualization areas
- **Expected Response**: Zoom in to tapped location
- **Performance**: Gesture recognition within 300ms

#### Long Press

- **Purpose**: Context menus, detailed information
- **Target**: Interactive elements
- **Expected Response**: Context menu or extended tooltip
- **Duration**: 500-1000ms hold time

### 2. Multi-Touch Gestures

#### Pinch-to-Zoom

- **Purpose**: Scale visualization content
- **Target**: SVG visualizations, charts
- **Expected Response**: Smooth scaling with center point preservation
- **Performance**: 60fps during gesture

#### Two-Finger Pan

- **Purpose**: Navigate while maintaining zoom level
- **Target**: Zoomed visualizations
- **Expected Response**: Smooth translation without zoom changes
- **Performance**: Minimal lag, immediate response

#### Swipe Gestures

- **Purpose**: Navigation, panel toggles
- **Directions**: Left, right, up, down
- **Expected Response**: Navigation or panel state changes
- **Threshold**: Minimum 100px movement

### 3. Chart-Specific Interactions

#### Data Point Selection

- **Touch Target**: Minimum 44px hit area (WCAG compliance)
- **Visual Feedback**: Highlight selected point
- **Tooltip**: Display data values on touch

#### Brush Selection

- **Gesture**: Pan gesture on brush area
- **Purpose**: Data range selection
- **Feedback**: Visual selection indicator

#### Legend Interaction

- **Touch Target**: Touch-friendly legend items
- **Purpose**: Toggle data series visibility
- **Feedback**: Visual state change

## Component-Specific Testing

### PetriDishVisualization

#### Key Test Areas:

1. **Bacterium Selection**

   - Tap accuracy on small targets
   - Selection feedback
   - Multi-selection support

2. **Zoom and Pan**

   - Pinch-to-zoom responsiveness
   - Pan boundary constraints
   - Reset to original view

3. **Control Buttons**
   - Touch target size (≥44px)
   - Button spacing (≥8px)
   - Visual feedback on touch

#### Performance Requirements:

- Touch response: < 100ms
- Zoom operations: ≥30fps
- Large datasets (1000+ bacteria): No degradation

### Chart Components

#### Key Test Areas:

1. **Data Interaction**

   - Tooltip activation
   - Data point selection
   - Brush selection (where applicable)

2. **Navigation**

   - Swipe for data navigation
   - Pinch zoom on time series
   - Pan for large datasets

3. **Legend and Controls**
   - Touch-friendly legend items
   - Control button accessibility
   - State change feedback

#### Performance Requirements:

- Chart rendering: < 500ms
- Touch response: < 100ms
- Smooth interactions: 60fps

## Test Scenarios

### 1. Device Type Testing

```typescript
// Test mobile viewport
MobileViewportUtils.setMobileViewport();
await testComponent();

// Test tablet viewport
MobileViewportUtils.setTabletViewport();
await testComponent();

// Test desktop with touch
MobileViewportUtils.setDesktopViewport();
await testComponent();
```

### 2. Orientation Testing

```typescript
// Test portrait orientation
await testComponent();

// Switch to landscape
MobileViewportUtils.simulateOrientationChange();
await testComponent();
```

### 3. Performance Testing

```typescript
// Test with large datasets
const largeDataset = generateLargeDataset(1000);
const performanceMetrics =
  await TouchPerformanceUtils.testTouchPerformanceWithDataLoad(
    component,
    largeDataset.length
  );

expect(performanceMetrics.averageResponseTime).toBeLessThan(100);
```

### 4. Accessibility Testing

```typescript
// Verify touch target sizes
const touchTargets = container.querySelectorAll('button, [role="button"]');
touchTargets.forEach(target => {
  const rect = target.getBoundingClientRect();
  expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqualTo(44);
});
```

## Running Touch Tests

### Individual Test Suites

```bash
# Run all touch interaction tests
npm run test:touch

# Run PetriDish touch tests only
npm run test:petri-touch

# Run chart touch tests only
npm run test:charts-touch

# Run mobile-specific tests
npm run test:mobile

# Watch mode for development
npm run test:touch-watch
```

### Coverage Requirements

- Touch interaction coverage: ≥90%
- Performance test coverage: ≥80%
- Accessibility test coverage: ≥95%

## Performance Benchmarks

### Response Time Targets:

- Basic tap: < 50ms
- Gesture recognition: < 100ms
- Visual feedback: < 16ms (60fps)
- Complex operations: < 500ms

### Memory Usage:

- Touch event handlers: Minimal memory footprint
- Gesture state: Cleanup on completion
- Performance monitoring: Non-intrusive

### Frame Rate Targets:

- Smooth gestures: ≥30fps (≥60fps preferred)
- Zoom operations: ≥30fps
- Pan operations: ≥60fps

## Common Issues and Solutions

### 1. Touch Event Conflicts

**Problem**: Browser default behaviors interfere with custom gestures
**Solution**: Proper `preventDefault()` usage and passive event handling

### 2. Performance Degradation

**Problem**: Slow response with large datasets
**Solution**: Data virtualization, debounced handlers, RAF optimization

### 3. Accessibility Issues

**Problem**: Touch targets too small, poor contrast
**Solution**: Minimum 44px targets, proper ARIA labels, focus management

### 4. Cross-Platform Differences

**Problem**: Inconsistent behavior across devices
**Solution**: Progressive enhancement, feature detection, fallbacks

## Best Practices

### 1. Touch Target Design

- Minimum 44px hit area (WCAG AA)
- 8px minimum spacing between targets
- Visual feedback on touch
- Clear affordances

### 2. Gesture Implementation

- Progressive enhancement
- Graceful fallbacks for non-touch devices
- Consistent gesture vocabulary
- Prevent accidental activation

### 3. Performance Optimization

- Use RAF for smooth animations
- Debounce expensive operations
- Implement proper cleanup
- Monitor memory usage

### 4. Testing Strategy

- Test on real devices when possible
- Simulate various viewport sizes
- Test with different touch patterns
- Validate accessibility compliance

## Continuous Integration

### Automated Testing

- Touch tests run on every PR
- Performance regression detection
- Cross-browser compatibility checks
- Accessibility validation

### Manual Testing Checklist

- [ ] Touch interactions work on real devices
- [ ] Performance meets benchmarks
- [ ] Accessibility standards met
- [ ] Cross-platform consistency
- [ ] Edge cases handled gracefully

## Troubleshooting

### Common Test Failures

1. **Touch Event Not Recognized**

   - Check event listener setup
   - Verify touch event simulation
   - Ensure proper coordinate mapping

2. **Performance Test Failures**

   - Review component optimization
   - Check for memory leaks
   - Validate RAF usage

3. **Accessibility Violations**
   - Audit touch target sizes
   - Verify ARIA attributes
   - Test focus management

### Debug Tools

- Browser DevTools touch simulation
- Performance profiler
- Accessibility inspector
- Network throttling

## Future Enhancements

### Planned Improvements:

- Advanced gesture recognition
- Haptic feedback support
- Multi-device synchronization
- Enhanced accessibility features

### Testing Expansion:

- Real device testing automation
- Performance monitoring in production
- User behavior analytics
- Cross-platform testing suite
