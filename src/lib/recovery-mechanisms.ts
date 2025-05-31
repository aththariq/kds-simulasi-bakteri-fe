import { toast } from "sonner";
import type { ValidationError } from "@/components/ui/notification-system";

// Types for recovery mechanisms
export interface RecoveryState {
  id: string;
  timestamp: number;
  data: unknown;
  version: string;
  checksum?: string;
}

export interface RecoveryOptions {
  autoSave?: boolean;
  saveInterval?: number;
  maxRetries?: number;
  fallbackEnabled?: boolean;
  userConfirmation?: boolean;
}

export interface GracefulDegradationConfig {
  feature: string;
  fallbackHandler?: () => void;
  userMessage?: string;
  retryEnabled?: boolean;
}

// Form State Manager for preserving form data during errors
export class FormStateManager {
  private static readonly STORAGE_PREFIX = "form_recovery_";
  private static readonly EXPIRY_HOURS = 24;

  static saveFormState(formId: string, data: unknown): void {
    if (typeof window === "undefined") return;

    try {
      const recoveryState: RecoveryState = {
        id: formId,
        timestamp: Date.now(),
        data,
        version: "1.0.0",
        checksum: this.generateChecksum(data),
      };

      const expiryTime = Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000;
      const storageData = {
        ...recoveryState,
        expiryTime,
      };

      localStorage.setItem(
        `${this.STORAGE_PREFIX}${formId}`,
        JSON.stringify(storageData)
      );
    } catch (error) {
      console.warn("Failed to save form state:", error);
    }
  }

  static restoreFormState(
    formId: string,
    options: {
      showNotification?: boolean;
      onRestore?: (data: unknown) => void;
      onError?: (error: unknown) => void;
    } = {}
  ): unknown | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${formId}`);
      if (!stored) return null;

      const storageData = JSON.parse(stored);

      // Check if data has expired
      if (Date.now() > storageData.expiryTime) {
        this.clearFormState(formId);
        return null;
      }

      // Validate checksum if available
      if (storageData.checksum) {
        const currentChecksum = this.generateChecksum(storageData.data);
        if (currentChecksum !== storageData.checksum) {
          console.warn("Form state checksum mismatch, data may be corrupted");
          return null;
        }
      }

      if (options.onRestore) {
        options.onRestore(storageData.data);
      }

      return storageData.data;
    } catch (error) {
      console.warn("Failed to restore form state:", error);
      if (options.onError) {
        options.onError(error);
      }
      return null;
    }
  }

  static hasFormState(formId: string): boolean {
    if (typeof window === "undefined") return false;
    const data = this.restoreFormState(formId);
    return data !== null;
  }

  static clearFormState(formId: string): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(`${this.STORAGE_PREFIX}${formId}`);
    } catch (error) {
      console.warn("Failed to clear form state:", error);
    }
  }

  static clearExpiredStates(): void {
    if (typeof window === "undefined") return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const storageData = JSON.parse(stored);
              if (Date.now() > storageData.expiryTime) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // If we can't parse or access the data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn("Failed to clear expired form states:", error);
    }
  }

  static hasRecoveryData(formId: string): boolean {
    if (typeof window === "undefined") return false;
    const data = this.restoreFormState(formId);
    return data !== null;
  }

  static getRecoveryState(formId: string): RecoveryState | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${formId}`);
      if (!stored) return null;

      const storageData = JSON.parse(stored);

      // Check if data has expired
      if (Date.now() > storageData.expiryTime) {
        this.clearFormState(formId);
        return null;
      }

      // Return the full recovery state
      return {
        id: storageData.id,
        timestamp: storageData.timestamp,
        data: storageData.data,
        version: storageData.version,
        checksum: storageData.checksum,
      };
    } catch (error) {
      console.warn("Failed to get recovery state:", error);
      return null;
    }
  }

  private static generateChecksum(data: unknown): string {
    // Simple checksum generation for data integrity
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

// Auto-save manager for preventing data loss
export class AutoSaveManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private static readonly DEFAULT_INTERVAL = 30000; // 30 seconds

  startAutoSave(
    options: {
      key: string;
      interval?: number;
      maxVersions?: number;
      enabled?: boolean;
    },
    getData: () => unknown,
    onSave?: () => void
  ): void {
    const {
      key,
      interval = AutoSaveManager.DEFAULT_INTERVAL,
      enabled = true,
    } = options;

    if (!enabled) return;

    // Clear existing interval if any
    this.stopAutoSave(key);

    const intervalId = setInterval(() => {
      try {
        const data = getData();
        if (
          data &&
          typeof data === "object" &&
          data !== null &&
          Object.keys(data).length > 0
        ) {
          FormStateManager.saveFormState(key, data);
          if (onSave) {
            onSave();
          }
        }
      } catch (_error) {
        console.warn(`Auto-save failed for form ${key}:`, _error);
      }
    }, interval);

    this.intervals.set(key, intervalId);
  }

  stopAutoSave(formId: string): void {
    const intervalId = this.intervals.get(formId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(formId);
    }
  }
}

// Graceful degradation manager for feature failures
export class GracefulDegradationManager {
  private static degradedFeatures: Set<string> = new Set();
  private static fallbackHandlers: Map<string, () => void> = new Map();

  static enableFeatureDegradation(config: GracefulDegradationConfig): void {
    this.degradedFeatures.add(config.feature);

    if (config.fallbackHandler) {
      this.fallbackHandlers.set(config.feature, config.fallbackHandler);
    }

    if (config.userMessage) {
      toast.warning(config.userMessage, {
        action: config.retryEnabled
          ? {
              label: "Retry",
              onClick: () => this.retryFeature(config.feature),
            }
          : undefined,
      });
    }
  }

  static disableFeatureDegradation(feature: string): void {
    this.degradedFeatures.delete(feature);
    this.fallbackHandlers.delete(feature);

    toast.success(`${feature} is now available`, {
      duration: 3000,
    });
  }

  static isFeatureDegraded(feature: string): boolean {
    return this.degradedFeatures.has(feature);
  }

  static executeFallback(feature: string): boolean {
    const handler = this.fallbackHandlers.get(feature);
    if (handler) {
      try {
        handler();
        return true;
      } catch (error) {
        console.error(`Fallback handler failed for ${feature}:`, error);
        return false;
      }
    }
    return false;
  }

  static retryFeature(feature: string): void {
    this.disableFeatureDegradation(feature);
    toast.info(`Retrying ${feature}...`);
  }

  static getDegradedFeatures(): string[] {
    return Array.from(this.degradedFeatures);
  }
}

// Recovery flow manager for user-guided error resolution
export class RecoveryFlowManager {
  static async offerDataRecovery(
    formId: string,
    onRestore: (data: unknown) => void,
    onDiscard: () => void
  ): Promise<void> {
    const recoveryState = FormStateManager.getRecoveryState(formId);

    if (!recoveryState) {
      return;
    }

    const timestamp = new Date(recoveryState.timestamp);
    const timeAgo = this.getTimeAgo(timestamp);

    toast.info(
      `We found unsaved changes from ${timeAgo}. Would you like to restore them?`,
      {
        duration: 0, // Don't auto-dismiss
        action: {
          label: "Restore",
          onClick: () => {
            onRestore(recoveryState.data);
            FormStateManager.clearFormState(formId);
            toast.success("Data restored successfully");
          },
        },
        cancel: {
          label: "Discard",
          onClick: () => {
            FormStateManager.clearFormState(formId);
            onDiscard();
            toast.info("Unsaved changes discarded");
          },
        },
      }
    );
  }

  static async confirmDataLoss(
    message: string = "You have unsaved changes. Are you sure you want to continue?"
  ): Promise<boolean> {
    return new Promise(resolve => {
      toast.warning(message, {
        duration: 0,
        action: {
          label: "Continue",
          onClick: () => resolve(true),
        },
        cancel: {
          label: "Cancel",
          onClick: () => resolve(false),
        },
      });
    });
  }

  static offerRetryWithOptions(
    operation: string,
    retryFn: () => Promise<void>,
    options: {
      maxRetries?: number;
      fallbackFn?: () => void;
      fallbackLabel?: string;
    } = {}
  ): void {
    const {
      maxRetries = 3,
      fallbackFn,
      fallbackLabel = "Use Alternative",
    } = options;
    let retryCount = 0;

    const attemptRetry = async () => {
      retryCount++;

      try {
        await retryFn();
        toast.success(`${operation} completed successfully`);
      } catch (_error) {
        if (retryCount < maxRetries) {
          toast.error(
            `${operation} failed. Retry ${retryCount}/${maxRetries}`,
            {
              action: {
                label: "Retry",
                onClick: attemptRetry,
              },
            }
          );
        } else {
          toast.error(`${operation} failed after ${maxRetries} attempts`, {
            action: fallbackFn
              ? {
                  label: fallbackLabel,
                  onClick: fallbackFn,
                }
              : undefined,
          });
        }
      }
    };

    toast.error(`${operation} failed`, {
      action: {
        label: "Retry",
        onClick: attemptRetry,
      },
    });
  }

  static showValidationRecoveryFlow(
    validationErrors: ValidationError[],
    onFocus?: () => void
  ): void {
    const errorCount = validationErrors.length;
    const primaryError = validationErrors[0];

    toast.warning(
      `${errorCount} validation error${errorCount > 1 ? "s" : ""} found`,
      {
        description: primaryError?.message,
        action: {
          label: "Focus First Error",
          onClick: () => {
            onFocus?.();
          },
        },
      }
    );
  }

  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
}

// Session recovery manager for handling session-related errors
export class SessionRecoveryManager {
  private static readonly SESSION_KEY = "app_session_recovery";

  static saveSessionState(state: unknown): void {
    if (typeof window === "undefined") return;

    try {
      const sessionData = {
        state,
        timestamp: Date.now(),
        url: window.location.href,
      };

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    } catch {
      console.warn("Failed to save session state");
    }
  }

  static restoreSessionState(): unknown | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;

      const sessionData = JSON.parse(stored);

      // Clear the stored state after restoration
      sessionStorage.removeItem(this.SESSION_KEY);

      return sessionData;
    } catch {
      console.warn("Failed to restore session state");
      return null;
    }
  }

  static handleSessionExpiry(onReauth: () => void): void {
    toast.error("Your session has expired", {
      duration: 0,
      action: {
        label: "Sign In Again",
        onClick: onReauth,
      },
    });
  }

  static handleUnauthorizedAccess(redirectToLogin: () => void): void {
    toast.error("Access denied. Please sign in to continue.", {
      action: {
        label: "Sign In",
        onClick: redirectToLogin,
      },
    });
  }
}

// Recovery utilities
export const RecoveryUtils = {
  // Check if browser supports required features
  checkBrowserSupport(): {
    localStorage: boolean;
    sessionStorage: boolean;
    webSockets: boolean;
    notifications: boolean;
  } {
    if (typeof window === "undefined") {
      return {
        localStorage: false,
        sessionStorage: false,
        webSockets: false,
        notifications: false,
      };
    }

    return {
      localStorage: typeof Storage !== "undefined" && !!window.localStorage,
      sessionStorage: typeof Storage !== "undefined" && !!window.sessionStorage,
      webSockets: typeof WebSocket !== "undefined",
      notifications: "Notification" in window,
    };
  },

  // Clear all recovery data
  clearAllRecoveryData(): void {
    if (typeof window === "undefined") return;

    try {
      FormStateManager.clearExpiredStates();
      SessionRecoveryManager.restoreSessionState(); // This clears it

      // Clear any other recovery-related data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes("recovery") || key.includes("autosave")) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear recovery data:", error);
    }
  },

  // Get storage usage for recovery data
  getStorageUsage(): {
    localStorage: number;
    sessionStorage: number;
    recoveryData: number;
  } {
    if (typeof window === "undefined") {
      return { localStorage: 0, sessionStorage: 0, recoveryData: 0 };
    }

    try {
      const getStorageSize = (storage: Storage) => {
        let total = 0;
        for (const key in storage) {
          if (storage.hasOwnProperty(key)) {
            total += storage[key].length + key.length;
          }
        }
        return total;
      };

      const getRecoveryDataSize = () => {
        let total = 0;
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(FormStateManager["STORAGE_PREFIX"])) {
            const item = localStorage.getItem(key);
            if (item) {
              total += item.length + key.length;
            }
          }
        });
        return total;
      };

      return {
        localStorage: getStorageSize(localStorage),
        sessionStorage: getStorageSize(sessionStorage),
        recoveryData: getRecoveryDataSize(),
      };
    } catch (error) {
      console.warn("Failed to calculate storage usage:", error);
      return { localStorage: 0, sessionStorage: 0, recoveryData: 0 };
    }
  },
};

// Initialize recovery mechanisms
export function initializeRecoveryMechanisms(): void {
  if (typeof window === "undefined") return;

  // Clear expired form states on app start
  FormStateManager.clearExpiredStates();

  // Set up periodic cleanup
  setInterval(() => {
    FormStateManager.clearExpiredStates();
  }, 60 * 60 * 1000); // Every hour

  // Handle page unload to save current state if needed
  window.addEventListener("beforeunload", event => {
    const degradedFeatures = GracefulDegradationManager.getDegradedFeatures();
    if (degradedFeatures.length > 0) {
      event.preventDefault();
      event.returnValue =
        "Some features are currently unavailable. Are you sure you want to leave?";
    }
  });

  // Handle online/offline status
  window.addEventListener("online", () => {
    toast.success("Connection restored", {
      description: "All features are now available",
    });

    // Re-enable any degraded features that were due to network issues
    const degradedFeatures = GracefulDegradationManager.getDegradedFeatures();
    degradedFeatures.forEach(feature => {
      if (feature.includes("network") || feature.includes("api")) {
        GracefulDegradationManager.disableFeatureDegradation(feature);
      }
    });
  });

  window.addEventListener("offline", () => {
    toast.warning("Connection lost", {
      description: "Some features may be limited while offline",
    });

    GracefulDegradationManager.enableFeatureDegradation({
      feature: "network-dependent-features",
      userMessage: "Working in offline mode. Some features are limited.",
      retryEnabled: false,
    });
  });
}

// Export singleton instances
export const autoSaveManager = new AutoSaveManager();
