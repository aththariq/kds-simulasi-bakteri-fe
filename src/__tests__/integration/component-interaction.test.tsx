import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

describe("Component Interaction Integration Tests", () => {
  describe("Multi-Component State Flow", () => {
    interface TodoItem {
      id: number;
      text: string;
      completed: boolean;
    }

    const TodoApp = () => {
      const [todos, setTodos] = React.useState<TodoItem[]>([]);
      const [newTodo, setNewTodo] = React.useState("");
      const [filter, setFilter] = React.useState<
        "all" | "active" | "completed"
      >("all");

      const addTodo = () => {
        if (newTodo.trim()) {
          setTodos(prev => [
            ...prev,
            {
              id: Date.now(),
              text: newTodo.trim(),
              completed: false,
            },
          ]);
          setNewTodo("");
        }
      };

      const toggleTodo = (id: number) => {
        setTodos(prev =>
          prev.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          )
        );
      };

      const removeTodo = (id: number) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
      };

      const filteredTodos = todos.filter(todo => {
        if (filter === "active") return !todo.completed;
        if (filter === "completed") return todo.completed;
        return true;
      });

      const completedCount = todos.filter(todo => todo.completed).length;
      const activeCount = todos.length - completedCount;

      return (
        <div>
          <div data-testid="todo-header">
            <Input
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              placeholder="Add a todo..."
              data-testid="new-todo-input"
              onKeyDown={e => e.key === "Enter" && addTodo()}
            />
            <Button onClick={addTodo} data-testid="add-todo-button">
              Add Todo
            </Button>
          </div>

          <div data-testid="filter-controls">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              data-testid="filter-all"
            >
              All ({todos.length})
            </Button>
            <Button
              variant={filter === "active" ? "default" : "outline"}
              onClick={() => setFilter("active")}
              data-testid="filter-active"
            >
              Active ({activeCount})
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              onClick={() => setFilter("completed")}
              data-testid="filter-completed"
            >
              Completed ({completedCount})
            </Button>
          </div>

          <div data-testid="todo-list">
            {filteredTodos.map(todo => (
              <div
                key={todo.id}
                data-testid={`todo-item-${todo.id}`}
                className={todo.completed ? "completed" : "active"}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  data-testid={`todo-checkbox-${todo.id}`}
                  aria-label={`Mark "${todo.text}" as ${
                    todo.completed ? "incomplete" : "complete"
                  }`}
                />
                <span data-testid={`todo-text-${todo.id}`}>{todo.text}</span>
                <Button
                  onClick={() => removeTodo(todo.id)}
                  data-testid={`remove-todo-${todo.id}`}
                  variant="destructive"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div data-testid="todo-stats">
            Total: {todos.length}, Active: {activeCount}, Completed:{" "}
            {completedCount}
          </div>
        </div>
      );
    };

    it("should handle complete todo workflow", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      const input = screen.getByTestId("new-todo-input");
      const addButton = screen.getByTestId("add-todo-button");

      // Initially empty
      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 0, Active: 0, Completed: 0"
      );

      // Add first todo
      await user.type(input, "First todo");
      await user.click(addButton);

      expect(input).toHaveValue("");
      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 1, Active: 1, Completed: 0"
      );
      expect(screen.getByText("First todo")).toBeInTheDocument();

      // Add second todo using Enter key
      await user.type(input, "Second todo");
      await user.keyboard("{Enter}");

      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 2, Active: 2, Completed: 0"
      );

      // Complete first todo
      const firstTodoId = screen
        .getByText("First todo")
        .closest('[data-testid^="todo-item-"]')
        ?.getAttribute("data-testid")
        ?.split("-")[2];
      const firstCheckbox = screen.getByTestId(`todo-checkbox-${firstTodoId}`);
      await user.click(firstCheckbox);

      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 2, Active: 1, Completed: 1"
      );

      // Test filters
      const filterActive = screen.getByTestId("filter-active");
      const filterCompleted = screen.getByTestId("filter-completed");
      const filterAll = screen.getByTestId("filter-all");

      // Filter by active
      await user.click(filterActive);
      expect(screen.getByText("Second todo")).toBeInTheDocument();
      expect(screen.queryByText("First todo")).not.toBeInTheDocument();

      // Filter by completed
      await user.click(filterCompleted);
      expect(screen.getByText("First todo")).toBeInTheDocument();
      expect(screen.queryByText("Second todo")).not.toBeInTheDocument();

      // Show all
      await user.click(filterAll);
      expect(screen.getByText("First todo")).toBeInTheDocument();
      expect(screen.getByText("Second todo")).toBeInTheDocument();

      // Remove todo
      const secondTodoId = screen
        .getByText("Second todo")
        .closest('[data-testid^="todo-item-"]')
        ?.getAttribute("data-testid")
        ?.split("-")[2];
      const removeButton = screen.getByTestId(`remove-todo-${secondTodoId}`);
      await user.click(removeButton);

      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 1, Active: 0, Completed: 1"
      );
      expect(screen.queryByText("Second todo")).not.toBeInTheDocument();
    });

    it("should handle edge cases", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      const input = screen.getByTestId("new-todo-input");
      const addButton = screen.getByTestId("add-todo-button");

      // Try to add empty todo
      await user.click(addButton);
      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 0, Active: 0, Completed: 0"
      );

      // Try to add whitespace-only todo
      await user.type(input, "   ");
      await user.click(addButton);
      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 0, Active: 0, Completed: 0"
      );
      expect(input).toHaveValue("   ");

      // Clear input manually and add valid todo
      await user.clear(input);
      await user.type(input, "  Valid todo  ");
      await user.click(addButton);
      expect(screen.getByText("Valid todo")).toBeInTheDocument();
      expect(screen.getByTestId("todo-stats")).toHaveTextContent(
        "Total: 1, Active: 1, Completed: 0"
      );
      expect(input).toHaveValue("");
    });
  });

  describe("Asynchronous Component Integration", () => {
    interface DataItem {
      id: number;
      name: string;
      status: "loading" | "success" | "error";
    }

    const AsyncDataComponent = () => {
      const [items, setItems] = React.useState<DataItem[]>([]);
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState<string | null>(null);

      const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));

          // Simulate random success/failure
          if (Math.random() > 0.3) {
            const newItems = Array.from({ length: 3 }, (_, i) => ({
              id: Date.now() + i,
              name: `Item ${Date.now() + i}`,
              status: "success" as const,
            }));
            setItems(prev => [...prev, ...newItems]);
          } else {
            throw new Error("Failed to fetch data");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setLoading(false);
        }
      };

      const clearData = () => {
        setItems([]);
        setError(null);
      };

      const retryFailed = () => {
        setError(null);
        fetchData();
      };

      return (
        <div>
          <div data-testid="controls">
            <Button
              onClick={fetchData}
              disabled={loading}
              data-testid="fetch-button"
            >
              {loading ? "Loading..." : "Fetch Data"}
            </Button>
            <Button onClick={clearData} data-testid="clear-button">
              Clear Data
            </Button>
            {error && (
              <Button
                onClick={retryFailed}
                data-testid="retry-button"
                variant="outline"
              >
                Retry
              </Button>
            )}
          </div>

          {loading && (
            <div data-testid="loading-indicator">Loading data...</div>
          )}

          {error && (
            <div data-testid="error-message" className="error">
              Error: {error}
            </div>
          )}

          <div data-testid="data-list">
            {items.map(item => (
              <div key={item.id} data-testid={`data-item-${item.id}`}>
                {item.name} - {item.status}
              </div>
            ))}
          </div>

          <div data-testid="stats">Items: {items.length}</div>
        </div>
      );
    };

    it("should handle successful data fetching", async () => {
      // Mock Math.random to always succeed
      const mockRandom = jest.spyOn(Math, "random").mockReturnValue(0.5);

      const user = userEvent.setup();
      render(<AsyncDataComponent />);

      const fetchButton = screen.getByTestId("fetch-button");

      // Initially no data
      expect(screen.getByTestId("stats")).toHaveTextContent("Items: 0");

      // Start fetch
      await user.click(fetchButton);

      // Check loading state
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
      expect(fetchButton).toBeDisabled();
      expect(fetchButton).toHaveTextContent("Loading...");

      // Wait for completion
      await waitFor(
        () => {
          expect(
            screen.queryByTestId("loading-indicator")
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(fetchButton).not.toBeDisabled();
      expect(fetchButton).toHaveTextContent("Fetch Data");
      expect(screen.getByTestId("stats")).toHaveTextContent("Items: 3");

      // Verify items exist
      const dataList = screen.getByTestId("data-list");
      expect(dataList.children).toHaveLength(3);

      mockRandom.mockRestore();
    });

    it("should handle fetch errors and retry", async () => {
      // Mock Math.random to always fail first, then succeed
      const mockRandom = jest.spyOn(Math, "random");
      mockRandom.mockReturnValueOnce(0.1); // First call fails
      mockRandom.mockReturnValueOnce(0.5); // Second call succeeds

      const user = userEvent.setup();
      render(<AsyncDataComponent />);

      const fetchButton = screen.getByTestId("fetch-button");

      // Start fetch (will fail)
      await user.click(fetchButton);

      // Wait for error
      await waitFor(
        () => {
          expect(screen.getByTestId("error-message")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Error: Failed to fetch data"
      );
      expect(screen.getByTestId("retry-button")).toBeInTheDocument();

      // Test retry (will succeed)
      const retryButton = screen.getByTestId("retry-button");
      await user.click(retryButton);

      // Wait for success
      await waitFor(
        () => {
          expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expect(screen.getByTestId("stats")).toHaveTextContent("Items: 3");
        },
        { timeout: 3000 }
      );

      mockRandom.mockRestore();
    });

    it("should handle clear data functionality", async () => {
      const mockRandom = jest.spyOn(Math, "random").mockReturnValue(0.5);

      const user = userEvent.setup();
      render(<AsyncDataComponent />);

      // Fetch data first
      await user.click(screen.getByTestId("fetch-button"));
      await waitFor(() => {
        expect(screen.getByTestId("stats")).toHaveTextContent("Items: 3");
      });

      // Clear data
      await user.click(screen.getByTestId("clear-button"));
      expect(screen.getByTestId("stats")).toHaveTextContent("Items: 0");

      // Verify no items in list
      const dataList = screen.getByTestId("data-list");
      expect(dataList.children).toHaveLength(0);

      mockRandom.mockRestore();
    });
  });

  describe("Context and Provider Integration", () => {
    interface Theme {
      mode: "light" | "dark";
      primaryColor: string;
    }

    const ThemeContext = React.createContext<{
      theme: Theme;
      setTheme: (theme: Theme) => void;
    } | null>(null);

    const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
      const [theme, setTheme] = React.useState<Theme>({
        mode: "light",
        primaryColor: "#007bff",
      });

      return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
          {children}
        </ThemeContext.Provider>
      );
    };

    const useTheme = () => {
      const context = React.useContext(ThemeContext);
      if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
      }
      return context;
    };

    const ThemeDisplay = () => {
      const { theme } = useTheme();

      return (
        <div
          data-testid="theme-display"
          style={{
            backgroundColor: theme.mode === "dark" ? "#333" : "#fff",
            color: theme.mode === "dark" ? "#fff" : "#333",
          }}
        >
          Mode: {theme.mode}, Color: {theme.primaryColor}
        </div>
      );
    };

    const ThemeControls = () => {
      const { theme, setTheme } = useTheme();

      const toggleMode = () => {
        setTheme({
          ...theme,
          mode: theme.mode === "light" ? "dark" : "light",
        });
      };

      const changeColor = (color: string) => {
        setTheme({
          ...theme,
          primaryColor: color,
        });
      };

      return (
        <div>
          <Button onClick={toggleMode} data-testid="toggle-mode">
            Switch to {theme.mode === "light" ? "Dark" : "Light"}
          </Button>
          <Button
            onClick={() => changeColor("#ff0000")}
            data-testid="color-red"
          >
            Red
          </Button>
          <Button
            onClick={() => changeColor("#00ff00")}
            data-testid="color-green"
          >
            Green
          </Button>
        </div>
      );
    };

    const ThemedApp = () => (
      <ThemeProvider>
        <ThemeDisplay />
        <ThemeControls />
      </ThemeProvider>
    );

    it("should handle context state updates across components", async () => {
      const user = userEvent.setup();
      render(<ThemedApp />);

      const display = screen.getByTestId("theme-display");
      const toggleButton = screen.getByTestId("toggle-mode");

      // Initial state
      expect(display).toHaveTextContent("Mode: light, Color: #007bff");
      expect(toggleButton).toHaveTextContent("Switch to Dark");

      // Toggle mode
      await user.click(toggleButton);
      expect(display).toHaveTextContent("Mode: dark, Color: #007bff");
      expect(toggleButton).toHaveTextContent("Switch to Light");

      // Change color
      await user.click(screen.getByTestId("color-red"));
      expect(display).toHaveTextContent("Mode: dark, Color: #ff0000");

      // Toggle mode again
      await user.click(toggleButton);
      expect(display).toHaveTextContent("Mode: light, Color: #ff0000");

      // Change color again
      await user.click(screen.getByTestId("color-green"));
      expect(display).toHaveTextContent("Mode: light, Color: #00ff00");
    });
  });
});
