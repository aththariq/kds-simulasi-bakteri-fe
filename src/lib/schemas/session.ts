import { z } from "zod";
import { CommonSchemas } from "./index";
import { SimulationParametersApiSchema } from "./api";
import { simulationParametersSchema } from "../validation";

// Session Status Enum
export const SessionStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "error",
  "cancelled",
  "archived",
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// Session Priority Enum
export const SessionPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export type SessionPriority = z.infer<typeof SessionPrioritySchema>;

// Session Storage Type Enum
export const SessionStorageTypeSchema = z.enum([
  "localStorage",
  "indexedDB",
  "server",
  "hybrid",
]);

export type SessionStorageType = z.infer<typeof SessionStorageTypeSchema>;

// Basic Session Metadata Schema
export const SessionMetadataSchema = z.object({
  id: CommonSchemas.uuid,
  name: z
    .string()
    .min(1, "Session name is required")
    .max(100, "Session name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  status: SessionStatusSchema,
  priority: SessionPrioritySchema.default("medium"),
  tags: z
    .array(z.string().max(50, "Tag cannot exceed 50 characters"))
    .max(10, "Cannot have more than 10 tags")
    .default([]),
  created_at: CommonSchemas.timestamp,
  updated_at: CommonSchemas.timestamp,
  started_at: CommonSchemas.timestamp.optional(),
  completed_at: CommonSchemas.timestamp.optional(),
  version: z.string().default("1.0.0"),
  user_id: z.string().optional(),
  browser_info: z
    .object({
      user_agent: z.string().optional(),
      platform: z.string().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

// Individual Simulation Reference Schema
export const SimulationReferenceSchema = z.object({
  id: CommonSchemas.uuid,
  simulation_id: z.string(),
  name: z
    .string()
    .min(1, "Simulation name is required")
    .max(100, "Simulation name cannot exceed 100 characters"),
  description: z
    .string()
    .max(300, "Description cannot exceed 300 characters")
    .optional(),
  status: z.enum([
    "pending",
    "initializing",
    "running",
    "paused",
    "completed",
    "failed",
    "cancelled",
  ]),
  progress: z.number().min(0).max(100).default(0),
  parameters: SimulationParametersApiSchema,
  created_at: CommonSchemas.timestamp,
  started_at: CommonSchemas.timestamp.optional(),
  completed_at: CommonSchemas.timestamp.optional(),
  execution_time: z.number().min(0).optional(), // in milliseconds
  current_generation: z.number().int().min(0).default(0),
  total_generations: z.number().int().min(1),
  error_message: z.string().optional(),
  result_summary: z
    .object({
      final_population: z.number().int().min(0).optional(),
      final_resistant_count: z.number().int().min(0).optional(),
      resistance_frequency: z.number().min(0).max(1).optional(),
      survival_rate: z.number().min(0).max(1).optional(),
      mutation_count: z.number().int().min(0).optional(),
      hgt_events: z.number().int().min(0).optional(),
    })
    .optional(),
  storage_location: z
    .object({
      type: SessionStorageTypeSchema,
      path: z.string().optional(),
      size_bytes: z.number().min(0).optional(),
    })
    .optional(),
});

export type SimulationReference = z.infer<typeof SimulationReferenceSchema>;

// Session Configuration Schema
export const SessionConfigSchema = z.object({
  auto_save: z.boolean().default(true),
  auto_save_interval: z.number().int().min(1000).max(300000).default(30000), // 30 seconds
  max_simulations: z.number().int().min(1).max(50).default(10),
  max_storage_size: z
    .number()
    .int()
    .min(1024)
    .max(1073741824)
    .default(104857600), // 100MB
  compression_enabled: z.boolean().default(true),
  encryption_enabled: z.boolean().default(false),
  backup_enabled: z.boolean().default(true),
  backup_interval: z.number().int().min(60000).max(86400000).default(600000), // 10 minutes
  storage_type: SessionStorageTypeSchema.default("indexedDB"),
  cleanup_completed_after: z.number().int().min(86400000).default(604800000), // 7 days
  export_format: z.enum(["json", "csv", "xlsx"]).default("json"),
  notifications: z
    .object({
      simulation_completed: z.boolean().default(true),
      simulation_failed: z.boolean().default(true),
      storage_full: z.boolean().default(true),
      auto_save: z.boolean().default(false),
    })
    .default({}),
});

export type SessionConfig = z.infer<typeof SessionConfigSchema>;

// Session Performance Metrics Schema
export const SessionPerformanceSchema = z.object({
  total_simulations: z.number().int().min(0).default(0),
  completed_simulations: z.number().int().min(0).default(0),
  failed_simulations: z.number().int().min(0).default(0),
  cancelled_simulations: z.number().int().min(0).default(0),
  total_execution_time: z.number().min(0).default(0), // in milliseconds
  average_execution_time: z.number().min(0).optional(),
  total_generations_processed: z.number().int().min(0).default(0),
  storage_used: z.number().min(0).default(0), // in bytes
  last_activity: CommonSchemas.timestamp.optional(),
  session_duration: z.number().min(0).optional(), // in milliseconds
  memory_peak: z.number().min(0).optional(), // in bytes
  cpu_usage: z.number().min(0).max(100).optional(), // percentage
});

export type SessionPerformance = z.infer<typeof SessionPerformanceSchema>;

// Main Session Schema
export const SessionSchema = z.object({
  metadata: SessionMetadataSchema,
  config: SessionConfigSchema.default({}),
  simulations: z.array(SimulationReferenceSchema).default([]),
  performance: SessionPerformanceSchema.default({}),
  state: z
    .object({
      active_simulation_id: z.string().optional(),
      last_viewed_simulation: z.string().optional(),
      current_tab: z.string().default("parameters"),
      ui_state: z.record(z.any()).default({}),
      filters: z
        .object({
          status: z.array(z.string()).default([]),
          tags: z.array(z.string()).default([]),
          date_range: z
            .object({
              start: CommonSchemas.timestamp.optional(),
              end: CommonSchemas.timestamp.optional(),
            })
            .optional(),
        })
        .default({}),
    })
    .default({}),
  checkpoints: z
    .array(
      z.object({
        id: CommonSchemas.uuid,
        timestamp: CommonSchemas.timestamp,
        simulation_states: z.array(
          z.object({
            simulation_id: z.string(),
            generation: z.number().int().min(0),
            population_size: z.number().int().min(0),
            resistant_count: z.number().int().min(0),
          })
        ),
        session_state: z.record(z.any()),
      })
    )
    .default([]),
});

export type Session = z.infer<typeof SessionSchema>;

// Session List Item Schema (for displaying in tables)
export const SessionListItemSchema = z.object({
  id: CommonSchemas.uuid,
  name: z.string(),
  status: SessionStatusSchema,
  priority: SessionPrioritySchema,
  created_at: CommonSchemas.timestamp,
  updated_at: CommonSchemas.timestamp,
  simulation_count: z.number().int().min(0),
  completed_count: z.number().int().min(0),
  total_execution_time: z.number().min(0),
  storage_size: z.number().min(0),
  tags: z.array(z.string()),
});

export type SessionListItem = z.infer<typeof SessionListItemSchema>;

// Session History Entry Schema
export const SessionHistoryEntrySchema = z.object({
  id: CommonSchemas.uuid,
  session_id: CommonSchemas.uuid,
  action: z.enum([
    "created",
    "started",
    "paused",
    "resumed",
    "completed",
    "cancelled",
    "simulation_added",
    "simulation_removed",
    "simulation_completed",
    "simulation_failed",
    "exported",
    "imported",
    "backed_up",
    "restored",
  ]),
  timestamp: CommonSchemas.timestamp,
  details: z.record(z.any()).optional(),
  user_id: z.string().optional(),
});

export type SessionHistoryEntry = z.infer<typeof SessionHistoryEntrySchema>;

// Session Export Schema
export const SessionExportSchema = z.object({
  version: z.string().default("1.0.0"),
  export_timestamp: CommonSchemas.timestamp,
  session: SessionSchema,
  history: z.array(SessionHistoryEntrySchema).default([]),
  metadata: z
    .object({
      exported_by: z.string().optional(),
      export_reason: z.string().optional(),
      file_format: z.string().default("json"),
      compression: z.boolean().default(false),
      encryption: z.boolean().default(false),
    })
    .default({}),
  checksum: z.string().optional(),
});

export type SessionExport = z.infer<typeof SessionExportSchema>;

// Session Recovery Schema
export const SessionRecoverySchema = z.object({
  session_id: CommonSchemas.uuid,
  recovery_point: CommonSchemas.timestamp,
  recovery_data: z.object({
    session_state: z.record(z.any()),
    simulation_states: z.array(
      z.object({
        simulation_id: z.string(),
        state: z.record(z.any()),
      })
    ),
    ui_state: z.record(z.any()),
  }),
  is_complete: z.boolean().default(false),
  corruption_detected: z.boolean().default(false),
  recovery_actions: z.array(z.string()).default([]),
});

export type SessionRecovery = z.infer<typeof SessionRecoverySchema>;

// Validation utilities for session data
export const SessionValidationUtils = {
  // Validate session name uniqueness
  validateUniqueName: (
    name: string,
    existingSessions: SessionListItem[]
  ): boolean => {
    return !existingSessions.some(
      session => session.name.toLowerCase() === name.toLowerCase()
    );
  },

  // Validate session storage limits
  validateStorageLimit: (session: Session): boolean => {
    const totalSize = session.simulations.reduce(
      (total, sim) => total + (sim.storage_location?.size_bytes || 0),
      0
    );
    return totalSize <= session.config.max_storage_size;
  },

  // Validate simulation count limit
  validateSimulationLimit: (session: Session): boolean => {
    return session.simulations.length <= session.config.max_simulations;
  },

  // Generate session ID
  generateSessionId: (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Generate simulation reference ID
  generateSimulationRefId: (): string => {
    return `simref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create default session metadata
  createDefaultMetadata: (name: string): SessionMetadata => {
    const now = new Date().toISOString();
    return {
      id: SessionValidationUtils.generateSessionId(),
      name,
      status: "active",
      priority: "medium",
      tags: [],
      created_at: now,
      updated_at: now,
      version: "1.0.0",
    };
  },

  // Create default session config
  createDefaultConfig: (): SessionConfig => {
    return {
      auto_save: true,
      auto_save_interval: 30000,
      max_simulations: 10,
      max_storage_size: 104857600,
      compression_enabled: true,
      encryption_enabled: false,
      backup_enabled: true,
      backup_interval: 600000,
      storage_type: "indexedDB",
      cleanup_completed_after: 604800000,
      export_format: "json",
      notifications: {
        simulation_completed: true,
        simulation_failed: true,
        storage_full: true,
        auto_save: false,
      },
    };
  },
};

// Default exports
export const DEFAULT_SESSION_CONFIG =
  SessionValidationUtils.createDefaultConfig();

export const SessionSchemas = {
  SessionStatusSchema,
  SessionPrioritySchema,
  SessionStorageTypeSchema,
  SessionMetadataSchema,
  SimulationReferenceSchema,
  SessionConfigSchema,
  SessionPerformanceSchema,
  SessionSchema,
  SessionListItemSchema,
  SessionHistoryEntrySchema,
  SessionExportSchema,
  SessionRecoverySchema,
};

export default SessionSchemas;
