import { render, screen } from '@testing-library/react';

describe('Jest Setup', () => {
  it('should setup testing environment correctly', () => {
    // Test that Jest environment is configured
    expect(typeof global).toBe('object');
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('should have Canvas mock available', () => {
    // Test that Canvas mock is working
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    expect(context).toBeTruthy();
  });

  it('should have WebSocket mock available', () => {
    // Test that WebSocket mock is working
    expect(global.WebSocket).toBeDefined();
    expect(typeof global.WebSocket).toBe('function');
  });

  it('should have ResizeObserver mock available', () => {
    // Test that ResizeObserver mock is working
    expect(global.ResizeObserver).toBeDefined();
    expect(typeof global.ResizeObserver).toBe('function');
  });
}); 