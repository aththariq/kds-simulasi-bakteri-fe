import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SimulationParametersForm } from "../../components/simulation/SimulationParametersForm";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Mock server setup
const server = setupServer(
  // Mock successful simulation start
  http.post("/api/simulation/start", () => {
    return HttpResponse.json({
      success: true,
      simulationId: "test-simulation-123",
      message: "Simulation started successfully",
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("SimulationForm API Integration", () => {
  test("submits form data to API successfully", async () => {
    render(<SimulationParametersForm />);

    // Fill out the form
    const populationInput = screen.getByLabelText(/initial population/i);
    const generationsInput = screen.getByLabelText(/generations/i);
    const submitButton = screen.getByRole("button", {
      name: /start simulation/i,
    });

    fireEvent.change(populationInput, { target: { value: "1000" } });
    fireEvent.change(generationsInput, { target: { value: "100" } });

    // Submit the form
    fireEvent.click(submitButton);

    // Wait for success message
    await waitFor(() => {
      expect(
        screen.getByText(/simulation started successfully/i)
      ).toBeInTheDocument();
    });
  });

  test("handles API errors gracefully", async () => {
    // Override the handler for this test
    server.use(
      http.post("/api/simulation/start", () => {
        return HttpResponse.json(
          {
            success: false,
            error: "Server error occurred",
          },
          { status: 500 }
        );
      })
    );

    render(<SimulationParametersForm />);

    const populationInput = screen.getByLabelText(/initial population/i);
    const submitButton = screen.getByRole("button", {
      name: /start simulation/i,
    });

    fireEvent.change(populationInput, { target: { value: "1000" } });
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
    });
  });

  test("validates form data before submission", async () => {
    render(<SimulationParametersForm />);

    const submitButton = screen.getByRole("button", {
      name: /start simulation/i,
    });

    // Try to submit without filling required fields
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(
        screen.getByText(/initial population is required/i)
      ).toBeInTheDocument();
    });
  });
});
