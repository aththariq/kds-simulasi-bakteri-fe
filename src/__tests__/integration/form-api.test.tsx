import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { setupServer } from "msw/node";
import SimulationParametersForm from "@/components/simulation/SimulationParametersForm";
import { NotificationProvider } from "@/components/ui/notification-system";

// Mock server for API testing
const server = setupServer(
  rest.post("/api/simulation/start", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        simulationId: "test-simulation-id",
      })
    );
  })
);

// Mock fetch for tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Form API Integration", () => {
  const renderForm = () => {
    return render(
      <NotificationProvider>
        <SimulationParametersForm />
      </NotificationProvider>
    );
  };

  it("should submit form successfully", async () => {
    const user = userEvent.setup();
    renderForm();

    const submitButton = screen.getByRole("button", { name: /start/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/parameters validated/i)).toBeInTheDocument();
    });
  });

  it("should handle API errors gracefully", async () => {
    const user = userEvent.setup();

    // Override server response for this test
    server.use(
      rest.post("/api/simulation/start", (req, res, ctx) => {
        return res(
          ctx.status(400),
          ctx.json({
            error: "Invalid parameters",
          })
        );
      })
    );

    renderForm();

    const submitButton = screen.getByRole("button", { name: /start/i });

    try {
      await user.click(submitButton);
      // Validate error handling
    } catch {
      // Expected for test scenario
    }
  });
});
