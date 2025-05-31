import "@testing-library/jest-dom";

// Basic setup test to ensure Jest is working
describe("Test Setup", () => {
  it("should pass basic test", () => {
    expect(true).toBe(true);
  });

  it("should have jest-dom matchers available", () => {
    const element = document.createElement("div");
    expect(element).toBeInTheDocument();
  });
});
