import { ZodError } from "zod";
import {
  notifications,
  ValidationError,
  formatZodError,
} from "@/components/ui/notification-system";

// Error types and interfaces
export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
  timestamp?: string;
}

export interface WebSocketError {
  type: "connection" | "message" | "protocol" | "timeout";
  message: string;
  code?: string;
  originalEvent?: Event;
  reconnectAttempts?: number;
}

export interface NetworkError {
  message: string;
  status?: number;
  isNetworkError: boolean;
  isTimeout: boolean;
  retryable: boolean;
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Error categories
export enum ErrorCategory {
  VALIDATION = "validation",
  NETWORK = "network",
  API = "api",
  WEBSOCKET = "websocket",
  AUTHENTICATION = "authentication",
  PERMISSION = "permission",
  SIMULATION = "simulation",
  FILE_UPLOAD = "file_upload",
  SYSTEM = "system",
}

// Standardized error class
export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

// API Error handling
export class APIErrorHandler {
  static async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response);
      throw new AppError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        ErrorCategory.API,
        this.getSeverityFromStatus(response.status),
        errorData.code || response.status.toString(),
        { status: response.status, ...errorData.details }
      );
    }
    return response.json();
  }

  private static async parseErrorResponse(
    response: Response
  ): Promise<APIError> {
    try {
      const data = await response.json();
      return {
        message: data.message || data.error || "An error occurred",
        code: data.code,
        details: data.details,
        timestamp: data.timestamp,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
        code: response.status.toString(),
      };
    }
  }

  private static getSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  static handleNetworkError(error: any): NetworkError {
    const isNetworkError = !navigator.onLine || error.name === "NetworkError";
    const isTimeout =
      error.name === "AbortError" || error.code === "NETWORK_TIMEOUT";

    return {
      message: isNetworkError
        ? "Network connection lost. Please check your internet connection."
        : isTimeout
        ? "Request timed out. Please try again."
        : "Network error occurred",
      isNetworkError,
      isTimeout,
      retryable: isNetworkError || isTimeout,
      status: error.status,
    };
  }
}

// WebSocket Error handling
export class WebSocketErrorHandler {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  handleConnectionError(event: Event): WebSocketError {
    const error: WebSocketError = {
      type: "connection",
      message: "WebSocket connection failed",
      originalEvent: event,
      reconnectAttempts: this.reconnectAttempts,
    };

    this.showConnectionError(error);
    return error;
  }

  handleMessageError(data: any): WebSocketError {
    const error: WebSocketError = {
      type: "message",
      message: "Invalid message received from server",
      code: "INVALID_MESSAGE_FORMAT",
    };

    notifications.warning({
      title: "Message Error",
      description:
        "Received invalid data from server. Some features may not work correctly.",
      duration: 5000,
    });

    return error;
  }

  handleProtocolError(
    expectedType: string,
    receivedType: string
  ): WebSocketError {
    const error: WebSocketError = {
      type: "protocol",
      message: `Protocol mismatch: expected ${expectedType}, received ${receivedType}`,
      code: "PROTOCOL_MISMATCH",
    };

    notifications.error({
      title: "Protocol Error",
      description:
        "Communication protocol error with server. Please refresh the page.",
      duration: 8000,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload(),
      },
    });

    return error;
  }

  private showConnectionError(error: WebSocketError) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      notifications.warning({
        title: "Connection Lost",
        description: `Attempting to reconnect... (${
          this.reconnectAttempts + 1
        }/${this.maxReconnectAttempts})`,
        duration: 3000,
      });
    } else {
      notifications.error({
        title: "Connection Failed",
        description:
          "Unable to establish connection to server. Please refresh the page.",
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    }
  }

  async attemptReconnect(
    connectFunction: () => Promise<void>
  ): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts++;

    try {
      await new Promise(resolve =>
        setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts)
      );
      await connectFunction();

      notifications.success({
        title: "Reconnected",
        description: "Connection to server restored successfully.",
        duration: 3000,
      });

      this.resetReconnectAttempts();
      return true;
    } catch (error) {
      return this.attemptReconnect(connectFunction);
    }
  }

  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }
}

// Validation Error handling
export class ValidationErrorHandler {
  static handleZodError(
    error: ZodError,
    fieldPrefix?: string
  ): ValidationError[] {
    const errors = formatZodError(error);

    if (fieldPrefix) {
      return errors.map(err => ({
        ...err,
        field: `${fieldPrefix}.${err.field}`,
      }));
    }

    return errors;
  }

  static showValidationNotification(errors: ValidationError[]) {
    if (errors.length === 1) {
      notifications.error({
        title: "Validation Error",
        description: errors[0].message,
        duration: 5000,
      });
    } else {
      notifications.error({
        title: "Multiple Validation Errors",
        description: `${errors.length} validation errors found. Please review all highlighted fields.`,
        duration: 6000,
      });
    }
  }

  static showFieldValidationError(field: string, message: string) {
    notifications.error({
      title: `${field} Error`,
      description: message,
      duration: 4000,
    });
  }
}

// File Upload Error handling
export class FileUploadErrorHandler {
  static handleUploadError(error: any, fileName: string) {
    if (error instanceof AppError) {
      notifications.error({
        title: "Upload Failed",
        description: `Failed to upload "${fileName}": ${error.message}`,
        duration: 6000,
      });
    } else {
      notifications.error({
        title: "Upload Error",
        description: `An unexpected error occurred while uploading "${fileName}". Please try again.`,
        duration: 6000,
      });
    }
  }

  static validateFileType(file: File, allowedTypes: string[]): boolean {
    if (!allowedTypes.includes(file.type)) {
      notifications.error({
        title: "Invalid File Type",
        description: `File type "${
          file.type
        }" is not supported. Allowed types: ${allowedTypes.join(", ")}`,
        duration: 5000,
      });
      return false;
    }
    return true;
  }

  static validateFileSize(file: File, maxSizeBytes: number): boolean {
    if (file.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

      notifications.error({
        title: "File Too Large",
        description: `File size (${fileSizeMB}MB) exceeds the maximum allowed size of ${maxSizeMB}MB.`,
        duration: 5000,
      });
      return false;
    }
    return true;
  }
}

// Simulation Error handling
export class SimulationErrorHandler {
  static handleSimulationError(error: any, context: string) {
    if (error instanceof AppError) {
      notifications.error({
        title: "Simulation Error",
        description: `${context}: ${error.message}`,
        duration: 8000,
      });
    } else {
      notifications.error({
        title: "Unexpected Simulation Error",
        description: `An error occurred during ${context}. Please try restarting the simulation.`,
        duration: 8000,
        action: {
          label: "Report Issue",
          onClick: () => {
            // This could open a feedback form or error reporting system
            console.error("Simulation error:", error);
          },
        },
      });
    }
  }

  static handleParameterValidationError(
    parameter: string,
    value: any,
    constraint: string
  ) {
    notifications.error({
      title: "Invalid Simulation Parameter",
      description: `${parameter} value (${value}) ${constraint}`,
      duration: 5000,
    });
  }
}

// Global error handler
export class GlobalErrorHandler {
  static setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", event => {
      console.error("Unhandled promise rejection:", event.reason);

      if (event.reason instanceof AppError) {
        this.handleAppError(event.reason);
      } else {
        notifications.error({
          title: "Unexpected Error",
          description:
            "An unexpected error occurred. The development team has been notified.",
          duration: 6000,
        });
      }

      event.preventDefault();
    });

    // Handle global JavaScript errors
    window.addEventListener("error", event => {
      console.error("Global error:", event.error);

      notifications.error({
        title: "Application Error",
        description: "A critical error occurred. Please refresh the page.",
        duration: 8000,
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    });

    // Handle network status changes
    window.addEventListener("online", () => {
      notifications.success({
        title: "Connection Restored",
        description: "Internet connection is back online.",
        duration: 3000,
      });
    });

    window.addEventListener("offline", () => {
      notifications.warning({
        title: "Connection Lost",
        description: "You are now offline. Some features may not be available.",
        duration: 5000,
      });
    });
  }

  static handleAppError(error: AppError) {
    const severityConfig = {
      [ErrorSeverity.LOW]: { duration: 4000 },
      [ErrorSeverity.MEDIUM]: { duration: 6000 },
      [ErrorSeverity.HIGH]: { duration: 8000 },
      [ErrorSeverity.CRITICAL]: {
        duration: 0, // Don't auto-dismiss critical errors
        action: {
          label: "Report Issue",
          onClick: () => console.error("Critical error:", error),
        },
      },
    };

    const config = severityConfig[error.severity];

    notifications.error({
      title: `${
        error.category.charAt(0).toUpperCase() + error.category.slice(1)
      } Error`,
      description: error.message,
      ...config,
    });
  }
}

// Utility functions for common error scenarios
export const errorUtils = {
  // Create standardized error messages
  createValidationMessage: (field: string, rule: string, value?: any) => {
    const templates = {
      required: `${field} is required`,
      min: `${field} must be at least ${value}`,
      max: `${field} must not exceed ${value}`,
      email: `${field} must be a valid email address`,
      url: `${field} must be a valid URL`,
      pattern: `${field} format is invalid`,
    };
    return templates[rule as keyof typeof templates] || `${field} is invalid`;
  },

  // Extract error message from various error types
  extractErrorMessage: (error: any): string => {
    if (error instanceof AppError) return error.message;
    if (error instanceof ZodError) return "Validation failed";
    if (error?.message) return error.message;
    if (typeof error === "string") return error;
    return "An unexpected error occurred";
  },

  // Check if error is retryable
  isRetryableError: (error: any): boolean => {
    if (error instanceof AppError) {
      return (
        error.category === ErrorCategory.NETWORK ||
        error.category === ErrorCategory.WEBSOCKET
      );
    }
    return false;
  },

  // Format error for logging
  formatErrorForLogging: (
    error: any,
    context?: string
  ): Record<string, any> => {
    return {
      message: errorUtils.extractErrorMessage(error),
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error?.stack,
      ...(error instanceof AppError && {
        category: error.category,
        severity: error.severity,
        code: error.code,
        details: error.details,
      }),
    };
  },
};

// Initialize global error handling when the module is imported
if (typeof window !== "undefined") {
  GlobalErrorHandler.setupGlobalHandlers();
}

export {
  APIErrorHandler,
  WebSocketErrorHandler,
  ValidationErrorHandler,
  FileUploadErrorHandler,
  SimulationErrorHandler,
  GlobalErrorHandler,
};
