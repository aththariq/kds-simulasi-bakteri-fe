import { z } from "zod";

// Protocol Constants
export const PROTOCOL_VERSION = "1.0";
export const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
export const MAX_PAYLOAD_SIZE = 512 * 1024; // 512KB

// Enums
export const MessageCategorySchema = z.enum([
  "connection",
  "authentication",
  "subscription",
  "simulation",
  "data",
  "error",
  "heartbeat",
  "system",
]);

export const MessageTypeSchema = z.enum([
  // Connection Lifecycle
  "connection_established",
  "connection_terminated",
  "connection_info",
  "connection_stats",

  // Authentication
  "auth_request",
  "auth_success",
  "auth_failed",
  "auth_refresh",
  "auth_logout",

  // Subscription Management
  "subscribe",
  "unsubscribe",
  "subscription_confirmed",
  "unsubscription_confirmed",
  "subscription_list",
  "subscription_error",

  // Simulation Control
  "simulation_start",
  "simulation_stop",
  "simulation_pause",
  "simulation_resume",
  "simulation_reset",
  "simulation_config",
  "simulation_status",

  // Data Updates
  "simulation_update",
  "performance_update",
  "status_update",
  "batch_update",
  "snapshot_update",
  "metrics_update",

  // Error Handling
  "error",
  "warning",
  "validation_error",
  "rate_limit_error",

  // Heartbeat
  "ping",
  "pong",

  // System Management
  "system_status",
  "system_shutdown",
  "system_maintenance",
]);

export const PrioritySchema = z.enum(["critical", "high", "normal", "low"]);

export const CompressionTypeSchema = z.enum(["none", "gzip", "deflate"]);

export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);

// Payload Schemas
export const AuthPayloadSchema = z.object({
  api_key: z
    .string()
    .min(10, "API key must be at least 10 characters")
    .max(128, "API key cannot exceed 128 characters"),
  client_info: z.record(z.any()).optional(),
  refresh_token: z.string().optional(),
});

export const SubscriptionPayloadSchema = z.object({
  simulation_id: z
    .string()
    .min(10, "Simulation ID must be at least 10 characters")
    .max(100, "Simulation ID cannot exceed 100 characters"),
  subscription_type: z
    .enum(["simulation", "performance", "all"])
    .default("simulation"),
  filters: z.record(z.any()).optional(),
});

export const SimulationControlPayloadSchema = z.object({
  simulation_id: z
    .string()
    .min(10, "Simulation ID must be at least 10 characters")
    .max(100, "Simulation ID cannot exceed 100 characters"),
  parameters: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
});

export const SimulationDataPayloadSchema = z.object({
  simulation_id: z.string(),
  generation: z.number().int().min(0, "Generation must be non-negative"),
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  population_data: z.record(z.any()),
  fitness_data: z.record(z.any()),
  mutation_data: z.record(z.any()).optional(),
  performance_metrics: z.record(z.any()).optional(),
});

export const PerformanceDataPayloadSchema = z.object({
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  cpu_usage: z
    .number()
    .min(0, "CPU usage cannot be negative")
    .max(100, "CPU usage cannot exceed 100%"),
  memory_usage: z.number().min(0, "Memory usage cannot be negative"),
  network_latency: z.number().min(0).optional(),
  active_connections: z
    .number()
    .int()
    .min(0, "Active connections cannot be negative"),
});

export const ErrorPayloadSchema = z.object({
  error_code: z.string().min(1, "Error code is required"),
  error_message: z.string().min(1, "Error message is required"),
  details: z.record(z.any()).optional(),
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  severity: SeveritySchema.default("medium"),
});

export const BatchUpdatePayloadSchema = z.object({
  updates: z
    .array(z.record(z.any()))
    .max(100, "Cannot exceed 100 updates per batch"),
  batch_id: z.string().min(1, "Batch ID is required"),
  total_batches: z.number().int().min(1, "Total batches must be at least 1"),
  batch_index: z.number().int().min(0, "Batch index cannot be negative"),
});

// Main WebSocket Message Schema (Base without refines for extending)
const WebSocketProtocolMessageBaseSchema = z.object({
  // Message Identification
  type: MessageTypeSchema,
  id: z
    .string()
    .min(1, "Message ID is required")
    .default(() => crypto.randomUUID()),
  timestamp: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid timestamp format",
    })
    .default(() => new Date().toISOString()),

  // Protocol Information
  protocol_version: z.string().default(PROTOCOL_VERSION),
  priority: PrioritySchema.default("normal"),

  // Connection Context
  client_id: z
    .string()
    .min(1, "Client ID is required")
    .max(50, "Client ID cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Client ID can only contain alphanumeric characters, hyphens, and underscores"
    ),
  session_id: z.string().optional(),

  // Message Content
  simulation_id: z.string().optional(),
  data: z.record(z.any()).optional(),

  // Error Information
  error: ErrorPayloadSchema.optional(),

  // Protocol Features
  compression: CompressionTypeSchema.default("none"),
  encrypted: z.boolean().default(false),

  // Message Metadata
  correlation_id: z.string().optional(),
  reply_to: z.string().optional(),
  expires_at: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid expiration timestamp format",
    })
    .optional(),
});

// Main WebSocket Message Schema with validation rules
export const WebSocketProtocolMessageSchema =
  WebSocketProtocolMessageBaseSchema.refine(
    data => {
      // Validate simulation_id when required
      const requiresSimulationId = [
        "simulation_start",
        "simulation_stop",
        "simulation_pause",
        "simulation_resume",
        "simulation_reset",
        "simulation_config",
        "simulation_status",
        "simulation_update",
        "subscribe",
        "unsubscribe",
      ];

      if (requiresSimulationId.includes(data.type) && !data.simulation_id) {
        return false;
      }
      return true;
    },
    {
      message: "Simulation ID is required for simulation-related messages",
      path: ["simulation_id"],
    }
  ).refine(
    data => {
      // Validate that error messages have error payload
      if (
        ["error", "warning", "validation_error", "rate_limit_error"].includes(
          data.type
        ) &&
        !data.error
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Error payload is required for error messages",
      path: ["error"],
    }
  );

// Type-specific Message Schemas (using base schema for extending)
export const AuthRequestSchema = WebSocketProtocolMessageBaseSchema.extend({
  type: z.literal("auth_request"),
  data: AuthPayloadSchema,
});

export const SubscriptionRequestSchema =
  WebSocketProtocolMessageBaseSchema.extend({
    type: z.enum(["subscribe", "unsubscribe"]),
    data: SubscriptionPayloadSchema,
    simulation_id: z.string(),
  });

export const SimulationControlSchema =
  WebSocketProtocolMessageBaseSchema.extend({
    type: z.enum([
      "simulation_start",
      "simulation_stop",
      "simulation_pause",
      "simulation_resume",
      "simulation_reset",
    ]),
    data: SimulationControlPayloadSchema,
    simulation_id: z.string(),
  });

export const SimulationUpdateSchema = WebSocketProtocolMessageBaseSchema.extend(
  {
    type: z.literal("simulation_update"),
    data: SimulationDataPayloadSchema,
    simulation_id: z.string(),
  }
);

export const PerformanceUpdateSchema =
  WebSocketProtocolMessageBaseSchema.extend({
    type: z.literal("performance_update"),
    data: PerformanceDataPayloadSchema,
  });

export const ErrorMessageSchema = WebSocketProtocolMessageBaseSchema.extend({
  type: z.enum(["error", "warning", "validation_error", "rate_limit_error"]),
  error: ErrorPayloadSchema,
});

export const HeartbeatSchema = WebSocketProtocolMessageBaseSchema.extend({
  type: z.enum(["ping", "pong"]),
});

// Type Exports
export type MessageCategory = z.infer<typeof MessageCategorySchema>;
export type MessageType = z.infer<typeof MessageTypeSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type CompressionType = z.infer<typeof CompressionTypeSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type AuthPayload = z.infer<typeof AuthPayloadSchema>;
export type SubscriptionPayload = z.infer<typeof SubscriptionPayloadSchema>;
export type SimulationControlPayload = z.infer<
  typeof SimulationControlPayloadSchema
>;
export type SimulationDataPayload = z.infer<typeof SimulationDataPayloadSchema>;
export type PerformanceDataPayload = z.infer<
  typeof PerformanceDataPayloadSchema
>;
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;
export type BatchUpdatePayload = z.infer<typeof BatchUpdatePayloadSchema>;
export type WebSocketProtocolMessage = z.infer<
  typeof WebSocketProtocolMessageSchema
>;
export type AuthRequest = z.infer<typeof AuthRequestSchema>;
export type SubscriptionRequest = z.infer<typeof SubscriptionRequestSchema>;
export type SimulationControl = z.infer<typeof SimulationControlSchema>;
export type SimulationUpdate = z.infer<typeof SimulationUpdateSchema>;
export type PerformanceUpdate = z.infer<typeof PerformanceUpdateSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type Heartbeat = z.infer<typeof HeartbeatSchema>;

// Validation Functions
export const validateWebSocketMessage = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: WebSocketProtocolMessageSchema.parse(data),
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

export const validateMessageType = <T extends z.ZodSchema>(
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

// Message Size Validation
export const validateMessageSize = (message: string): boolean => {
  return message.length <= MAX_MESSAGE_SIZE;
};

export const validatePayloadSize = (
  payload: Record<string, unknown>
): boolean => {
  const payloadSize = JSON.stringify(payload).length;
  return payloadSize <= MAX_PAYLOAD_SIZE;
};

// Helper Functions
export const getMessageCategory = (
  messageType: MessageType
): MessageCategory => {
  const categoryMapping: Record<MessageType, MessageCategory> = {
    // Connection
    connection_established: "connection",
    connection_terminated: "connection",
    connection_info: "connection",
    connection_stats: "connection",

    // Authentication
    auth_request: "authentication",
    auth_success: "authentication",
    auth_failed: "authentication",
    auth_refresh: "authentication",
    auth_logout: "authentication",

    // Subscription
    subscribe: "subscription",
    unsubscribe: "subscription",
    subscription_confirmed: "subscription",
    unsubscription_confirmed: "subscription",
    subscription_list: "subscription",
    subscription_error: "subscription",

    // Simulation
    simulation_start: "simulation",
    simulation_stop: "simulation",
    simulation_pause: "simulation",
    simulation_resume: "simulation",
    simulation_reset: "simulation",
    simulation_config: "simulation",
    simulation_status: "simulation",

    // Data
    simulation_update: "data",
    performance_update: "data",
    status_update: "data",
    batch_update: "data",
    snapshot_update: "data",
    metrics_update: "data",

    // Error
    error: "error",
    warning: "error",
    validation_error: "error",
    rate_limit_error: "error",

    // Heartbeat
    ping: "heartbeat",
    pong: "heartbeat",

    // System
    system_status: "system",
    system_shutdown: "system",
    system_maintenance: "system",
  };

  return categoryMapping[messageType] || "system";
};

export const isExpiredMessage = (expiresAt?: string): boolean => {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
};
