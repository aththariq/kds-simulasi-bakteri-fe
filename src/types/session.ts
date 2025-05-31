/**
 * Session Management Type Definitions
 *
 * This file contains TypeScript type definitions for the session management system.
 * It provides comprehensive types for tracking multiple simulations, managing session
 * state, and handling persistence across browser sessions.
 */

import type {
  Session,
  SessionMetadata,
  SessionConfig,
  SessionPerformance,
  SessionStatus,
  SessionPriority,
  SessionStorageType,
  SimulationReference,
  SessionListItem,
  SessionHistoryEntry,
  SessionExport,
  SessionRecovery,
} from "@/lib/schemas/session";

// Re-export core types for convenience
export type {
  Session,
  SessionMetadata,
  SessionConfig,
  SessionPerformance,
  SessionStatus,
  SessionPriority,
  SessionStorageType,
  SimulationReference,
  SessionListItem,
  SessionHistoryEntry,
  SessionExport,
  SessionRecovery,
};

/**
 * Session Management Operations
 * Defines the interface for managing sessions
 */
export interface SessionManager {
  // Session CRUD operations
  createSession(
    name: string,
    config?: Partial<SessionConfig>
  ): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<Session>;
  deleteSession(sessionId: string): Promise<boolean>;
  listSessions(filters?: SessionFilters): Promise<SessionListItem[]>;

  // Session state management
  activateSession(sessionId: string): Promise<void>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  completeSession(sessionId: string): Promise<void>;

  // Simulation management within sessions
  addSimulation(
    sessionId: string,
    simulation: Omit<SimulationReference, "id">
  ): Promise<SimulationReference>;
  updateSimulation(
    sessionId: string,
    simulationId: string,
    updates: Partial<SimulationReference>
  ): Promise<void>;
  removeSimulation(sessionId: string, simulationId: string): Promise<void>;

  // Session persistence
  saveSession(session: Session): Promise<void>;
  loadSession(sessionId: string): Promise<Session | null>;
  exportSession(
    sessionId: string,
    format?: "json" | "csv" | "xlsx"
  ): Promise<Blob>;
  importSession(data: SessionExport): Promise<Session>;

  // Session recovery
  recoverSession(sessionId: string): Promise<SessionRecovery>;
  createCheckpoint(sessionId: string): Promise<string>;
  restoreFromCheckpoint(sessionId: string, checkpointId: string): Promise<void>;
}

/**
 * Session Filters for querying and listing sessions
 */
export interface SessionFilters {
  status?: SessionStatus[];
  priority?: SessionPriority[];
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  searchTerm?: string;
  sortBy?: "name" | "created_at" | "updated_at" | "status" | "priority";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Session Event Types for tracking session lifecycle
 */
export type SessionEventType =
  | "session_created"
  | "session_activated"
  | "session_paused"
  | "session_resumed"
  | "session_completed"
  | "session_cancelled"
  | "simulation_added"
  | "simulation_updated"
  | "simulation_removed"
  | "simulation_started"
  | "simulation_completed"
  | "simulation_failed"
  | "checkpoint_created"
  | "session_exported"
  | "session_imported"
  | "session_recovered";

/**
 * Session Event for tracking session changes
 */
export interface SessionEvent {
  id: string;
  sessionId: string;
  type: SessionEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
  userId?: string;
}

/**
 * Session Storage Interface
 * Defines methods for persisting session data
 */
export interface SessionStorage {
  // Basic storage operations
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;

  // Session-specific operations
  getSession(sessionId: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(): Promise<SessionListItem[]>;

  // Storage management
  getStorageInfo(): Promise<StorageInfo>;
  cleanup(olderThan?: Date): Promise<number>;
  compress(): Promise<void>;
}

/**
 * Storage Information Interface
 */
export interface StorageInfo {
  type: SessionStorageType;
  totalSize: number;
  usedSize: number;
  availableSize: number;
  itemCount: number;
  isCompressionEnabled: boolean;
  isEncryptionEnabled: boolean;
  lastCleanup?: Date;
}

/**
 * Session Validation Results
 */
export interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Session Statistics for analytics and monitoring
 */
export interface SessionStatistics {
  total: number;
  byStatus: Record<SessionStatus, number>;
  byPriority: Record<SessionPriority, number>;
  totalSimulations: number;
  averageSimulationsPerSession: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  storageUsed: number;
  oldestSession?: Date;
  newestSession?: Date;
  mostActiveSession?: {
    sessionId: string;
    simulationCount: number;
  };
}

/**
 * Session Configuration Options
 */
export interface SessionConfigOptions {
  // Auto-save settings
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number; // milliseconds

  // Storage settings
  maxSimulations?: number;
  maxStorageSize?: number; // bytes
  storageType?: SessionStorageType;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;

  // Cleanup settings
  cleanupInterval?: number; // milliseconds
  maxSessionAge?: number; // milliseconds

  // Notification settings
  notifications?: {
    simulationCompleted?: boolean;
    simulationFailed?: boolean;
    storageWarning?: boolean;
    autoSave?: boolean;
  };
}

/**
 * Session Context for React components
 */
export interface SessionContext {
  // Current session state
  currentSession: Session | null;
  sessions: SessionListItem[];
  isLoading: boolean;
  error: string | null;

  // Session management actions
  createSession: (
    name: string,
    config?: Partial<SessionConfig>
  ) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  updateSession: (updates: Partial<Session>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;

  // Simulation management within current session
  addSimulation: (simulation: Omit<SimulationReference, "id">) => Promise<void>;
  updateSimulation: (
    simulationId: string,
    updates: Partial<SimulationReference>
  ) => Promise<void>;
  removeSimulation: (simulationId: string) => Promise<void>;

  // Session persistence
  saveCurrentSession: () => Promise<void>;
  exportSession: (
    sessionId: string,
    format?: "json" | "csv" | "xlsx"
  ) => Promise<void>;
  importSession: (file: File) => Promise<void>;

  // Session recovery
  recoverSession: (sessionId: string) => Promise<void>;
  createCheckpoint: () => Promise<void>;
}

/**
 * Session Hook Options for React hooks
 */
export interface UseSessionOptions {
  autoLoad?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  enableRecovery?: boolean;
  enableCheckpoints?: boolean;
  maxSessions?: number;
}

/**
 * Session Table Column Configuration
 */
export interface SessionTableColumn {
  key: keyof SessionListItem | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, session: SessionListItem) => React.ReactNode;
}

/**
 * Session Action Configuration
 */
export interface SessionAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (session: SessionListItem) => void;
  disabled?: (session: SessionListItem) => boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

/**
 * Error types specific to session management
 */
export class SessionError extends Error {
  constructor(message: string, public code: string, public sessionId?: string) {
    super(message);
    this.name = "SessionError";
  }
}

export class SessionStorageError extends SessionError {
  constructor(message: string, sessionId?: string) {
    super(message, "STORAGE_ERROR", sessionId);
    this.name = "SessionStorageError";
  }
}

export class SessionValidationError extends SessionError {
  constructor(message: string, sessionId?: string) {
    super(message, "VALIDATION_ERROR", sessionId);
    this.name = "SessionValidationError";
  }
}

export class SessionRecoveryError extends SessionError {
  constructor(message: string, sessionId?: string) {
    super(message, "RECOVERY_ERROR", sessionId);
    this.name = "SessionRecoveryError";
  }
}

/**
 * Session Management Constants
 */
export const SESSION_CONSTANTS = {
  // Storage keys
  STORAGE_KEYS: {
    SESSIONS_LIST: "sessions_list",
    CURRENT_SESSION: "current_session",
    SESSION_CONFIG: "session_config",
    SESSION_HISTORY: "session_history",
  },

  // Default values
  DEFAULTS: {
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    MAX_SIMULATIONS: 10,
    MAX_STORAGE_SIZE: 100 * 1024 * 1024, // 100 MB
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    MAX_SESSION_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // Validation rules
  VALIDATION: {
    MIN_SESSION_NAME_LENGTH: 1,
    MAX_SESSION_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_TAGS: 10,
    MAX_TAG_LENGTH: 50,
  },
} as const;
