import { z } from "zod";
import { simulationParametersSchema } from "../validation";

// HTTP Status Code Schema
export const HttpStatusSchema = z.union([
  z.literal(200),
  z.literal(201),
  z.literal(204), // Success
  z.literal(400),
  z.literal(401),
  z.literal(403),
  z.literal(404),
  z.literal(409), // Client errors
  z.literal(500),
  z.literal(502),
  z.literal(503),
  z.literal(504), // Server errors
]);

// Generic API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid timestamp format",
    })
    .default(() => new Date().toISOString()),
  request_id: z.string().optional(),
});

// Error Response Schema
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1, "Error code is required"),
    message: z.string().min(1, "Error message is required"),
    details: z.record(z.any()).optional(),
    field_errors: z.record(z.array(z.string())).optional(),
    stack_trace: z.string().optional(),
  }),
  success: z.literal(false),
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
});

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
  total: z.number().int().min(0, "Total cannot be negative"),
  total_pages: z.number().int().min(0, "Total pages cannot be negative"),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

// Simulation-related API Schemas
export const SimulationParametersApiSchema = simulationParametersSchema.extend({
  simulation_name: z
    .string()
    .min(1, "Simulation name is required")
    .max(100, "Simulation name cannot exceed 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  tags: z
    .array(z.string().max(50, "Tag cannot exceed 50 characters"))
    .max(10, "Cannot have more than 10 tags")
    .optional(),
});

export const SimulationCreateRequestSchema = z.object({
  parameters: SimulationParametersApiSchema,
  start_immediately: z.boolean().default(false),
  save_results: z.boolean().default(true),
});

export const SimulationResultsSchema = z.object({
  population_history: z.array(
    z.number().int().min(0, "Population cannot be negative")
  ),
  resistance_history: z.array(
    z
      .number()
      .min(0, "Resistance cannot be negative")
      .max(1, "Resistance cannot exceed 1")
  ),
  fitness_history: z.array(z.number().min(0, "Fitness cannot be negative")),
  generation_times: z
    .array(z.number().min(0, "Generation time cannot be negative"))
    .optional(),
  mutation_events: z.array(z.record(z.any())).optional(),
  final_statistics: z
    .object({
      total_generations: z.number().int().min(0),
      final_population: z.number().int().min(0),
      final_resistance_rate: z.number().min(0).max(1),
      average_fitness: z.number().min(0),
      total_mutations: z.number().int().min(0),
      extinction_events: z.number().int().min(0),
    })
    .optional(),
});

export const SimulationStatusSchema = z.enum([
  "initialized",
  "running",
  "paused",
  "completed",
  "error",
  "cancelled",
  "extinct",
]);

export const SimulationMetricsSchema = z.object({
  total_mutations: z.number().int().min(0),
  extinction_events: z.number().int().min(0),
  resistance_peaks: z.array(z.record(z.any())).default([]),
  diversity_index: z
    .array(z.number().min(0, "Diversity index cannot be negative"))
    .default([]),
  convergence_time: z.number().min(0).optional(),
  selection_coefficient: z.number().optional(),
});

export const SimulationResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    simulation_id: z.string().min(1, "Simulation ID is required"),
    status: SimulationStatusSchema,
    created_at: z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid timestamp format",
    }),
    updated_at: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid timestamp format",
      })
      .optional(),
    parameters: SimulationParametersApiSchema,
    current_generation: z.number().int().min(0).optional(),
    progress_percentage: z.number().min(0).max(100).optional(),
  }),
  success: z.literal(true),
});

export const SimulationResultsResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    simulation_id: z.string(),
    status: SimulationStatusSchema,
    results: SimulationResultsSchema,
    metrics: SimulationMetricsSchema.optional(),
    parameters: SimulationParametersApiSchema,
    execution_time: z.number().min(0).optional(),
    memory_usage: z.number().min(0).optional(),
  }),
  success: z.literal(true),
});

export const SimulationListResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    simulations: z.array(
      z.object({
        simulation_id: z.string(),
        status: SimulationStatusSchema,
        created_at: z.string(),
        updated_at: z.string().optional(),
        progress_percentage: z.number().min(0).max(100).optional(),
        parameters: SimulationParametersApiSchema.partial(),
        current_generation: z.number().int().min(0).optional(),
      })
    ),
    pagination: PaginationSchema,
  }),
  success: z.literal(true),
});

// Performance API Schemas
export const PerformanceMetricsSchema = z.object({
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  cpu_usage: z.number().min(0).max(100),
  memory_usage: z.number().min(0),
  memory_total: z.number().min(0),
  active_simulations: z.number().int().min(0),
  active_connections: z.number().int().min(0),
  request_rate: z.number().min(0),
  response_time_avg: z.number().min(0),
  error_rate: z.number().min(0).max(100),
});

export const PerformanceResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    current: PerformanceMetricsSchema,
    history: z.array(PerformanceMetricsSchema).optional(),
    alerts: z
      .array(
        z.object({
          type: z.enum(["warning", "critical"]),
          message: z.string(),
          timestamp: z.string(),
          value: z.number(),
        })
      )
      .optional(),
  }),
  success: z.literal(true),
});

// Configuration API Schemas
export const AppConfigSchema = z.object({
  max_simulations: z.number().int().min(1).max(100),
  max_population_size: z.number().int().min(1000).max(1000000),
  max_generations: z.number().int().min(10).max(10000),
  websocket_timeout: z.number().int().min(30).max(3600),
  enable_performance_monitoring: z.boolean(),
  enable_real_time_updates: z.boolean(),
  compression_enabled: z.boolean(),
  log_level: z.enum(["debug", "info", "warning", "error"]),
  rate_limit: z.object({
    requests_per_minute: z.number().int().min(1).max(1000),
    burst_limit: z.number().int().min(1).max(100),
  }),
});

export const ConfigResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    config: AppConfigSchema,
    version: z.string(),
    environment: z.enum(["development", "staging", "production"]),
  }),
  success: z.literal(true),
});

// File Upload Schemas
export const FileUploadSchema = z.object({
  file_type: z.enum(["csv", "json", "xlsx"]),
  file_size: z
    .number()
    .min(1, "File cannot be empty")
    .max(10 * 1024 * 1024, "File cannot exceed 10MB"),
  file_name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name cannot exceed 255 characters"),
  mime_type: z
    .string()
    .regex(
      /^(text\/csv|application\/json|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/,
      "Invalid file type. Only CSV, JSON, and XLSX files are allowed"
    ),
});

export const FileUploadResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    file_id: z.string(),
    file_name: z.string(),
    file_size: z.number(),
    upload_url: z.string().url("Invalid upload URL"),
    expires_at: z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid expiration timestamp",
    }),
  }),
  success: z.literal(true),
});

// Health Check Schema
export const HealthCheckSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  services: z.object({
    database: z.enum(["up", "down", "degraded"]),
    websocket: z.enum(["up", "down", "degraded"]),
    simulation_engine: z.enum(["up", "down", "degraded"]),
    cache: z.enum(["up", "down", "degraded"]).optional(),
  }),
  version: z.string(),
  uptime: z.number().min(0),
  memory_usage: z.number().min(0).max(100),
  cpu_usage: z.number().min(0).max(100),
});

// Request Validation Schemas
export const QueryParametersSchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  sort: z.enum(["created_at", "updated_at", "status", "progress"]).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().optional(),
  search: z
    .string()
    .max(100, "Search query cannot exceed 100 characters")
    .optional(),
});

export const PathParametersSchema = z.object({
  id: z
    .string()
    .min(1, "ID parameter is required")
    .max(100, "ID cannot exceed 100 characters"),
  simulation_id: z
    .string()
    .min(1, "Simulation ID is required")
    .max(100, "Simulation ID cannot exceed 100 characters")
    .optional(),
});

// Type Exports
export type HttpStatus = z.infer<typeof HttpStatusSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SimulationParametersApi = z.infer<
  typeof SimulationParametersApiSchema
>;
export type SimulationCreateRequest = z.infer<
  typeof SimulationCreateRequestSchema
>;
export type SimulationResults = z.infer<typeof SimulationResultsSchema>;
export type SimulationStatus = z.infer<typeof SimulationStatusSchema>;
export type SimulationMetrics = z.infer<typeof SimulationMetricsSchema>;
export type SimulationResponse = z.infer<typeof SimulationResponseSchema>;
export type SimulationResultsResponse = z.infer<
  typeof SimulationResultsResponseSchema
>;
export type SimulationListResponse = z.infer<
  typeof SimulationListResponseSchema
>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type PerformanceResponse = z.infer<typeof PerformanceResponseSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type QueryParameters = z.infer<typeof QueryParametersSchema>;
export type PathParameters = z.infer<typeof PathParametersSchema>;

// Validation Helper Functions
export const validateApiResponse = <T extends z.ZodSchema>(
  data: unknown,
  schema: T
) => {
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
      errors: { _errors: ["Unknown validation error"] },
    };
  }
};

export const validateQueryParams = (
  params: Record<string, string | string[] | undefined>
) => {
  // Convert URLSearchParams or similar to object with string values
  const cleanParams: Record<string, string | undefined> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      cleanParams[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      cleanParams[key] = value[0];
    }
  });

  return validateApiResponse(cleanParams, QueryParametersSchema);
};

export const validatePathParams = (
  params: Record<string, string | undefined>
) => {
  return validateApiResponse(params, PathParametersSchema);
};

// Error Type Guards
export const isApiError = (data: unknown): data is ApiError => {
  try {
    ApiErrorSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isValidStatus = (status: unknown): status is SimulationStatus => {
  try {
    SimulationStatusSchema.parse(status);
    return true;
  } catch {
    return false;
  }
};

// HTTP Response Status Helpers
export const isSuccessStatus = (status: number): boolean => {
  return status >= 200 && status < 300;
};

export const isClientError = (status: number): boolean => {
  return status >= 400 && status < 500;
};

export const isServerError = (status: number): boolean => {
  return status >= 500 && status < 600;
};

// Create error response
export const createErrorResponse = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
  fieldErrors?: Record<string, string[]>
): ApiError => {
  return {
    error: {
      code,
      message,
      details,
      field_errors: fieldErrors,
    },
    success: false,
    timestamp: new Date().toISOString(),
  };
};
