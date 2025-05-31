import { z } from "zod";
import {
  APIErrorHandler,
  AppError,
  ErrorCategory,
  ErrorSeverity,
  errorUtils,
} from "./error-handling";
import {
  apiRequestSchema,
  apiResponseSchema,
  healthCheckResponseSchema,
  simulationStartRequestSchema,
  simulationStartResponseSchema,
} from "./schemas/api";
import { notifications } from "@/components/ui/notification-system";

// Base API client configuration
interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  validateResponses: boolean;
}

const DEFAULT_CONFIG: APIClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  validateResponses: true,
};

// Request options interface
interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  validateResponse?: boolean;
  schema?: z.ZodSchema;
  skipErrorNotification?: boolean;
}

// Response wrapper interface
interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  ok: boolean;
}

export class APIClient {
  private config: APIClientConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      method = "GET",
      body,
      headers = {},
      timeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts,
      validateResponse = this.config.validateResponses,
      schema,
      skipErrorNotification = false,
    } = options;

    const requestId = `${method}-${endpoint}-${Date.now()}`;
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    try {
      const url = `${this.config.baseURL}${endpoint}`;
      const requestConfig: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        signal: abortController.signal,
        ...(body && { body: JSON.stringify(body) }),
      };

      // Validate request if schema is provided
      if (body && schema) {
        try {
          schema.parse(body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new AppError(
              "Invalid request data",
              ErrorCategory.VALIDATION,
              ErrorSeverity.MEDIUM,
              "VALIDATION_ERROR",
              { validationErrors: error.errors }
            );
          }
        }
      }

      // Set timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeout);

      let lastError: any;

      for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
          if (attempt > 0) {
            // Exponential backoff for retries
            await new Promise(resolve =>
              setTimeout(
                resolve,
                this.config.retryDelay * Math.pow(2, attempt - 1)
              )
            );
          }

          const response = await fetch(url, requestConfig);
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await APIErrorHandler.handleResponse(response);
            // This will throw an AppError, which will be caught below
          }

          let data: T;
          const contentType = response.headers.get("content-type");

          if (contentType && contentType.includes("application/json")) {
            data = await response.json();
          } else {
            data = (await response.text()) as any;
          }

          // Validate response if schema is provided and validation is enabled
          if (validateResponse && schema) {
            try {
              data = schema.parse(data);
            } catch (error) {
              if (error instanceof z.ZodError) {
                throw new AppError(
                  "Invalid response data from server",
                  ErrorCategory.API,
                  ErrorSeverity.HIGH,
                  "RESPONSE_VALIDATION_ERROR",
                  { validationErrors: error.errors }
                );
              }
            }
          }

          this.abortControllers.delete(requestId);

          return {
            data,
            status: response.status,
            headers: response.headers,
            ok: response.ok,
          };
        } catch (error) {
          lastError = error;

          // Don't retry on certain types of errors
          if (error instanceof AppError) {
            if (
              error.category === ErrorCategory.VALIDATION ||
              error.severity === ErrorSeverity.CRITICAL
            ) {
              break;
            }
          }

          // Don't retry on the last attempt
          if (attempt === retryAttempts) {
            break;
          }

          // Handle network errors for retry logic
          if (!navigator.onLine || error.name === "AbortError") {
            const networkError = APIErrorHandler.handleNetworkError(error);
            if (!networkError.retryable) {
              break;
            }
          }
        }
      }

      // All retries failed, handle the error
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);

      if (!skipErrorNotification) {
        this.handleRequestError(lastError, endpoint, method);
      }

      throw lastError;
    } catch (error) {
      clearTimeout(timeout);
      this.abortControllers.delete(requestId);

      if (!skipErrorNotification) {
        this.handleRequestError(error, endpoint, method);
      }

      throw error;
    }
  }

  private handleRequestError(error: any, endpoint: string, method: string) {
    const context = `${method} ${endpoint}`;
    const logData = errorUtils.formatErrorForLogging(error, context);

    console.error("API Request failed:", logData);

    if (error instanceof AppError) {
      // Error notifications are handled by the global error handler
      return;
    }

    // Handle network errors
    if (!navigator.onLine) {
      notifications.error({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
      });
      return;
    }

    // Handle timeout errors
    if (error.name === "AbortError") {
      notifications.error({
        title: "Request Timeout",
        description: "The request took too long to complete. Please try again.",
        duration: 5000,
      });
      return;
    }

    // Generic error fallback
    notifications.error({
      title: "Request Failed",
      description: "An unexpected error occurred. Please try again.",
      duration: 5000,
    });
  }

  // Convenience methods for common HTTP verbs
  async get<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, "method"> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  async delete<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, "method"> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Cancel ongoing requests
  cancelRequest(requestId?: string) {
    if (requestId) {
      const controller = this.abortControllers.get(requestId);
      if (controller) {
        controller.abort();
        this.abortControllers.delete(requestId);
      }
    } else {
      // Cancel all requests
      this.abortControllers.forEach(controller => controller.abort());
      this.abortControllers.clear();
    }
  }

  // Health check endpoint
  async healthCheck() {
    try {
      const response = await this.get("/health", {
        schema: healthCheckResponseSchema,
        skipErrorNotification: true,
      });

      notifications.success({
        title: "Server Connection",
        description: "Successfully connected to the server.",
        duration: 3000,
      });

      return response.data;
    } catch (error) {
      notifications.error({
        title: "Server Unavailable",
        description:
          "Unable to connect to the server. Please check if the server is running.",
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => this.healthCheck(),
        },
      });
      throw error;
    }
  }

  // File upload with progress tracking
  async uploadFile(
    endpoint: string,
    file: File,
    options: {
      onProgress?: (progress: number) => void;
      additionalData?: Record<string, any>;
    } = {}
  ): Promise<APIResponse> {
    const { onProgress, additionalData = {} } = options;

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(
          key,
          typeof value === "string" ? value : JSON.stringify(value)
        );
      });

      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener("progress", event => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener("load", () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            resolve({
              data,
              status: xhr.status,
              headers: new Headers(),
              ok: true,
            });
          } else {
            reject(
              new AppError(
                `Upload failed: ${xhr.statusText}`,
                ErrorCategory.API,
                ErrorSeverity.MEDIUM,
                xhr.status.toString()
              )
            );
          }
        } catch (error) {
          reject(error);
        }
      });

      xhr.addEventListener("error", () => {
        reject(
          new AppError(
            "Upload failed due to network error",
            ErrorCategory.NETWORK,
            ErrorSeverity.MEDIUM,
            "UPLOAD_NETWORK_ERROR"
          )
        );
      });

      xhr.addEventListener("timeout", () => {
        reject(
          new AppError(
            "Upload timed out",
            ErrorCategory.NETWORK,
            ErrorSeverity.MEDIUM,
            "UPLOAD_TIMEOUT"
          )
        );
      });

      xhr.open("POST", `${this.config.baseURL}${endpoint}`);
      xhr.timeout = this.config.timeout;
      xhr.send(formData);
    });
  }
}

// Simulation-specific API methods
export class SimulationAPI extends APIClient {
  async startSimulation(parameters: any) {
    try {
      const response = await this.post("/simulation/start", parameters, {
        schema: simulationStartResponseSchema,
        timeout: 60000, // Longer timeout for simulation start
      });

      notifications.success({
        title: "Simulation Started",
        description: "Simulation has been successfully initiated.",
        duration: 4000,
      });

      return response.data;
    } catch (error) {
      notifications.error({
        title: "Simulation Start Failed",
        description:
          "Unable to start the simulation. Please check your parameters and try again.",
        duration: 6000,
      });
      throw error;
    }
  }

  async stopSimulation(simulationId: string) {
    try {
      const response = await this.post(`/simulation/${simulationId}/stop`);

      notifications.info({
        title: "Simulation Stopped",
        description: "Simulation has been stopped successfully.",
        duration: 3000,
      });

      return response.data;
    } catch (error) {
      notifications.error({
        title: "Stop Simulation Failed",
        description: "Unable to stop the simulation. Please try again.",
        duration: 5000,
      });
      throw error;
    }
  }

  async getSimulationStatus(simulationId: string) {
    return this.get(`/simulation/${simulationId}/status`, {
      skipErrorNotification: true, // Status checks are frequent
    });
  }

  async getSimulationResults(simulationId: string) {
    try {
      const response = await this.get(`/simulation/${simulationId}/results`);
      return response.data;
    } catch (error) {
      notifications.error({
        title: "Results Unavailable",
        description: "Unable to fetch simulation results. Please try again.",
        duration: 5000,
      });
      throw error;
    }
  }
}

// Create and export default instances
export const apiClient = new APIClient();
export const simulationAPI = new SimulationAPI();

// Export configuration for testing and customization
export { DEFAULT_CONFIG };
export type { APIResponse, RequestOptions, APIClientConfig };
