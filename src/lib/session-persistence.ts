import {
  Session,
  SessionMetadata,
  SessionConfig,
  SessionStorageType,
  SessionSchema,
  SessionExport,
  SessionRecovery,
  SessionStatus,
} from "./schemas/session";
import { ValidationUtils, ErrorMessages } from "./schemas";
import { z } from "zod";
import { toast } from "sonner";
import { useState, useCallback, useRef, useEffect } from "react";

// Storage interface for different persistence mechanisms
interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
}

// LocalStorage adapter
class LocalStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("LocalStorage get failed:", error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("LocalStorage set failed:", error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("LocalStorage remove failed:", error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.warn("LocalStorage keys failed:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn("LocalStorage clear failed:", error);
    }
  }

  async getSize(): Promise<number> {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return total;
    } catch (error) {
      console.warn("LocalStorage size calculation failed:", error);
      return 0;
    }
  }
}

// IndexedDB adapter
class IndexedDBAdapter implements StorageAdapter {
  private dbName = "bacterial_simulation_sessions";
  private version = 1;
  private storeName = "sessions";

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      console.warn("IndexedDB get failed:", error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error("IndexedDB set failed:", error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn("IndexedDB remove failed:", error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.warn("IndexedDB keys failed:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn("IndexedDB clear failed:", error);
    }
  }

  async getSize(): Promise<number> {
    try {
      const keys = await this.keys();
      let total = 0;

      for (const key of keys) {
        const value = await this.get(key);
        if (value) {
          total += value.length + key.length;
        }
      }

      return total;
    } catch (error) {
      console.warn("IndexedDB size calculation failed:", error);
      return 0;
    }
  }
}

// Compression utilities
class CompressionUtils {
  static compress(data: string, enabled: boolean = true): string {
    if (!enabled) return data;

    try {
      // Use base64 encoding for simple compression
      return btoa(encodeURIComponent(data));
    } catch (error) {
      console.warn("Compression failed, storing uncompressed:", error);
      return data;
    }
  }

  static decompress(data: string, wasCompressed: boolean = true): string {
    if (!wasCompressed) return data;

    try {
      return decodeURIComponent(atob(data));
    } catch (error) {
      console.warn("Decompression failed, assuming uncompressed:", error);
      return data;
    }
  }

  static calculateCompressionRatio(
    original: string,
    compressed: string
  ): number {
    if (original.length === 0) return 0;
    return (compressed.length / original.length) * 100;
  }
}

// Version management for schema evolution
class VersionManager {
  private static readonly CURRENT_VERSION = "1.0.0";

  static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  static migrate(data: any, fromVersion: string): any {
    // Handle version migrations here
    switch (fromVersion) {
      case "0.9.0":
        // Example migration
        return this.migrateFrom090(data);
      default:
        return data;
    }
  }

  private static migrateFrom090(data: any): any {
    // Example migration logic
    if (data && !data.metadata?.version) {
      data.metadata = { ...data.metadata, version: "1.0.0" };
    }
    return data;
  }
}

// Storage quota management
interface StorageQuota {
  quota: number;
  usage: number;
  available: number;
  usagePercentage: number;
}

class QuotaManager {
  static async getStorageQuota(): Promise<StorageQuota> {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const available = quota - usage;
        const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;

        return { quota, usage, available, usagePercentage };
      } catch (error) {
        console.warn("Storage quota check failed:", error);
      }
    }

    // Fallback for browsers without storage API
    return {
      quota: 0,
      usage: 0,
      available: 0,
      usagePercentage: 0,
    };
  }

  static async checkQuotaExceeded(requiredSpace: number): Promise<boolean> {
    const quota = await this.getStorageQuota();
    return quota.available < requiredSpace;
  }

  static async cleanupOldSessions(
    adapter: StorageAdapter,
    keyPrefix: string,
    maxAge: number
  ): Promise<number> {
    try {
      const keys = await adapter.keys();
      const sessionKeys = keys.filter(key => key.startsWith(keyPrefix));
      let cleanedCount = 0;

      for (const key of sessionKeys) {
        try {
          const data = await adapter.get(key);
          if (data) {
            const session = JSON.parse(data);
            const createdAt = new Date(session.metadata?.created_at);
            const age = Date.now() - createdAt.getTime();

            if (age > maxAge) {
              await adapter.remove(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Remove corrupted entries
          await adapter.remove(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.warn("Cleanup failed:", error);
      return 0;
    }
  }
}

// Main session persistence service
export interface SessionPersistenceOptions {
  storageType?: SessionStorageType;
  autoSaveInterval?: number;
  compressionEnabled?: boolean;
  maxSessions?: number;
  maxAge?: number; // in milliseconds
  encryptionKey?: string;
}

export interface SessionOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    compressionRatio?: number;
    storageUsed?: number;
    operationTime?: number;
  };
}

export class SessionPersistenceService {
  private adapter: StorageAdapter;
  private keyPrefix = "session_";
  private indexKey = "session_index";
  private options: Required<SessionPersistenceOptions>;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, (session: Session) => void> = new Map();

  constructor(options: SessionPersistenceOptions = {}) {
    this.options = {
      storageType: options.storageType || "indexedDB",
      autoSaveInterval: options.autoSaveInterval || 30000,
      compressionEnabled: options.compressionEnabled !== false,
      maxSessions: options.maxSessions || 10,
      maxAge: options.maxAge || 7 * 24 * 60 * 60 * 1000, // 7 days
      encryptionKey: options.encryptionKey || "",
    };

    this.adapter = this.createAdapter(this.options.storageType);
  }

  private createAdapter(storageType: SessionStorageType): StorageAdapter {
    switch (storageType) {
      case "localStorage":
        return new LocalStorageAdapter();
      case "indexedDB":
        return new IndexedDBAdapter();
      default:
        console.warn(
          `Unsupported storage type: ${storageType}, falling back to localStorage`
        );
        return new LocalStorageAdapter();
    }
  }

  // Save session with validation and compression
  async saveSession(session: Session): Promise<SessionOperationResult> {
    const startTime = Date.now();

    try {
      // Validate session data
      const validationResult = ValidationUtils.safeParse(
        SessionSchema,
        session
      );
      if (!validationResult.success) {
        return {
          success: false,
          error: "Session validation failed",
        };
      }

      // Update metadata
      const updatedSession: Session = {
        ...session,
        metadata: {
          ...session.metadata,
          updated_at: new Date().toISOString(),
          version: VersionManager.getCurrentVersion(),
        },
      };

      // Serialize and compress
      const serialized = JSON.stringify(updatedSession);
      const compressed = CompressionUtils.compress(
        serialized,
        this.options.compressionEnabled
      );

      // Check storage quota
      const requiredSpace = compressed.length * 2; // Buffer for safety
      if (await QuotaManager.checkQuotaExceeded(requiredSpace)) {
        // Attempt cleanup
        const cleaned = await QuotaManager.cleanupOldSessions(
          this.adapter,
          this.keyPrefix,
          this.options.maxAge
        );

        if (cleaned === 0) {
          return {
            success: false,
            error: "Storage quota exceeded and cleanup failed",
          };
        }
      }

      // Save session
      const sessionKey = `${this.keyPrefix}${session.metadata.id}`;
      await this.adapter.set(sessionKey, compressed);

      // Update index
      await this.updateSessionIndex(session.metadata);

      // Notify listeners
      this.notifyListeners(session.metadata.id, updatedSession);

      const operationTime = Date.now() - startTime;
      const compressionRatio = CompressionUtils.calculateCompressionRatio(
        serialized,
        compressed
      );

      return {
        success: true,
        data: updatedSession,
        metadata: {
          compressionRatio,
          storageUsed: compressed.length,
          operationTime,
        },
      };
    } catch (error) {
      console.error("Failed to save session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Load session with decompression and migration
  async loadSession(
    sessionId: string
  ): Promise<SessionOperationResult<Session>> {
    const startTime = Date.now();

    try {
      const sessionKey = `${this.keyPrefix}${sessionId}`;
      const compressed = await this.adapter.get(sessionKey);

      if (!compressed) {
        return {
          success: false,
          error: "Session not found",
        };
      }

      // Decompress and parse
      const decompressed = CompressionUtils.decompress(
        compressed,
        this.options.compressionEnabled
      );
      const sessionData = JSON.parse(decompressed);

      // Handle version migration
      const currentVersion = VersionManager.getCurrentVersion();
      const sessionVersion = sessionData.metadata?.version || "0.9.0";

      let migratedData = sessionData;
      if (sessionVersion !== currentVersion) {
        migratedData = VersionManager.migrate(sessionData, sessionVersion);
        // Save migrated version
        await this.saveSession(migratedData);
      }

      // Validate migrated data
      const validationResult = ValidationUtils.safeParse(
        SessionSchema,
        migratedData
      );
      if (!validationResult.success) {
        return {
          success: false,
          error: "Session data validation failed after migration",
        };
      }

      const operationTime = Date.now() - startTime;

      return {
        success: true,
        data: validationResult.data,
        metadata: {
          operationTime,
        },
      };
    } catch (error) {
      console.error("Failed to load session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get all sessions metadata
  async getAllSessions(): Promise<SessionOperationResult<SessionMetadata[]>> {
    try {
      const indexData = await this.adapter.get(this.indexKey);
      if (!indexData) {
        return {
          success: true,
          data: [],
        };
      }

      const index = JSON.parse(indexData);
      return {
        success: true,
        data: Array.isArray(index) ? index : [],
      };
    } catch (error) {
      console.error("Failed to get sessions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<SessionOperationResult> {
    try {
      const sessionKey = `${this.keyPrefix}${sessionId}`;
      await this.adapter.remove(sessionKey);
      await this.removeFromIndex(sessionId);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Failed to delete session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Export session
  async exportSession(
    sessionId: string
  ): Promise<SessionOperationResult<SessionExport>> {
    try {
      const sessionResult = await this.loadSession(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: sessionResult.error,
        };
      }

      const exportData: SessionExport = {
        version: VersionManager.getCurrentVersion(),
        export_timestamp: new Date().toISOString(),
        session: sessionResult.data,
        checksum: this.calculateChecksum(sessionResult.data),
      };

      return {
        success: true,
        data: exportData,
      };
    } catch (error) {
      console.error("Failed to export session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Import session
  async importSession(
    exportData: SessionExport
  ): Promise<SessionOperationResult<Session>> {
    try {
      // Validate export data structure
      const session = exportData.session;

      // Verify checksum if available
      if (exportData.checksum) {
        const currentChecksum = this.calculateChecksum(session);
        if (currentChecksum !== exportData.checksum) {
          return {
            success: false,
            error: "Import data integrity check failed",
          };
        }
      }

      // Generate new ID to avoid conflicts
      const importedSession: Session = {
        ...session,
        metadata: {
          ...session.metadata,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      return await this.saveSession(importedSession);
    } catch (error) {
      console.error("Failed to import session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalSessions: number;
    totalSize: number;
    quota: StorageQuota;
    oldestSession?: string;
    newestSession?: string;
  }> {
    try {
      const [sessionsResult, quota] = await Promise.all([
        this.getAllSessions(),
        QuotaManager.getStorageQuota(),
      ]);

      const sessions = sessionsResult.data || [];
      const totalSize = await this.adapter.getSize();

      let oldestSession: string | undefined;
      let newestSession: string | undefined;

      if (sessions.length > 0) {
        const sorted = sessions.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        oldestSession = sorted[0].created_at;
        newestSession = sorted[sorted.length - 1].created_at;
      }

      return {
        totalSessions: sessions.length,
        totalSize,
        quota,
        oldestSession,
        newestSession,
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return {
        totalSessions: 0,
        totalSize: 0,
        quota: { quota: 0, usage: 0, available: 0, usagePercentage: 0 },
      };
    }
  }

  // Auto-save functionality
  startAutoSave(getCurrentSession: () => Session | null): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      const session = getCurrentSession();
      if (session && session.metadata.status === "active") {
        try {
          await this.saveSession(session);
        } catch (error) {
          console.warn("Auto-save failed:", error);
        }
      }
    }, this.options.autoSaveInterval);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // Session change listeners
  addSessionListener(
    sessionId: string,
    listener: (session: Session) => void
  ): void {
    this.listeners.set(sessionId, listener);
  }

  removeSessionListener(sessionId: string): void {
    this.listeners.delete(sessionId);
  }

  // Recovery functionality
  async createRecoveryPoint(
    sessionId: string
  ): Promise<SessionOperationResult<SessionRecovery>> {
    try {
      const sessionResult = await this.loadSession(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: sessionResult.error,
        };
      }

      const recoveryData: SessionRecovery = {
        session_id: sessionId,
        recovery_point_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        session_state: sessionResult.data,
        metadata: {
          recovery_type: "manual",
          trigger: "user_initiated",
        },
      };

      const recoveryKey = `recovery_${sessionId}_${recoveryData.recovery_point_id}`;
      const serialized = JSON.stringify(recoveryData);
      const compressed = CompressionUtils.compress(
        serialized,
        this.options.compressionEnabled
      );

      await this.adapter.set(recoveryKey, compressed);

      return {
        success: true,
        data: recoveryData,
      };
    } catch (error) {
      console.error("Failed to create recovery point:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Cleanup old data
  async cleanup(): Promise<SessionOperationResult<{ cleaned: number }>> {
    try {
      const cleaned = await QuotaManager.cleanupOldSessions(
        this.adapter,
        this.keyPrefix,
        this.options.maxAge
      );

      return {
        success: true,
        data: { cleaned },
      };
    } catch (error) {
      console.error("Cleanup failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Private helper methods
  private async updateSessionIndex(metadata: SessionMetadata): Promise<void> {
    try {
      const indexResult = await this.getAllSessions();
      const currentIndex = indexResult.data || [];

      // Remove existing entry
      const filteredIndex = currentIndex.filter(
        item => item.id !== metadata.id
      );

      // Add updated entry
      const updatedIndex = [metadata, ...filteredIndex].slice(
        0,
        this.options.maxSessions
      );

      await this.adapter.set(this.indexKey, JSON.stringify(updatedIndex));
    } catch (error) {
      console.error("Failed to update session index:", error);
      throw error;
    }
  }

  private async removeFromIndex(sessionId: string): Promise<void> {
    try {
      const indexResult = await this.getAllSessions();
      const currentIndex = indexResult.data || [];

      const updatedIndex = currentIndex.filter(item => item.id !== sessionId);
      await this.adapter.set(this.indexKey, JSON.stringify(updatedIndex));
    } catch (error) {
      console.error("Failed to remove from session index:", error);
      throw error;
    }
  }

  private notifyListeners(sessionId: string, session: Session): void {
    const listener = this.listeners.get(sessionId);
    if (listener) {
      try {
        listener(session);
      } catch (error) {
        console.warn("Session listener error:", error);
      }
    }
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation - in production, use a proper hash function
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Clean up resources
  dispose(): void {
    this.stopAutoSave();
    this.listeners.clear();
  }
}

// Export singleton instance
export const sessionPersistence = new SessionPersistenceService();

// Utility hooks and functions for React components
export interface UseSessionPersistenceOptions
  extends SessionPersistenceOptions {
  autoLoad?: boolean;
  autoSave?: boolean;
}

export interface UseSessionPersistenceReturn {
  // Core operations
  saveSession: (session: Session) => Promise<SessionOperationResult>;
  loadSession: (sessionId: string) => Promise<SessionOperationResult<Session>>;
  deleteSession: (sessionId: string) => Promise<SessionOperationResult>;
  getAllSessions: () => Promise<SessionOperationResult<SessionMetadata[]>>;

  // Import/Export
  exportSession: (
    sessionId: string
  ) => Promise<SessionOperationResult<SessionExport>>;
  importSession: (
    exportData: SessionExport
  ) => Promise<SessionOperationResult<Session>>;

  // Storage management
  getStorageStats: () => Promise<any>;
  cleanup: () => Promise<SessionOperationResult<{ cleaned: number }>>;

  // Recovery
  createRecoveryPoint: (
    sessionId: string
  ) => Promise<SessionOperationResult<SessionRecovery>>;

  // Status
  isAutoSaving: boolean;
  lastOperation: Date | null;
  error: string | null;

  // Utilities
  clearError: () => void;
}

// React hook for session persistence
export const useSessionPersistence = (
  options: UseSessionPersistenceOptions = {}
): UseSessionPersistenceReturn => {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastOperation, setLastOperation] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<SessionPersistenceService>();

  // Initialize service
  useEffect(() => {
    serviceRef.current = new SessionPersistenceService(options);

    return () => {
      serviceRef.current?.dispose();
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleOperation = useCallback(
    async <T>(
      operation: () => Promise<SessionOperationResult<T>>,
      successMessage?: string
    ): Promise<SessionOperationResult<T>> => {
      try {
        clearError();
        const result = await operation();

        if (result.success) {
          setLastOperation(new Date());
          if (successMessage) {
            toast.success(successMessage);
          }
        } else {
          setError(result.error || "Operation failed");
          toast.error(result.error || "Operation failed");
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        toast.error(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [clearError]
  );

  const saveSession = useCallback(
    (session: Session) => {
      return handleOperation(
        () => serviceRef.current!.saveSession(session),
        "Session saved successfully"
      );
    },
    [handleOperation]
  );

  const loadSession = useCallback(
    (sessionId: string) => {
      return handleOperation(
        () => serviceRef.current!.loadSession(sessionId),
        "Session loaded successfully"
      );
    },
    [handleOperation]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      return handleOperation(
        () => serviceRef.current!.deleteSession(sessionId),
        "Session deleted successfully"
      );
    },
    [handleOperation]
  );

  const getAllSessions = useCallback(() => {
    return handleOperation(() => serviceRef.current!.getAllSessions());
  }, [handleOperation]);

  const exportSession = useCallback(
    (sessionId: string) => {
      return handleOperation(
        () => serviceRef.current!.exportSession(sessionId),
        "Session exported successfully"
      );
    },
    [handleOperation]
  );

  const importSession = useCallback(
    (exportData: SessionExport) => {
      return handleOperation(
        () => serviceRef.current!.importSession(exportData),
        "Session imported successfully"
      );
    },
    [handleOperation]
  );

  const getStorageStats = useCallback(() => {
    return serviceRef.current!.getStorageStats();
  }, []);

  const cleanup = useCallback(() => {
    return handleOperation(
      () => serviceRef.current!.cleanup(),
      "Cleanup completed successfully"
    );
  }, [handleOperation]);

  const createRecoveryPoint = useCallback(
    (sessionId: string) => {
      return handleOperation(
        () => serviceRef.current!.createRecoveryPoint(sessionId),
        "Recovery point created"
      );
    },
    [handleOperation]
  );

  return {
    saveSession,
    loadSession,
    deleteSession,
    getAllSessions,
    exportSession,
    importSession,
    getStorageStats,
    cleanup,
    createRecoveryPoint,
    isAutoSaving,
    lastOperation,
    error,
    clearError,
  };
};

// Export default instance for direct use
export default sessionPersistence;
