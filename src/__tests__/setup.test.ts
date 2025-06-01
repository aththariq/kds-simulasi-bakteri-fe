import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import React from "react";

// Basic setup test to ensure Jest is working
describe("Test Setup", () => {
  it("should pass basic test", () => {
    expect(true).toBe(true);
  });

  it("should have jest-dom matchers available", () => {
    const { container } = render(
      React.createElement("div", { "data-testid": "test-element" }, "Test")
    );
    const element = container.querySelector('[data-testid="test-element"]');
    expect(element).toBeInTheDocument();
  });
});
