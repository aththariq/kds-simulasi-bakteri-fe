import { z } from "zod";
export { z };

// Re-export all WebSocket schemas
export * from "./websocket";

// Re-export all API schemas
export * from "./api";

// Re-export all user schemas
export * from "./user";

// Re-export session schemas
export * from "./session";

// Re-export existing validation schemas
export * from "../validation";

// Re-export export service types
export * from "../export-service";

// Re-export parameter utilities
export * from "../parameter-export-utils";

// Common validation utilities

// Generic validation result type
export type ValidationResult<T> =
  | {
      success: true;
      data: T;
      errors: null;
    }
  | {
      success: false;
      data: null;
      errors: Record<string, unknown>;
    };

// Common validation patterns
export const CommonSchemas = {
  // ID validation
  id: z
    .string()
    .min(1, "ID is required")
    .max(100, "ID cannot exceed 100 characters"),

  // UUID validation
  uuid: z.string().uuid("Invalid UUID format"),

  // Email validation
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email cannot exceed 255 characters"),

  // URL validation
  url: z.string().url("Invalid URL format"),

  // Timestamp validation
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),

  // Non-empty string
  nonEmptyString: z.string().min(1, "This field is required"),

  // Positive number
  positiveNumber: z.number().min(0, "Value must be positive"),

  // Positive integer
  positiveInteger: z.number().int().min(0, "Value must be a positive integer"),

  // Percentage (0-100)
  percentage: z
    .number()
    .min(0, "Percentage cannot be negative")
    .max(100, "Percentage cannot exceed 100"),

  // Normalized value (0-1)
  normalized: z
    .number()
    .min(0, "Value cannot be negative")
    .max(1, "Value cannot exceed 1"),

  // File size (in bytes)
  fileSize: z
    .number()
    .min(1, "File cannot be empty")
    .max(100 * 1024 * 1024, "File cannot exceed 100MB"),

  // Hex color
  hexColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color format"),

  // Slug (URL-friendly string)
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),

  // Version string (semantic versioning)
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?$/, "Invalid version format"),

  // IP address
  ipAddress: z.string().ip("Invalid IP address"),

  // Phone number (international format)
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),

  // Base64 string
  base64: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, "Invalid base64 format"),

  // JSON string
  jsonString: z.string().refine(val => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "Invalid JSON format"),

  // Safe HTML (basic XSS prevention)
  safeHtml: z.string().refine(val => {
    // Basic check for script tags and javascript: protocols
    const dangerous = /<script|javascript:|on\w+\s*=/i;
    return !dangerous.test(val);
  }, "Potentially unsafe HTML content"),

  // Alphanumeric with spaces
  alphanumericSpaces: z
    .string()
    .regex(/^[a-zA-Z0-9\s]+$/, "Only letters, numbers, and spaces are allowed"),

  // Username format
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores"
    ),

  // Password strength
  strongPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
    .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
    .regex(/(?=.*\d)/, "Password must contain at least one number")
    .regex(
      /(?=.*[@$!%*?&])/,
      "Password must contain at least one special character"
    ),

  // Currency amount (2 decimal places)
  currency: z
    .number()
    .multipleOf(0.01, "Currency must have at most 2 decimal places"),

  // Coordinate (latitude/longitude)
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  // Social security number (US format)
  ssn: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{4}$/, "Invalid SSN format (XXX-XX-XXXX)"),

  // Credit card number (basic format check)
  creditCard: z
    .string()
    .regex(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/, "Invalid credit card format"),

  // File path
  filePath: z.string().regex(/^[^<>:"|?*\x00-\x1f]+$/, "Invalid file path"),

  // Domain name
  domain: z
    .string()
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/,
      "Invalid domain name"
    ),

  // Timezone
  timezone: z
    .string()
    .regex(/^[A-Za-z]+\/[A-Za-z_]+$/, "Invalid timezone format"),

  // Language code (ISO 639-1)
  languageCode: z.string().regex(/^[a-z]{2}$/, "Invalid language code format"),

  // Country code (ISO 3166-1 alpha-2)
  countryCode: z.string().regex(/^[A-Z]{2}$/, "Invalid country code format"),

  // MIME type
  mimeType: z
    .string()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/,
      "Invalid MIME type format"
    ),
};

// Error message utilities
export const ErrorMessages = {
  REQUIRED: "This field is required",
  INVALID_FORMAT: "Invalid format",
  TOO_SHORT: (min: number) => `Must be at least ${min} characters`,
  TOO_LONG: (max: number) => `Cannot exceed ${max} characters`,
  TOO_SMALL: (min: number) => `Must be at least ${min}`,
  TOO_LARGE: (max: number) => `Cannot exceed ${max}`,
  INVALID_EMAIL: "Invalid email address",
  INVALID_URL: "Invalid URL format",
  INVALID_DATE: "Invalid date format",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  WEAK_PASSWORD: "Password is too weak",
  INVALID_FILE_TYPE: "Invalid file type",
  FILE_TOO_LARGE: "File is too large",
  NETWORK_ERROR: "Network error occurred",
  SERVER_ERROR: "Server error occurred",
  UNAUTHORIZED: "You are not authorized to perform this action",
  FORBIDDEN: "Access forbidden",
  NOT_FOUND: "Resource not found",
  CONFLICT: "Resource already exists",
  RATE_LIMITED: "Too many requests, please try again later",
  VALIDATION_FAILED: "Validation failed",
  UNKNOWN_ERROR: "An unknown error occurred",
};

// Validation utility functions
export const ValidationUtils = {
  // Create a validation function that returns formatted errors
  createValidator: <T extends z.ZodSchema>(schema: T) => {
    return (data: unknown): ValidationResult<z.infer<T>> => {
      try {
        return {
          success: true as const,
          data: schema.parse(data),
          errors: null,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            success: false as const,
            data: null,
            errors: error.format(),
          };
        }
        return {
          success: false as const,
          data: null,
          errors: { _errors: [ErrorMessages.UNKNOWN_ERROR] },
        };
      }
    };
  },

  // Safe parse with custom error handling
  safeParse: <T extends z.ZodSchema>(
    schema: T,
    data: unknown,
    customErrors?: Record<string, string>
  ): ValidationResult<z.infer<T>> => {
    try {
      return {
        success: true as const,
        data: schema.parse(data),
        errors: null,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.format();

        // Apply custom error messages if provided
        if (customErrors) {
          const applyCustomErrors = (
            errors: Record<string, unknown>
          ): Record<string, unknown> => {
            if (typeof errors === "object" && errors !== null) {
              const result = { ...errors };
              Object.keys(result).forEach(key => {
                if (key === "_errors" && Array.isArray(result[key])) {
                  result[key] = (result[key] as string[]).map(
                    (err: string) => customErrors[err] || err
                  );
                } else if (typeof result[key] === "object") {
                  result[key] = applyCustomErrors(
                    result[key] as Record<string, unknown>
                  );
                }
              });
              return result;
            }
            return errors;
          };

          return {
            success: false as const,
            data: null,
            errors: applyCustomErrors(formattedErrors),
          };
        }

        return {
          success: false as const,
          data: null,
          errors: formattedErrors,
        };
      }
      return {
        success: false as const,
        data: null,
        errors: { _errors: [ErrorMessages.UNKNOWN_ERROR] },
      };
    }
  },

  // Format Zod errors for user-friendly display
  formatErrors: (error: z.ZodError): Record<string, string[]> => {
    const formatted: Record<string, string[]> = {};

    error.errors.forEach(err => {
      const path = err.path.join(".");
      if (!formatted[path]) {
        formatted[path] = [];
      }
      formatted[path].push(err.message);
    });

    return formatted;
  },

  // Apply custom error messages
  applyCustomErrors: (
    errors: Record<string, unknown>
  ): Record<string, unknown> => {
    const customErrors: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(errors)) {
      if (Array.isArray(value)) {
        customErrors[key] = value.map(msg =>
          typeof msg === "string" ? msg : String(msg)
        );
      } else {
        customErrors[key] = value;
      }
    }

    return customErrors;
  },

  // Extract all error messages as flat array
  extractErrors: (validationResult: ValidationResult<unknown>): string[] => {
    if (validationResult.success) return [];

    const extractFromObject = (obj: Record<string, unknown>): string[] => {
      const messages: string[] = [];

      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          messages.push(
            ...value.filter((msg): msg is string => typeof msg === "string")
          );
        } else if (typeof value === "string") {
          messages.push(value);
        } else if (value && typeof value === "object") {
          messages.push(...extractFromObject(value as Record<string, unknown>));
        }
      }

      return messages;
    };

    return extractFromObject(validationResult.errors);
  },

  // Extract field-specific errors
  extractFieldErrors: (
    validationResult: ValidationResult<unknown>
  ): Record<string, string[]> => {
    if (validationResult.success) return {};

    const fieldErrors: Record<string, string[]> = {};

    const extractFieldErrors = (
      obj: Record<string, unknown>,
      prefix = ""
    ): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;

        if (Array.isArray(value)) {
          fieldErrors[fieldName] = value.filter(
            (msg): msg is string => typeof msg === "string"
          );
        } else if (typeof value === "string") {
          fieldErrors[fieldName] = [value];
        } else if (value && typeof value === "object") {
          extractFieldErrors(value as Record<string, unknown>, fieldName);
        }
      }
    };

    extractFieldErrors(validationResult.errors);
    return fieldErrors;
  },

  // Combine multiple validation results
  combineResults: <T>(
    validationResult: ValidationResult<unknown>,
    transform?: (data: unknown) => T
  ): ValidationResult<T> => {
    if (!validationResult.success) {
      return validationResult as ValidationResult<T>;
    }

    const data = transform
      ? transform(validationResult.data)
      : (validationResult.data as T);
    return { success: true, data, errors: null };
  },

  // Merge multiple validation results
  mergeResults: (
    ...results: ValidationResult<unknown>[]
  ): ValidationResult<unknown[]> => {
    const data: unknown[] = [];
    const errors: Record<string, unknown> = {};
    let hasErrors = false;

    results.forEach((result, index) => {
      if (result.success) {
        data.push(result.data);
      } else {
        hasErrors = true;
        Object.assign(errors, {
          [`field_${index}`]: result.errors,
        });
      }
    });

    if (hasErrors) {
      return { success: false, data: null, errors };
    }

    return { success: true, data, errors: null };
  },

  // Type guard for validation results
  isValidationResult: (obj: unknown): obj is ValidationResult<unknown> => {
    return (
      typeof obj === "object" &&
      obj !== null &&
      typeof (obj as ValidationResult<unknown>).success === "boolean"
    );
  },
};

// Type guards for common validation
export const TypeGuards = {
  isValidationResult: (obj: unknown): obj is ValidationResult<unknown> => {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "success" in obj &&
      typeof (obj as ValidationResult<unknown>).success === "boolean"
    );
  },

  isSuccessResult: <T>(
    result: ValidationResult<T>
  ): result is ValidationResult<T> & { success: true } => {
    return result.success;
  },

  isErrorResult: <T>(
    result: ValidationResult<T>
  ): result is ValidationResult<T> & { success: false } => {
    return !result.success;
  },
};

// Named export instead of anonymous default
export const SchemaUtils = {
  CommonSchemas,
  ErrorMessages,
  ValidationUtils,
  TypeGuards,
};

// Default export
export default SchemaUtils;
