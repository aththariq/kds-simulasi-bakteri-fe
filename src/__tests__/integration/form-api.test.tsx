import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock fetch for API testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
};

(global as any).WebSocket = jest.fn(() => mockWebSocket);

describe("Form and API Integration Tests", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockWebSocket.send.mockClear();
  });

  describe("Form Submission Integration", () => {
    const TestForm = () => {
      const [value, setValue] = React.useState("");
      const [isSubmitting, setIsSubmitting] = React.useState(false);
      const [status, setStatus] = React.useState("");

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
          const response = await fetch("/api/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value }),
          });

          if (response.ok) {
            setStatus("success");
          } else {
            setStatus("error");
          }
        } catch (error) {
          setStatus("error");
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <form onSubmit={handleSubmit} data-testid="test-form">
          <Input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Enter value"
            data-testid="form-input"
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="submit-button"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
          {status && (
            <div data-testid="status-message">
              {status === "success"
                ? "Form submitted successfully!"
                : "Submission failed!"}
            </div>
          )}
        </form>
      );
    };

    it("should handle successful form submission", async () => {
      // Add delay to simulate network request
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              100
            )
          )
      );

      const user = userEvent.setup();
      render(<TestForm />);

      const input = screen.getByTestId("form-input");
      const submitButton = screen.getByTestId("submit-button");

      // Fill form
      await user.type(input, "test value");
      expect(input).toHaveValue("test value");

      // Submit form
      await user.click(submitButton);

      // Check loading state appears briefly
      await waitFor(() => {
        expect(screen.getByText("Submitting...")).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(
        () => {
          expect(screen.getByTestId("status-message")).toHaveTextContent(
            "Form submitted successfully!"
          );
        },
        { timeout: 3000 }
      );

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "test value" }),
      });

      // Check that button is re-enabled
      expect(submitButton).not.toBeDisabled();
      expect(screen.getByText("Submit")).toBeInTheDocument();
    });

    it("should handle failed form submission", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const user = userEvent.setup();
      render(<TestForm />);

      const input = screen.getByTestId("form-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "invalid value");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("status-message")).toHaveTextContent(
          "Submission failed!"
        );
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(submitButton).not.toBeDisabled(); // Button should be re-enabled after failure
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<TestForm />);

      const input = screen.getByTestId("form-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "test value");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("status-message")).toHaveTextContent(
          "Submission failed!"
        );
      });

      expect(submitButton).not.toBeDisabled(); // Button should be re-enabled after error
    });
  });

  describe("Component State Integration", () => {
    const StatefulComponent = () => {
      const [count, setCount] = React.useState(0);
      const [input, setInput] = React.useState("");
      const [isVisible, setIsVisible] = React.useState(false);

      return (
        <div>
          <div data-testid="count-display">Count: {count}</div>
          <Button
            onClick={() => setCount(count + 1)}
            data-testid="increment-button"
          >
            Increment
          </Button>

          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type something"
            data-testid="state-input"
          />
          <div data-testid="input-mirror">{input}</div>

          <Button
            onClick={() => setIsVisible(!isVisible)}
            data-testid="toggle-button"
          >
            {isVisible ? "Hide" : "Show"}
          </Button>
          {isVisible && (
            <div data-testid="conditional-content">
              Conditional content is visible
            </div>
          )}
        </div>
      );
    };

    it("should handle multiple state updates correctly", async () => {
      const user = userEvent.setup();
      render(<StatefulComponent />);

      // Test counter
      const incrementButton = screen.getByTestId("increment-button");
      const countDisplay = screen.getByTestId("count-display");

      expect(countDisplay).toHaveTextContent("Count: 0");

      await user.click(incrementButton);
      expect(countDisplay).toHaveTextContent("Count: 1");

      await user.click(incrementButton);
      expect(countDisplay).toHaveTextContent("Count: 2");

      // Test input mirroring
      const input = screen.getByTestId("state-input");
      const mirror = screen.getByTestId("input-mirror");

      await user.type(input, "hello");
      expect(mirror).toHaveTextContent("hello");

      // Test conditional rendering
      const toggleButton = screen.getByTestId("toggle-button");

      expect(
        screen.queryByTestId("conditional-content")
      ).not.toBeInTheDocument();
      expect(toggleButton).toHaveTextContent("Show");

      await user.click(toggleButton);
      expect(screen.getByTestId("conditional-content")).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent("Hide");

      await user.click(toggleButton);
      expect(
        screen.queryByTestId("conditional-content")
      ).not.toBeInTheDocument();
      expect(toggleButton).toHaveTextContent("Show");
    });
  });

  describe("WebSocket Integration", () => {
    const WebSocketComponent = () => {
      const [connected, setConnected] = React.useState(false);
      const [messages, setMessages] = React.useState<string[]>([]);
      const [wsInstance, setWsInstance] = React.useState<WebSocket | null>(
        null
      );

      const connect = () => {
        const ws = new WebSocket("ws://localhost:8000/ws");
        setWsInstance(ws);
        setConnected(true);

        ws.addEventListener("message", event => {
          setMessages(prev => [...prev, event.data]);
        });
      };

      const sendMessage = (message: string) => {
        if (wsInstance) {
          wsInstance.send(message);
        }
      };

      const disconnect = () => {
        if (wsInstance) {
          wsInstance.close();
          setWsInstance(null);
          setConnected(false);
        }
      };

      return (
        <div>
          <div data-testid="connection-status">
            Status: {connected ? "Connected" : "Disconnected"}
          </div>

          <Button
            onClick={connect}
            disabled={connected}
            data-testid="connect-button"
          >
            Connect
          </Button>

          <Button
            onClick={disconnect}
            disabled={!connected}
            data-testid="disconnect-button"
          >
            Disconnect
          </Button>

          <Button
            onClick={() => sendMessage("test message")}
            disabled={!connected}
            data-testid="send-button"
          >
            Send Message
          </Button>

          <div data-testid="messages">
            {messages.map((msg, idx) => (
              <div key={idx} data-testid={`message-${idx}`}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      );
    };

    it("should handle WebSocket connection lifecycle", async () => {
      const user = userEvent.setup();
      render(<WebSocketComponent />);

      const connectButton = screen.getByTestId("connect-button");
      const disconnectButton = screen.getByTestId("disconnect-button");
      const sendButton = screen.getByTestId("send-button");
      const status = screen.getByTestId("connection-status");

      // Initial state
      expect(status).toHaveTextContent("Status: Disconnected");
      expect(connectButton).not.toBeDisabled();
      expect(disconnectButton).toBeDisabled();
      expect(sendButton).toBeDisabled();

      // Connect
      await user.click(connectButton);

      expect(status).toHaveTextContent("Status: Connected");
      expect(connectButton).toBeDisabled();
      expect(disconnectButton).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();

      // Send message
      await user.click(sendButton);
      expect(mockWebSocket.send).toHaveBeenCalledWith("test message");

      // Disconnect
      await user.click(disconnectButton);

      expect(status).toHaveTextContent("Status: Disconnected");
      expect(connectButton).not.toBeDisabled();
      expect(disconnectButton).toBeDisabled();
      expect(sendButton).toBeDisabled();

      // Verify WebSocket was created
      expect(global.WebSocket).toHaveBeenCalledWith("ws://localhost:8000/ws");
    });
  });

  describe("Error Boundary Integration", () => {
    class TestErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return <div data-testid="error-boundary">Something went wrong!</div>;
        }

        return this.props.children;
      }
    }

    const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
      if (shouldError) {
        throw new Error("Test error");
      }
      return <div data-testid="error-component">No error</div>;
    };

    const ErrorTestComponent = () => {
      const [shouldError, setShouldError] = React.useState(false);

      return (
        <div>
          <Button
            onClick={() => setShouldError(true)}
            data-testid="trigger-error"
          >
            Trigger Error
          </Button>

          <TestErrorBoundary>
            <ErrorComponent shouldError={shouldError} />
          </TestErrorBoundary>
        </div>
      );
    };

    it("should handle error boundary integration", async () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const user = userEvent.setup();
      render(<ErrorTestComponent />);

      // Initially no error
      expect(screen.getByTestId("error-component")).toBeInTheDocument();
      expect(screen.queryByTestId("error-boundary")).not.toBeInTheDocument();

      // Trigger error
      await user.click(screen.getByTestId("trigger-error"));

      // Error boundary should catch the error
      expect(screen.queryByTestId("error-component")).not.toBeInTheDocument();
      expect(screen.getByTestId("error-boundary")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
