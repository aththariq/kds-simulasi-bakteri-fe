import {
  Session,
  SessionMetadata,
  SessionRecovery,
  SessionStatus,
  SimulationReference,
  SessionSchema,
} from "./schemas/session";
import {
  SessionPersistenceService,
  SessionOperationResult,
} from "./session-persistence";
import { SessionManager } from "./session-manager";
import { ValidationUtils } from "./schemas";
import { toast } from "sonner";
import { useState, useCallback, useRef, useEffect } from "react";

// Recovery types
export enum RecoveryType {
  AUTO_RECOVERY = "auto_recovery",
  MANUAL_RECOVERY = "manual_recovery",
  CRASH_RECOVERY = "crash_recovery",
  CORRUPTION_RECOVERY = "corruption_recovery",
  PARTIAL_RECOVERY = "partial_recovery",
}

// Recovery options
export interface RecoveryOptions {
  type: RecoveryType;
  preserveSimulations?: boolean;
  validateIntegrity?: boolean;
  createBackup?: boolean;
  mergeStrategy?: "overwrite" | "merge" | "preserve";
  maxRecoveryPoints?: number;
}

// Recovery result
export interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  session?: Session;
  issues?: RecoveryIssue[];
  warnings?: string[];
  error?: string;
  metadata?: {
    recoveredFrom: string;
    recoveryTime: number;
    dataIntegrity: number; // percentage
    itemsRecovered: number;
    itemsLost: number;
  };
}

// Recovery issue
export interface RecoveryIssue {
  type: "corruption" | "missing" | "invalid" | "version_mismatch";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  field?: string;
  suggestedAction?: string;
  autoFixable?: boolean;
}

// Interrupted session detection
export interface InterruptedSession {
  sessionId: string;
  metadata: SessionMetadata;
  lastActivity: Date;
  activeSimulations: string[];
  isRecoverable: boolean;
  reason:
    | "browser_closed"
    | "tab_closed"
    | "network_error"
    | "app_crash"
    | "unknown";
  dataIntegrity: number;
}

// Session recovery service
export class SessionRecoveryService {
  private persistenceService: SessionPersistenceService;
  private sessionManager: SessionManager;
  private recoveryEnabled = true;
  private checkInterval = 5000; // 5 seconds
  private recoveryCheckTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private readonly HEARTBEAT_KEY = "session_heartbeat";
  private readonly RECOVERY_KEY = "session_recovery_data";

  constructor(
    persistenceService?: SessionPersistenceService,
    sessionManager?: SessionManager
  ) {
    this.persistenceService =
      persistenceService || new SessionPersistenceService();
    this.sessionManager = sessionManager || new SessionManager();
    this.initializeRecovery();
  }

  // Initialize recovery system
  private initializeRecovery(): void {
    // Check for interrupted sessions on startup
    this.checkForInterruptedSessions();

    // Start heartbeat monitoring
    this.startHeartbeat();

    // Listen for session changes
    this.sessionManager.addListener("recovery_listener", session => {
      if (session) {
        this.updateRecoveryData(session);
      } else {
        this.clearRecoveryData();
      }
    });

    // Handle page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handlePageUnload.bind(this));
      window.addEventListener("unload", this.handlePageUnload.bind(this));
    }
  }

  // Start heartbeat to detect interruptions
  private startHeartbeat(): void {
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
    }

    this.recoveryCheckTimer = setInterval(() => {
      this.updateHeartbeat();
    }, this.checkInterval);

    // Initial heartbeat
    this.updateHeartbeat();
  }

  // Update heartbeat timestamp
  private updateHeartbeat(): void {
    try {
      this.lastHeartbeat = Date.now();
      sessionStorage.setItem(this.HEARTBEAT_KEY, this.lastHeartbeat.toString());
    } catch (error) {
      console.warn("Failed to update heartbeat:", error);
    }
  }

  // Handle page unload
  private handlePageUnload(): void {
    try {
      const currentSession = this.sessionManager.getCurrentSession();
      if (currentSession) {
        this.saveRecoveryData(currentSession, "browser_closed");
      }
      this.clearHeartbeat();
    } catch (error) {
      console.warn("Error during page unload:", error);
    }
  }

  // Save recovery data
  private saveRecoveryData(session: Session, reason: string): void {
    try {
      const recoveryData = {
        sessionId: session.metadata.id,
        timestamp: Date.now(),
        reason,
        session,
        activeSimulations: session.simulations
          .filter(sim => sim.status === "running" || sim.status === "paused")
          .map(sim => sim.id),
      };

      sessionStorage.setItem(this.RECOVERY_KEY, JSON.stringify(recoveryData));
    } catch (error) {
      console.warn("Failed to save recovery data:", error);
    }
  }

  // Update recovery data for current session
  private updateRecoveryData(session: Session): void {
    try {
      const currentData = sessionStorage.getItem(this.RECOVERY_KEY);
      if (currentData) {
        const parsedData = JSON.parse(currentData);
        parsedData.session = session;
        parsedData.timestamp = Date.now();
        sessionStorage.setItem(this.RECOVERY_KEY, JSON.stringify(parsedData));
      } else {
        this.saveRecoveryData(session, "unknown");
      }
    } catch (error) {
      console.warn("Failed to update recovery data:", error);
    }
  }

  // Clear recovery data
  private clearRecoveryData(): void {
    try {
      sessionStorage.removeItem(this.RECOVERY_KEY);
    } catch (error) {
      console.warn("Failed to clear recovery data:", error);
    }
  }

  // Clear heartbeat
  private clearHeartbeat(): void {
    try {
      sessionStorage.removeItem(this.HEARTBEAT_KEY);
    } catch (error) {
      console.warn("Failed to clear heartbeat:", error);
    }
  }

  // Check for interrupted sessions
  async checkForInterruptedSessions(): Promise<InterruptedSession[]> {
    const interruptedSessions: InterruptedSession[] = [];

    try {
      // Check for recovery data from previous session
      const recoveryData = sessionStorage.getItem(this.RECOVERY_KEY);
      if (recoveryData) {
        const parsed = JSON.parse(recoveryData);
        const interruption = await this.analyzeInterruption(parsed);
        if (interruption) {
          interruptedSessions.push(interruption);
        }
      }

      // Check for sessions with stale heartbeats
      const sessionsResult = await this.persistenceService.getAllSessions();
      if (sessionsResult.success && sessionsResult.data) {
        for (const sessionMetadata of sessionsResult.data) {
          if (sessionMetadata.status === "active") {
            const staleness = await this.checkSessionStaleness(sessionMetadata);
            if (staleness) {
              interruptedSessions.push(staleness);
            }
          }
        }
      }

      return interruptedSessions;
    } catch (error) {
      console.error("Error checking for interrupted sessions:", error);
      return [];
    }
  }

  // Analyze interruption from recovery data
  private async analyzeInterruption(
    recoveryData: any
  ): Promise<InterruptedSession | null> {
    try {
      const session = recoveryData.session;
      const timeSinceInterruption = Date.now() - recoveryData.timestamp;

      // Only consider as interrupted if more than 30 seconds have passed
      if (timeSinceInterruption < 30000) {
        return null;
      }

      const dataIntegrity = await this.calculateDataIntegrity(session);

      return {
        sessionId: session.metadata.id,
        metadata: session.metadata,
        lastActivity: new Date(recoveryData.timestamp),
        activeSimulations: recoveryData.activeSimulations || [],
        isRecoverable: dataIntegrity > 0.5, // 50% threshold
        reason: recoveryData.reason || "unknown",
        dataIntegrity,
      };
    } catch (error) {
      console.warn("Error analyzing interruption:", error);
      return null;
    }
  }

  // Check if a session is stale
  private async checkSessionStaleness(
    metadata: SessionMetadata
  ): Promise<InterruptedSession | null> {
    try {
      const lastActivity = new Date(metadata.updated_at);
      const staleness = Date.now() - lastActivity.getTime();

      // Consider stale if not updated in 10 minutes
      if (staleness > 600000) {
        const sessionResult = await this.persistenceService.loadSession(
          metadata.id
        );
        if (sessionResult.success && sessionResult.data) {
          const dataIntegrity = await this.calculateDataIntegrity(
            sessionResult.data
          );

          return {
            sessionId: metadata.id,
            metadata,
            lastActivity,
            activeSimulations: sessionResult.data.simulations
              .filter(
                sim => sim.status === "running" || sim.status === "paused"
              )
              .map(sim => sim.id),
            isRecoverable: dataIntegrity > 0.7, // Higher threshold for stale sessions
            reason: "unknown",
            dataIntegrity,
          };
        }
      }

      return null;
    } catch (error) {
      console.warn("Error checking session staleness:", error);
      return null;
    }
  }

  // Calculate data integrity percentage
  private async calculateDataIntegrity(session: Session): Promise<number> {
    let score = 1.0;

    try {
      // Check metadata completeness
      if (!session.metadata?.id || !session.metadata?.created_at) {
        score -= 0.3;
      }

      // Check simulations data
      if (session.simulations) {
        const simulations = session.simulations;
        let validSimulations = 0;

        for (const sim of simulations) {
          if (sim.id && sim.simulation_id && sim.parameters) {
            validSimulations++;
          }
        }

        if (simulations.length > 0) {
          const simulationScore = validSimulations / simulations.length;
          score *= simulationScore;
        }
      }

      // Check configuration
      if (!session.config) {
        score -= 0.1;
      }

      // Check performance data
      if (!session.performance) {
        score -= 0.1;
      }

      return Math.max(0, Math.min(1, score));
    } catch (error) {
      console.warn("Error calculating data integrity:", error);
      return 0.5; // Default to moderate integrity
    }
  }

  // Recover session with options
  async recoverSession(
    sessionId: string,
    options: RecoveryOptions = { type: RecoveryType.MANUAL_RECOVERY }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const issues: RecoveryIssue[] = [];
    const warnings: string[] = [];

    try {
      // Load the session
      const sessionResult = await this.persistenceService.loadSession(
        sessionId
      );
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          recovered: false,
          error: "Session not found or corrupted",
        };
      }

      let session = sessionResult.data;

      // Validate session integrity
      if (options.validateIntegrity) {
        const validationResult = await this.validateSessionIntegrity(session);
        issues.push(...validationResult.issues);
        warnings.push(...validationResult.warnings);

        if (validationResult.hasErrors) {
          // Attempt to fix issues
          const fixResult = await this.fixSessionIssues(
            session,
            validationResult.issues
          );
          session = fixResult.session;
          if (!fixResult.success) {
            warnings.push("Some issues could not be automatically fixed");
          }
        }
      }

      // Create backup if requested
      if (options.createBackup) {
        await this.createRecoveryBackup(session);
      }

      // Update session status to active
      const recoveredSession: Session = {
        ...session,
        metadata: {
          ...session.metadata,
          status: "active",
          updated_at: new Date().toISOString(),
        },
      };

      // Save recovered session
      const saveResult = await this.persistenceService.saveSession(
        recoveredSession
      );
      if (!saveResult.success) {
        return {
          success: false,
          recovered: false,
          error: "Failed to save recovered session",
        };
      }

      // Load into session manager
      const loadResult = await this.sessionManager.loadSession(sessionId);
      if (!loadResult.success) {
        warnings.push("Session recovered but not loaded into manager");
      }

      // Clear recovery data
      this.clearRecoveryData();

      const recoveryTime = Date.now() - startTime;
      const dataIntegrity = await this.calculateDataIntegrity(recoveredSession);

      return {
        success: true,
        recovered: true,
        session: recoveredSession,
        issues,
        warnings,
        metadata: {
          recoveredFrom: options.type,
          recoveryTime,
          dataIntegrity,
          itemsRecovered: this.countRecoveredItems(recoveredSession),
          itemsLost: 0, // Could be calculated by comparing with backup
        },
      };
    } catch (error) {
      console.error("Session recovery failed:", error);
      return {
        success: false,
        recovered: false,
        error:
          error instanceof Error ? error.message : "Unknown recovery error",
      };
    }
  }

  // Validate session integrity
  private async validateSessionIntegrity(session: Session): Promise<{
    isValid: boolean;
    hasErrors: boolean;
    issues: RecoveryIssue[];
    warnings: string[];
  }> {
    const issues: RecoveryIssue[] = [];
    const warnings: string[] = [];

    try {
      // Validate session schema
      const validationResult = ValidationUtils.safeParse(
        SessionSchema,
        session
      );
      if (!validationResult.success) {
        issues.push({
          type: "invalid",
          severity: "high",
          description: "Session data does not match expected schema",
          suggestedAction: "Attempt data reconstruction",
          autoFixable: true,
        });
      }

      // Check metadata
      if (!session.metadata || !session.metadata.id) {
        issues.push({
          type: "missing",
          severity: "critical",
          description: "Session metadata is missing or incomplete",
          field: "metadata",
          autoFixable: false,
        });
      }

      // Check simulations
      if (session.simulations) {
        for (let i = 0; i < session.simulations.length; i++) {
          const simulation = session.simulations[i];
          if (!simulation.id || !simulation.simulation_id) {
            issues.push({
              type: "corruption",
              severity: "medium",
              description: `Simulation ${i} has missing required fields`,
              field: `simulations[${i}]`,
              autoFixable: true,
            });
          }
        }
      }

      // Check for version mismatches
      if (session.metadata?.version && session.metadata.version !== "1.0.0") {
        warnings.push(
          `Session version ${session.metadata.version} may need migration`
        );
      }

      const hasErrors = issues.some(
        issue => issue.severity === "critical" || issue.severity === "high"
      );

      return {
        isValid: issues.length === 0,
        hasErrors,
        issues,
        warnings,
      };
    } catch (error) {
      issues.push({
        type: "corruption",
        severity: "critical",
        description: "Unable to validate session integrity",
        autoFixable: false,
      });

      return {
        isValid: false,
        hasErrors: true,
        issues,
        warnings,
      };
    }
  }

  // Fix session issues
  private async fixSessionIssues(
    session: Session,
    issues: RecoveryIssue[]
  ): Promise<{ success: boolean; session: Session }> {
    let fixedSession = { ...session };
    let allFixed = true;

    for (const issue of issues) {
      if (!issue.autoFixable) {
        allFixed = false;
        continue;
      }

      try {
        switch (issue.type) {
          case "missing":
            fixedSession = await this.fixMissingData(fixedSession, issue);
            break;
          case "corruption":
            fixedSession = await this.fixCorruptedData(fixedSession, issue);
            break;
          case "invalid":
            fixedSession = await this.fixInvalidData(fixedSession, issue);
            break;
          default:
            allFixed = false;
        }
      } catch (error) {
        console.warn(`Failed to fix issue: ${issue.description}`, error);
        allFixed = false;
      }
    }

    return {
      success: allFixed,
      session: fixedSession,
    };
  }

  // Fix missing data
  private async fixMissingData(
    session: Session,
    issue: RecoveryIssue
  ): Promise<Session> {
    const fixed = { ...session };

    switch (issue.field) {
      case "metadata":
        if (!fixed.metadata) {
          fixed.metadata = {
            id: crypto.randomUUID(),
            name: "Recovered Session",
            status: "active",
            priority: "medium",
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: "1.0.0",
          };
        }
        break;
    }

    return fixed;
  }

  // Fix corrupted data
  private async fixCorruptedData(
    session: Session,
    issue: RecoveryIssue
  ): Promise<Session> {
    const fixed = { ...session };

    if (issue.field?.startsWith("simulations[")) {
      const index = parseInt(issue.field.match(/\[(\d+)\]/)?.[1] || "0");
      if (fixed.simulations && fixed.simulations[index]) {
        const simulation = fixed.simulations[index];

        if (!simulation.id) {
          simulation.id = crypto.randomUUID();
        }

        if (!simulation.simulation_id) {
          simulation.simulation_id = `sim_${Date.now()}`;
        }
      }
    }

    return fixed;
  }

  // Fix invalid data
  private async fixInvalidData(
    session: Session,
    issue: RecoveryIssue
  ): Promise<Session> {
    // Attempt to reconstruct valid session from available data
    const fixed = { ...session };

    // Ensure all required fields are present
    if (!fixed.config) {
      fixed.config = {
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
    }

    if (!fixed.performance) {
      fixed.performance = {
        total_simulations: fixed.simulations?.length || 0,
        completed_simulations: 0,
        failed_simulations: 0,
        cancelled_simulations: 0,
        total_execution_time: 0,
        total_generations_processed: 0,
        storage_used: 0,
      };
    }

    if (!fixed.state) {
      fixed.state = {
        current_tab: "parameters",
        ui_state: {},
        filters: {
          status: [],
          tags: [],
        },
      };
    }

    return fixed;
  }

  // Create recovery backup
  private async createRecoveryBackup(session: Session): Promise<void> {
    try {
      await this.persistenceService.createRecoveryPoint(session.metadata.id);
    } catch (error) {
      console.warn("Failed to create recovery backup:", error);
    }
  }

  // Count recovered items
  private countRecoveredItems(session: Session): number {
    let count = 0;

    if (session.metadata) count++;
    if (session.config) count++;
    if (session.performance) count++;
    if (session.state) count++;
    if (session.simulations) count += session.simulations.length;

    return count;
  }

  // Auto-recover interrupted sessions
  async autoRecover(): Promise<RecoveryResult[]> {
    const results: RecoveryResult[] = [];

    try {
      const interruptedSessions = await this.checkForInterruptedSessions();

      for (const interrupted of interruptedSessions) {
        if (interrupted.isRecoverable && interrupted.dataIntegrity > 0.8) {
          const result = await this.recoverSession(interrupted.sessionId, {
            type: RecoveryType.AUTO_RECOVERY,
            validateIntegrity: true,
            createBackup: true,
          });

          results.push(result);

          if (result.success) {
            toast.success(
              `Session "${interrupted.metadata.name}" auto-recovered`
            );
          }
        }
      }
    } catch (error) {
      console.error("Auto-recovery failed:", error);
    }

    return results;
  }

  // Get recovery suggestions
  async getRecoverySuggestions(): Promise<{
    interruptedSessions: InterruptedSession[];
    recommendations: {
      sessionId: string;
      action: "auto_recover" | "manual_recover" | "discard";
      reason: string;
      confidence: number;
    }[];
  }> {
    const interruptedSessions = await this.checkForInterruptedSessions();
    const recommendations = [];

    for (const session of interruptedSessions) {
      if (session.dataIntegrity > 0.9) {
        recommendations.push({
          sessionId: session.sessionId,
          action: "auto_recover" as const,
          reason: "High data integrity, safe for automatic recovery",
          confidence: session.dataIntegrity,
        });
      } else if (session.dataIntegrity > 0.5) {
        recommendations.push({
          sessionId: session.sessionId,
          action: "manual_recover" as const,
          reason: "Moderate data integrity, requires manual review",
          confidence: session.dataIntegrity,
        });
      } else {
        recommendations.push({
          sessionId: session.sessionId,
          action: "discard" as const,
          reason: "Low data integrity, recovery may not be reliable",
          confidence: session.dataIntegrity,
        });
      }
    }

    return {
      interruptedSessions,
      recommendations,
    };
  }

  // Enable/disable recovery
  setRecoveryEnabled(enabled: boolean): void {
    this.recoveryEnabled = enabled;

    if (enabled) {
      this.startHeartbeat();
    } else {
      if (this.recoveryCheckTimer) {
        clearInterval(this.recoveryCheckTimer);
        this.recoveryCheckTimer = null;
      }
    }
  }

  // Cleanup
  dispose(): void {
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
    }

    this.sessionManager.removeListener("recovery_listener");

    if (typeof window !== "undefined") {
      window.removeEventListener(
        "beforeunload",
        this.handlePageUnload.bind(this)
      );
      window.removeEventListener("unload", this.handlePageUnload.bind(this));
    }
  }
}

// React hook for session recovery
export interface UseSessionRecoveryReturn {
  // Recovery operations
  checkForInterrupted: () => Promise<InterruptedSession[]>;
  recoverSession: (
    sessionId: string,
    options?: RecoveryOptions
  ) => Promise<RecoveryResult>;
  autoRecover: () => Promise<RecoveryResult[]>;
  getRecoverySuggestions: () => Promise<any>;

  // State
  isRecovering: boolean;
  lastRecoveryCheck: Date | null;
  interruptedSessions: InterruptedSession[];
  error: string | null;

  // Controls
  setRecoveryEnabled: (enabled: boolean) => void;
  clearError: () => void;
  refreshInterrupted: () => Promise<void>;
}

export const useSessionRecovery = (): UseSessionRecoveryReturn => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastRecoveryCheck, setLastRecoveryCheck] = useState<Date | null>(null);
  const [interruptedSessions, setInterruptedSessions] = useState<
    InterruptedSession[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const recoveryServiceRef = useRef<SessionRecoveryService>();

  // Initialize recovery service
  useEffect(() => {
    recoveryServiceRef.current = new SessionRecoveryService();

    return () => {
      recoveryServiceRef.current?.dispose();
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkForInterrupted = useCallback(async (): Promise<
    InterruptedSession[]
  > => {
    try {
      setError(null);
      const interrupted =
        await recoveryServiceRef.current!.checkForInterruptedSessions();
      setInterruptedSessions(interrupted);
      setLastRecoveryCheck(new Date());
      return interrupted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      return [];
    }
  }, []);

  const recoverSession = useCallback(
    async (
      sessionId: string,
      options?: RecoveryOptions
    ): Promise<RecoveryResult> => {
      try {
        setIsRecovering(true);
        setError(null);

        const result = await recoveryServiceRef.current!.recoverSession(
          sessionId,
          options
        );

        if (result.success) {
          toast.success("Session recovered successfully");
          // Refresh interrupted sessions list
          await checkForInterrupted();
        } else {
          setError(result.error || "Recovery failed");
          toast.error(result.error || "Recovery failed");
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        toast.error(errorMessage);
        return {
          success: false,
          recovered: false,
          error: errorMessage,
        };
      } finally {
        setIsRecovering(false);
      }
    },
    [checkForInterrupted]
  );

  const autoRecover = useCallback(async (): Promise<RecoveryResult[]> => {
    try {
      setIsRecovering(true);
      setError(null);

      const results = await recoveryServiceRef.current!.autoRecover();

      // Refresh interrupted sessions list
      await checkForInterrupted();

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      return [];
    } finally {
      setIsRecovering(false);
    }
  }, [checkForInterrupted]);

  const getRecoverySuggestions = useCallback(async () => {
    try {
      setError(null);
      return await recoveryServiceRef.current!.getRecoverySuggestions();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      return { interruptedSessions: [], recommendations: [] };
    }
  }, []);

  const setRecoveryEnabled = useCallback((enabled: boolean) => {
    recoveryServiceRef.current?.setRecoveryEnabled(enabled);
  }, []);

  const refreshInterrupted = useCallback(async () => {
    await checkForInterrupted();
  }, [checkForInterrupted]);

  // Check for interrupted sessions on mount
  useEffect(() => {
    checkForInterrupted();
  }, [checkForInterrupted]);

  return {
    checkForInterrupted,
    recoverSession,
    autoRecover,
    getRecoverySuggestions,
    isRecovering,
    lastRecoveryCheck,
    interruptedSessions,
    error,
    setRecoveryEnabled,
    clearError,
    refreshInterrupted,
  };
};

// Export default instance
export const sessionRecovery = new SessionRecoveryService();
export default sessionRecovery;
