import {
  Session,
  SessionMetadata,
  SessionConfig,
  SessionStatus,
  SessionPriority,
  SimulationReference,
  SessionSchema,
  SessionMetadataSchema,
} from "./schemas/session";
import {
  SessionPersistenceService,
  SessionOperationResult,
} from "./session-persistence";
import { ValidationUtils } from "./schemas";
import { toast } from "sonner";
import { useState, useCallback, useRef, useEffect } from "react";

// Session manager for coordinating session lifecycle
export class SessionManager {
  private persistenceService: SessionPersistenceService;
  private currentSession: Session | null = null;
  private listeners: Map<string, (session: Session | null) => void> = new Map();

  constructor(persistenceService?: SessionPersistenceService) {
    this.persistenceService =
      persistenceService || new SessionPersistenceService();
  }

  // Create a new session
  async createSession(options: {
    name: string;
    description?: string;
    priority?: SessionPriority;
    config?: Partial<SessionConfig>;
    tags?: string[];
  }): Promise<SessionOperationResult<Session>> {
    try {
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      const defaultConfig: SessionConfig = {
        auto_save: true,
        auto_save_interval: 30000,
        max_simulations: 10,
        max_storage_size: 104857600, // 100MB
        compression_enabled: true,
        encryption_enabled: false,
        backup_enabled: true,
        backup_interval: 600000, // 10 minutes
        storage_type: "indexedDB",
        cleanup_completed_after: 604800000, // 7 days
        export_format: "json",
        notifications: {
          simulation_completed: true,
          simulation_failed: true,
          storage_full: true,
          auto_save: false,
        },
      };

      const newSession: Session = {
        metadata: {
          id: sessionId,
          name: options.name,
          description: options.description,
          status: "active",
          priority: options.priority || "medium",
          tags: options.tags || [],
          created_at: now,
          updated_at: now,
          version: "1.0.0",
          browser_info: {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
        config: { ...defaultConfig, ...options.config },
        simulations: [],
        performance: {
          total_simulations: 0,
          completed_simulations: 0,
          failed_simulations: 0,
          cancelled_simulations: 0,
          total_execution_time: 0,
          total_generations_processed: 0,
          storage_used: 0,
        },
        state: {
          current_tab: "parameters",
          ui_state: {},
          filters: {
            status: [],
            tags: [],
          },
        },
        checkpoints: [],
      };

      // Validate the session
      const validationResult = ValidationUtils.safeParse(
        SessionSchema,
        newSession
      );
      if (!validationResult.success) {
        return {
          success: false,
          error: "Session validation failed during creation",
        };
      }

      // Save the session
      const saveResult = await this.persistenceService.saveSession(newSession);
      if (saveResult.success) {
        this.currentSession = newSession;
        this.notifyListeners(newSession);

        // Start auto-save if enabled
        if (newSession.config.auto_save) {
          this.persistenceService.startAutoSave(() => this.currentSession);
        }
      }

      return saveResult;
    } catch (error) {
      console.error("Failed to create session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Load an existing session
  async loadSession(
    sessionId: string
  ): Promise<SessionOperationResult<Session>> {
    try {
      const loadResult = await this.persistenceService.loadSession(sessionId);

      if (loadResult.success && loadResult.data) {
        // Update the session to mark it as active
        const updatedSession: Session = {
          ...loadResult.data,
          metadata: {
            ...loadResult.data.metadata,
            status: "active",
            updated_at: new Date().toISOString(),
          },
        };

        // Save the updated session
        await this.persistenceService.saveSession(updatedSession);

        this.currentSession = updatedSession;
        this.notifyListeners(updatedSession);

        // Start auto-save if enabled
        if (updatedSession.config.auto_save) {
          this.persistenceService.startAutoSave(() => this.currentSession);
        }

        return {
          success: true,
          data: updatedSession,
        };
      }

      return loadResult;
    } catch (error) {
      console.error("Failed to load session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Update current session
  async updateSession(
    updates: Partial<Session>
  ): Promise<SessionOperationResult<Session>> {
    if (!this.currentSession) {
      return {
        success: false,
        error: "No active session to update",
      };
    }

    try {
      const updatedSession: Session = {
        ...this.currentSession,
        ...updates,
        metadata: {
          ...this.currentSession.metadata,
          ...updates.metadata,
          updated_at: new Date().toISOString(),
        },
      };

      const saveResult = await this.persistenceService.saveSession(
        updatedSession
      );

      if (saveResult.success) {
        this.currentSession = updatedSession;
        this.notifyListeners(updatedSession);
      }

      return saveResult;
    } catch (error) {
      console.error("Failed to update session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Add simulation to current session
  async addSimulation(
    simulation: Omit<SimulationReference, "id">
  ): Promise<SessionOperationResult> {
    if (!this.currentSession) {
      return {
        success: false,
        error: "No active session to add simulation to",
      };
    }

    try {
      const simulationId = crypto.randomUUID();
      const newSimulation: SimulationReference = {
        ...simulation,
        id: simulationId,
      };

      const updatedSimulations = [
        ...this.currentSession.simulations,
        newSimulation,
      ];

      return await this.updateSession({
        simulations: updatedSimulations,
        performance: {
          ...this.currentSession.performance,
          total_simulations: updatedSimulations.length,
        },
      });
    } catch (error) {
      console.error("Failed to add simulation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Update simulation in current session
  async updateSimulation(
    simulationId: string,
    updates: Partial<SimulationReference>
  ): Promise<SessionOperationResult> {
    if (!this.currentSession) {
      return {
        success: false,
        error: "No active session",
      };
    }

    try {
      const updatedSimulations = this.currentSession.simulations.map(sim =>
        sim.id === simulationId ? { ...sim, ...updates } : sim
      );

      // Update performance metrics
      const completedCount = updatedSimulations.filter(
        sim => sim.status === "completed"
      ).length;
      const failedCount = updatedSimulations.filter(
        sim => sim.status === "failed"
      ).length;
      const cancelledCount = updatedSimulations.filter(
        sim => sim.status === "cancelled"
      ).length;

      const totalExecutionTime = updatedSimulations.reduce(
        (total, sim) => total + (sim.execution_time || 0),
        0
      );

      const totalGenerations = updatedSimulations.reduce(
        (total, sim) => total + (sim.current_generation || 0),
        0
      );

      return await this.updateSession({
        simulations: updatedSimulations,
        performance: {
          ...this.currentSession.performance,
          completed_simulations: completedCount,
          failed_simulations: failedCount,
          cancelled_simulations: cancelledCount,
          total_execution_time: totalExecutionTime,
          total_generations_processed: totalGenerations,
          average_execution_time:
            completedCount > 0
              ? totalExecutionTime / completedCount
              : undefined,
          last_activity: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to update simulation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Close current session
  async closeSession(): Promise<SessionOperationResult> {
    if (!this.currentSession) {
      return {
        success: false,
        error: "No active session to close",
      };
    }

    try {
      // Calculate session duration
      const sessionDuration =
        Date.now() -
        new Date(this.currentSession.metadata.created_at).getTime();

      const result = await this.updateSession({
        metadata: {
          ...this.currentSession.metadata,
          status: "completed",
          completed_at: new Date().toISOString(),
        },
        performance: {
          ...this.currentSession.performance,
          session_duration: sessionDuration,
        },
      });

      if (result.success) {
        // Stop auto-save
        this.persistenceService.stopAutoSave();

        // Clear current session
        const finalSession = this.currentSession;
        this.currentSession = null;
        this.notifyListeners(null);

        return {
          success: true,
          data: finalSession,
        };
      }

      return result;
    } catch (error) {
      console.error("Failed to close session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Pause current session
  async pauseSession(): Promise<SessionOperationResult> {
    if (!this.currentSession) {
      return {
        success: false,
        error: "No active session to pause",
      };
    }

    return await this.updateSession({
      metadata: {
        ...this.currentSession.metadata,
        status: "paused",
      },
    });
  }

  // Resume paused session
  async resumeSession(): Promise<SessionOperationResult> {
    if (!this.currentSession) {
      return {
        success: false,
        error: "No session to resume",
      };
    }

    if (this.currentSession.metadata.status !== "paused") {
      return {
        success: false,
        error: "Session is not paused",
      };
    }

    return await this.updateSession({
      metadata: {
        ...this.currentSession.metadata,
        status: "active",
      },
    });
  }

  // Archive session
  async archiveSession(sessionId?: string): Promise<SessionOperationResult> {
    const targetSessionId = sessionId || this.currentSession?.metadata.id;

    if (!targetSessionId) {
      return {
        success: false,
        error: "No session to archive",
      };
    }

    try {
      let sessionToArchive: Session;

      if (sessionId && sessionId !== this.currentSession?.metadata.id) {
        // Load the session to archive
        const loadResult = await this.persistenceService.loadSession(sessionId);
        if (!loadResult.success || !loadResult.data) {
          return {
            success: false,
            error: loadResult.error || "Failed to load session for archiving",
          };
        }
        sessionToArchive = loadResult.data;
      } else {
        sessionToArchive = this.currentSession!;
      }

      const updatedSession: Session = {
        ...sessionToArchive,
        metadata: {
          ...sessionToArchive.metadata,
          status: "archived",
          updated_at: new Date().toISOString(),
        },
      };

      const saveResult = await this.persistenceService.saveSession(
        updatedSession
      );

      if (
        saveResult.success &&
        this.currentSession?.metadata.id === targetSessionId
      ) {
        this.currentSession = updatedSession;
        this.notifyListeners(updatedSession);
      }

      return saveResult;
    } catch (error) {
      console.error("Failed to archive session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get current session
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  // Get all sessions
  async getAllSessions(): Promise<SessionOperationResult<SessionMetadata[]>> {
    return await this.persistenceService.getAllSessions();
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<SessionOperationResult> {
    return await this.persistenceService.deleteSession(sessionId);
  }

  // Create recovery point
  async createRecoveryPoint(): Promise<SessionOperationResult> {
    if (!this.currentSession) {
      return {
        success: false,
        error: "No active session for recovery point",
      };
    }

    return await this.persistenceService.createRecoveryPoint(
      this.currentSession.metadata.id
    );
  }

  // Session listeners
  addListener(id: string, listener: (session: Session | null) => void): void {
    this.listeners.set(id, listener);
  }

  removeListener(id: string): void {
    this.listeners.delete(id);
  }

  private notifyListeners(session: Session | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(session);
      } catch (error) {
        console.warn("Session listener error:", error);
      }
    });
  }

  // Clean up
  dispose(): void {
    this.persistenceService.stopAutoSave();
    this.listeners.clear();
    this.currentSession = null;
  }
}

// React hook for session management
export interface UseSessionManagerOptions {
  autoLoad?: boolean;
  persistenceOptions?: any;
}

export interface UseSessionManagerReturn {
  // Current session
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;

  // Session operations
  createSession: (options: {
    name: string;
    description?: string;
    priority?: SessionPriority;
    config?: Partial<SessionConfig>;
    tags?: string[];
  }) => Promise<SessionOperationResult<Session>>;
  loadSession: (sessionId: string) => Promise<SessionOperationResult<Session>>;
  updateSession: (
    updates: Partial<Session>
  ) => Promise<SessionOperationResult<Session>>;
  closeSession: () => Promise<SessionOperationResult>;
  pauseSession: () => Promise<SessionOperationResult>;
  resumeSession: () => Promise<SessionOperationResult>;
  archiveSession: (sessionId?: string) => Promise<SessionOperationResult>;

  // Simulation management
  addSimulation: (
    simulation: Omit<SimulationReference, "id">
  ) => Promise<SessionOperationResult>;
  updateSimulation: (
    simulationId: string,
    updates: Partial<SimulationReference>
  ) => Promise<SessionOperationResult>;

  // Session list management
  getAllSessions: () => Promise<SessionOperationResult<SessionMetadata[]>>;
  deleteSession: (sessionId: string) => Promise<SessionOperationResult>;

  // Recovery
  createRecoveryPoint: () => Promise<SessionOperationResult>;

  // Utilities
  clearError: () => void;
}

export const useSessionManager = (
  options: UseSessionManagerOptions = {}
): UseSessionManagerReturn => {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const managerRef = useRef<SessionManager>(null as any);

  // Initialize session manager
  useEffect(() => {
    managerRef.current = new SessionManager();

    // Add listener for session changes
    const listenerKey = "main_listener";
    managerRef.current.addListener(listenerKey, session => {
      setCurrentSession(session);
    });

    return () => {
      managerRef.current?.removeListener(listenerKey);
      managerRef.current?.dispose();
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleOperation = useCallback(
    async <T>(
      operation: () => Promise<SessionOperationResult<T>>,
      loadingMessage?: string
    ): Promise<SessionOperationResult<T>> => {
      try {
        setIsLoading(true);
        clearError();

        if (loadingMessage) {
          toast.loading(loadingMessage);
        }

        const result = await operation();

        if (result.success) {
          toast.dismiss();
          if (loadingMessage) {
            toast.success(loadingMessage.replace("ing...", "ed successfully"));
          }
        } else {
          toast.dismiss();
          setError(result.error || "Operation failed");
          toast.error(result.error || "Operation failed");
        }

        return result;
      } catch (error) {
        toast.dismiss();
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        toast.error(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [clearError]
  );

  const createSession = useCallback(
    (options: {
      name: string;
      description?: string;
      priority?: SessionPriority;
      config?: Partial<SessionConfig>;
      tags?: string[];
    }) => {
      return handleOperation(
        () => managerRef.current!.createSession(options),
        "Creating session..."
      );
    },
    [handleOperation]
  );

  const loadSession = useCallback(
    (sessionId: string) => {
      return handleOperation(
        () => managerRef.current!.loadSession(sessionId),
        "Loading session..."
      );
    },
    [handleOperation]
  );

  const updateSession = useCallback(
    (updates: Partial<Session>) => {
      return handleOperation(() => managerRef.current!.updateSession(updates));
    },
    [handleOperation]
  );

  const closeSession = useCallback(() => {
    return handleOperation(
      () => managerRef.current!.closeSession(),
      "Closing session..."
    );
  }, [handleOperation]);

  const pauseSession = useCallback(() => {
    return handleOperation(() => managerRef.current!.pauseSession());
  }, [handleOperation]);

  const resumeSession = useCallback(() => {
    return handleOperation(() => managerRef.current!.resumeSession());
  }, [handleOperation]);

  const archiveSession = useCallback(
    (sessionId?: string) => {
      return handleOperation(
        () => managerRef.current!.archiveSession(sessionId),
        "Archiving session..."
      );
    },
    [handleOperation]
  );

  const addSimulation = useCallback(
    (simulation: Omit<SimulationReference, "id">) => {
      return handleOperation(() =>
        managerRef.current!.addSimulation(simulation)
      );
    },
    [handleOperation]
  );

  const updateSimulation = useCallback(
    (simulationId: string, updates: Partial<SimulationReference>) => {
      return handleOperation(() =>
        managerRef.current!.updateSimulation(simulationId, updates)
      );
    },
    [handleOperation]
  );

  const getAllSessions = useCallback(() => {
    return handleOperation(() => managerRef.current!.getAllSessions());
  }, [handleOperation]);

  const deleteSession = useCallback(
    (sessionId: string) => {
      return handleOperation(
        () => managerRef.current!.deleteSession(sessionId),
        "Deleting session..."
      );
    },
    [handleOperation]
  );

  const createRecoveryPoint = useCallback(() => {
    return handleOperation(
      () => managerRef.current!.createRecoveryPoint(),
      "Creating recovery point..."
    );
  }, [handleOperation]);

  return {
    currentSession,
    isLoading,
    error,
    createSession,
    loadSession,
    updateSession,
    closeSession,
    pauseSession,
    resumeSession,
    archiveSession,
    addSimulation,
    updateSimulation,
    getAllSessions,
    deleteSession,
    createRecoveryPoint,
    clearError,
  };
};

// Export default session manager instance
export const sessionManager = new SessionManager();
export default sessionManager;
