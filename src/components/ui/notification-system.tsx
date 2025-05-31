"use client";

import * as React from "react";
import { toast } from "sonner";
import { ZodError, ZodIssue } from "zod";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { Alert, AlertTitle, AlertDescription, AlertActions } from "./alert";
import { Button } from "./button";
import { cn } from "@/lib/utils";

// Types for notification system
export type NotificationType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationState {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string[]>;
}

// Notification context
interface NotificationContextType {
  showNotification: (
    type: NotificationType,
    options: NotificationOptions
  ) => void;
  showValidationErrors: (errors: ZodError | ValidationError[]) => void;
  clearNotifications: () => void;
  validateAndNotify: <T>(
    data: unknown,
    schema: any,
    onSuccess?: (data: T) => void,
    onError?: (errors: ValidationError[]) => void
  ) => boolean;
}

const NotificationContext = React.createContext<NotificationContextType | null>(
  null
);

// Utility functions for handling Zod errors
export function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
    code: issue.code,
  }));
}

export function formatValidationState(
  errors: ValidationError[]
): FormValidationState {
  const fieldErrors: Record<string, string[]> = {};

  errors.forEach(error => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = [];
    }
    fieldErrors[error.field].push(error.message);
  });

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

// Toast notification functions
export const notifications = {
  success: (options: NotificationOptions) => {
    toast.success(options.title || "Success", {
      description: options.description,
      duration: options.duration || 4000,
      action: options.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  error: (options: NotificationOptions) => {
    toast.error(options.title || "Error", {
      description: options.description,
      duration: options.duration || 6000,
      action: options.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  warning: (options: NotificationOptions) => {
    toast.warning(options.title || "Warning", {
      description: options.description,
      duration: options.duration || 5000,
      action: options.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  info: (options: NotificationOptions) => {
    toast.info(options.title || "Info", {
      description: options.description,
      duration: options.duration || 4000,
      action: options.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  loading: (options: NotificationOptions) => {
    return toast.loading(options.title || "Loading...", {
      description: options.description,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, options);
  },
};

// Validation notification helpers
export function showValidationErrors(errors: ZodError | ValidationError[]) {
  const validationErrors = Array.isArray(errors)
    ? errors
    : formatZodError(errors);

  if (validationErrors.length === 1) {
    notifications.error({
      title: "Validation Error",
      description: validationErrors[0].message,
    });
  } else {
    notifications.error({
      title: "Validation Errors",
      description: `${validationErrors.length} validation errors found. Please check the form.`,
    });
  }
}

// Provider component
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const showNotification = React.useCallback(
    (type: NotificationType, options: NotificationOptions) => {
      notifications[type](options);
    },
    []
  );

  const showValidationErrorsCallback = React.useCallback(
    (errors: ZodError | ValidationError[]) => {
      showValidationErrors(errors);
    },
    []
  );

  const clearNotifications = React.useCallback(() => {
    toast.dismiss();
  }, []);

  const validateAndNotify = React.useCallback(
    <T,>(
      data: unknown,
      schema: any,
      onSuccess?: (data: T) => void,
      onError?: (errors: ValidationError[]) => void
    ): boolean => {
      try {
        const validatedData = schema.parse(data) as T;
        onSuccess?.(validatedData);
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          const validationErrors = formatZodError(error);
          showValidationErrors(error);
          onError?.(validationErrors);
        } else {
          notifications.error({
            title: "Validation Error",
            description: "An unexpected validation error occurred",
          });
        }
        return false;
      }
    },
    []
  );

  const value = React.useMemo(
    () => ({
      showNotification,
      showValidationErrors: showValidationErrorsCallback,
      clearNotifications,
      validateAndNotify,
    }),
    [
      showNotification,
      showValidationErrorsCallback,
      clearNotifications,
      validateAndNotify,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notifications
export function useNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}

// Inline alert components for forms and validation
interface ValidationAlertProps {
  errors: ValidationError[];
  className?: string;
  showTitle?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function ValidationAlert({
  errors,
  className,
  showTitle = true,
  dismissible = false,
  onDismiss,
}: ValidationAlertProps) {
  if (errors.length === 0) return null;

  return (
    <Alert
      variant="destructive"
      className={className}
      dismissible={dismissible}
      onDismiss={onDismiss}
    >
      {showTitle && (
        <AlertTitle>
          {errors.length === 1
            ? "Validation Error"
            : `${errors.length} Validation Errors`}
        </AlertTitle>
      )}
      <AlertDescription>
        {errors.length === 1 ? (
          <p>{errors[0].message}</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index}>
                <span className="font-medium">{error.field}:</span>{" "}
                {error.message}
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface FieldErrorProps {
  error?: string | string[];
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null;

  const errors = Array.isArray(error) ? error : [error];

  return (
    <div className={cn("text-sm text-destructive mt-1", className)}>
      {errors.map((err, index) => (
        <p key={index}>{err}</p>
      ))}
    </div>
  );
}

// Connection status alert
interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function ConnectionStatus({
  isConnected,
  error,
  onRetry,
  className,
}: ConnectionStatusProps) {
  if (isConnected && !error) return null;

  return (
    <Alert variant={error ? "destructive" : "warning"} className={className}>
      <AlertTitle>
        {error ? "Connection Error" : "Connection Warning"}
      </AlertTitle>
      <AlertDescription>
        {error || "Connection to the simulation server is unstable"}
      </AlertDescription>
      {onRetry && (
        <AlertActions>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry Connection
          </Button>
        </AlertActions>
      )}
    </Alert>
  );
}

// Loading state alert
interface LoadingAlertProps {
  message?: string;
  className?: string;
}

export function LoadingAlert({
  message = "Loading...",
  className,
}: LoadingAlertProps) {
  return (
    <Alert variant="loading" className={className}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

// Success confirmation alert
interface SuccessAlertProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessAlert({
  title = "Success",
  message,
  action,
  dismissible = true,
  onDismiss,
  className,
}: SuccessAlertProps) {
  return (
    <Alert
      variant="success"
      className={className}
      dismissible={dismissible}
      onDismiss={onDismiss}
    >
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {action && (
        <AlertActions>
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </AlertActions>
      )}
    </Alert>
  );
}
