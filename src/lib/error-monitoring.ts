import { toast } from "sonner";
import { AppError, ErrorCategory, ErrorSeverity } from "./error-handling";

// Additional type definitions for browser APIs
interface PerformanceWithMemory extends Performance {
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    type?: string;
    effectiveType?: string;
  };
}

type BreadcrumbLevel = "debug" | "info" | "warning" | "error";

// Types for error monitoring
export interface ErrorReport {
  id: string;
  timestamp: number;
  error: AppError;
  context: ErrorContext;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  stackTrace?: string;
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
  fingerprint: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  formData?: Record<string, unknown>;
  apiEndpoint?: string;
  websocketEvent?: string;
  simulationId?: string;
  userInput?: Record<string, unknown>;
  networkStatus?: "online" | "offline";
  browserInfo?: BrowserInfo;
  performanceMetrics?: PerformanceMetrics;
}

export interface Breadcrumb {
  timestamp: number;
  category: "navigation" | "user" | "api" | "websocket" | "error" | "info";
  message: string;
  level: "debug" | "info" | "warning" | "error";
  data?: Record<string, unknown>;
}

export interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  timezone: string;
}

export interface PerformanceMetrics {
  loadTime?: number;
  renderTime?: number;
  memoryUsage?: number;
  connectionType?: string;
  effectiveType?: string;
}

export interface ErrorAggregation {
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: Set<string>;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stackTrace?: string;
  contexts: ErrorContext[];
  tags: Record<string, string>;
}

export interface MonitoringConfig {
  enabled: boolean;
  maxBreadcrumbs: number;
  maxReports: number;
  reportingInterval: number;
  enablePerformanceMonitoring: boolean;
  enableUserInteractionTracking: boolean;
  enableNetworkMonitoring: boolean;
  enableConsoleCapture: boolean;
  sampleRate: number;
  environment: "development" | "staging" | "production";
  release?: string;
  dsn?: string; // For external services like Sentry
}

// Error Monitoring System
export class ErrorMonitoringSystem {
  private static instance: ErrorMonitoringSystem;
  private config: MonitoringConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorAggregations: Map<string, ErrorAggregation> = new Map();
  private sessionId: string;
  private userId?: string;
  private isInitialized = false;

  private constructor(config: MonitoringConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
  }

  static getInstance(config?: MonitoringConfig): ErrorMonitoringSystem {
    if (!ErrorMonitoringSystem.instance) {
      if (!config) {
        throw new Error(
          "ErrorMonitoringSystem must be initialized with config"
        );
      }
      ErrorMonitoringSystem.instance = new ErrorMonitoringSystem(config);
    }
    return ErrorMonitoringSystem.instance;
  }

  initialize(): void {
    if (this.isInitialized || !this.config.enabled) return;

    this.setupGlobalErrorHandlers();
    this.setupPerformanceMonitoring();
    this.setupUserInteractionTracking();
    this.setupNetworkMonitoring();
    this.setupConsoleCapture();
    this.setupPeriodicReporting();

    this.addBreadcrumb({
      category: "info",
      message: "Error monitoring system initialized",
      level: "info",
    });

    this.isInitialized = true;
  }

  // Core error reporting
  captureError(error: AppError, context: ErrorContext = {}): string {
    if (
      !this.config.enabled ||
      !this.shouldSample() ||
      typeof window === "undefined"
    ) {
      return "";
    }

    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      error,
      context: {
        ...context,
        browserInfo: this.getBrowserInfo(),
        performanceMetrics: this.getPerformanceMetrics(),
        networkStatus: navigator.onLine ? "online" : "offline",
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
      stackTrace: error.stack,
      breadcrumbs: [...this.breadcrumbs],
      tags: this.generateTags(error, context),
      fingerprint: this.generateFingerprint(error, context),
    };

    this.errorReports.set(errorReport.id, errorReport);
    this.aggregateError(errorReport);
    this.addBreadcrumb({
      category: "error",
      message: `Error captured: ${error.message}`,
      level: "error",
      data: { errorId: errorReport.id, category: error.category },
    });

    // Send to external service if configured
    this.sendToExternalService(errorReport);

    // Cleanup old reports
    this.cleanupOldReports();

    return errorReport.id;
  }

  // Breadcrumb management
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
    if (!this.config.enabled) return;

    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  // User context management
  setUser(userId: string, userData?: Record<string, unknown>): void {
    this.userId = userId;
    this.addBreadcrumb({
      category: "user",
      message: `User identified: ${userId}`,
      level: "info",
      data: userData,
    });
  }

  clearUser(): void {
    this.userId = undefined;
    this.addBreadcrumb({
      category: "user",
      message: "User cleared",
      level: "info",
    });
  }

  // Error aggregation and analysis
  private aggregateError(errorReport: ErrorReport): void {
    const { fingerprint } = errorReport;

    if (this.errorAggregations.has(fingerprint)) {
      const aggregation = this.errorAggregations.get(fingerprint)!;
      aggregation.count++;
      aggregation.lastSeen = errorReport.timestamp;
      aggregation.contexts.push(errorReport.context);

      if (errorReport.userId) {
        aggregation.affectedUsers.add(errorReport.userId);
      }
    } else {
      const aggregation: ErrorAggregation = {
        fingerprint,
        count: 1,
        firstSeen: errorReport.timestamp,
        lastSeen: errorReport.timestamp,
        affectedUsers: new Set(errorReport.userId ? [errorReport.userId] : []),
        severity: errorReport.error.severity,
        category: errorReport.error.category,
        message: errorReport.error.message,
        stackTrace: errorReport.stackTrace,
        contexts: [errorReport.context],
        tags: errorReport.tags,
      };

      this.errorAggregations.set(fingerprint, aggregation);
    }
  }

  // Reporting and analytics
  generateErrorReport(): {
    summary: {
      totalErrors: number;
      uniqueErrors: number;
      criticalErrors: number;
      affectedUsers: number;
      timeRange: { start: number; end: number };
    };
    topErrors: Array<{
      fingerprint: string;
      message: string;
      count: number;
      severity: ErrorSeverity;
      category: ErrorCategory;
      affectedUsers: number;
      lastSeen: number;
    }>;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: ErrorReport[];
  } {
    const reports = Array.from(this.errorReports.values());
    const aggregations = Array.from(this.errorAggregations.values());

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentReports = reports.filter(r => r.timestamp > oneHourAgo);

    const allAffectedUsers = new Set<string>();
    aggregations.forEach(agg => {
      agg.affectedUsers.forEach(user => allAffectedUsers.add(user));
    });

    const topErrors = aggregations
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(agg => ({
        fingerprint: agg.fingerprint,
        message: agg.message,
        count: agg.count,
        severity: agg.severity,
        category: agg.category,
        affectedUsers: agg.affectedUsers.size,
        lastSeen: agg.lastSeen,
      }));

    const errorsByCategory = reports.reduce((acc, report) => {
      acc[report.error.category] = (acc[report.error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = reports.reduce((acc, report) => {
      acc[report.error.severity] = (acc[report.error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      summary: {
        totalErrors: reports.length,
        uniqueErrors: aggregations.length,
        criticalErrors: reports.filter(
          r => r.error.severity === ErrorSeverity.CRITICAL
        ).length,
        affectedUsers: allAffectedUsers.size,
        timeRange: {
          start: Math.min(...reports.map(r => r.timestamp)),
          end: Math.max(...reports.map(r => r.timestamp)),
        },
      },
      topErrors,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: recentReports.slice(-20),
    };
  }

  // Setup methods
  private setupGlobalErrorHandlers(): void {
    // Unhandled JavaScript errors
    window.addEventListener("error", event => {
      const error = new AppError(
        event.message || "Unhandled JavaScript error",
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        "UNHANDLED_JS_ERROR",
        { originalError: event.error }
      );

      this.captureError(error, {
        component: "global",
        action: "unhandled_error",
        userInput: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled Promise rejections
    window.addEventListener("unhandledrejection", event => {
      const error = new AppError(
        `Unhandled Promise rejection: ${event.reason}`,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        "UNHANDLED_PROMISE_REJECTION",
        { originalError: event.reason }
      );

      this.captureError(error, {
        component: "global",
        action: "unhandled_promise_rejection",
      });
    });
  }

  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // Monitor page load performance
    window.addEventListener("load", () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.addBreadcrumb({
            category: "info",
            message: "Page load completed",
            level: "info",
            data: {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded:
                navigation.domContentLoadedEventEnd -
                navigation.domContentLoadedEventStart,
              firstPaint:
                performance.getEntriesByName("first-paint")[0]?.startTime,
              firstContentfulPaint: performance.getEntriesByName(
                "first-contentful-paint"
              )[0]?.startTime,
            },
          });
        }
      }, 0);
    });

    // Monitor memory usage (if available)
    if ("memory" in performance) {
      setInterval(() => {
        const memory = (performance as PerformanceWithMemory).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          this.addBreadcrumb({
            category: "info",
            message: "High memory usage detected",
            level: "warning",
            data: {
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
            },
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private setupUserInteractionTracking(): void {
    if (!this.config.enableUserInteractionTracking) return;

    // Track clicks on important elements
    document.addEventListener("click", event => {
      const target = event.target as HTMLElement;
      if (target.matches('button, a, [role="button"]')) {
        this.addBreadcrumb({
          category: "user",
          message: `Clicked: ${target.textContent?.trim() || target.tagName}`,
          level: "info",
          data: {
            tagName: target.tagName,
            className: target.className,
            id: target.id,
          },
        });
      }
    });

    // Track form submissions
    document.addEventListener("submit", event => {
      const form = event.target as HTMLFormElement;
      this.addBreadcrumb({
        category: "user",
        message: `Form submitted: ${form.id || form.className || "unnamed"}`,
        level: "info",
        data: {
          formId: form.id,
          action: form.action,
          method: form.method,
        },
      });
    });

    // Track navigation
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        this.addBreadcrumb({
          category: "navigation",
          message: `Navigated to: ${window.location.pathname}`,
          level: "info",
          data: {
            from: currentUrl,
            to: window.location.href,
          },
        });
        currentUrl = window.location.href;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private setupNetworkMonitoring(): void {
    if (!this.config.enableNetworkMonitoring) return;

    // Monitor online/offline status
    window.addEventListener("online", () => {
      this.addBreadcrumb({
        category: "info",
        message: "Network connection restored",
        level: "info",
      });
    });

    window.addEventListener("offline", () => {
      this.addBreadcrumb({
        category: "info",
        message: "Network connection lost",
        level: "warning",
      });
    });

    // Monitor fetch requests (if not already handled by API client)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      let url: string;
      if (typeof args[0] === "string") {
        url = args[0];
      } else if (args[0] instanceof URL) {
        url = args[0].href;
      } else {
        // Request object
        url = args[0].url;
      }

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        this.addBreadcrumb({
          category: "api",
          message: `HTTP ${response.status}: ${url}`,
          level: response.ok ? "info" : "warning",
          data: {
            url,
            status: response.status,
            duration,
            method: args[1]?.method || "GET",
          },
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        this.addBreadcrumb({
          category: "api",
          message: `HTTP Error: ${url}`,
          level: "error",
          data: {
            url,
            duration,
            error: error instanceof Error ? error.message : String(error),
            method: args[1]?.method || "GET",
          },
        });

        throw error;
      }
    };
  }

  private setupConsoleCapture(): void {
    if (!this.config.enableConsoleCapture) return;

    const originalMethods = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    (["error", "warn", "info", "debug"] as const).forEach(level => {
      const originalMethod = originalMethods[level];
      console[level] = (...args: unknown[]) => {
        this.addBreadcrumb({
          category: "info",
          message: `Console ${level}: ${args.join(" ")}`,
          level: level as BreadcrumbLevel,
          data: { args },
        });

        originalMethod.apply(console, args);
      };
    });
  }

  private setupPeriodicReporting(): void {
    if (this.config.reportingInterval > 0) {
      setInterval(() => {
        this.sendPeriodicReport();
      }, this.config.reportingInterval);
    }
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: AppError, context: ErrorContext): string {
    const components = [
      error.category,
      error.message.replace(/\d+/g, "X"), // Replace numbers with X for grouping
      context.component || "unknown",
      context.action || "unknown",
    ];

    return btoa(components.join("|"))
      .replace(/[^a-zA-Z0-9]/g, "")
      .substr(0, 16);
  }

  private generateTags(
    error: AppError,
    context: ErrorContext
  ): Record<string, string> {
    return {
      category: error.category,
      severity: error.severity,
      component: context.component || "unknown",
      action: context.action || "unknown",
      environment: this.config.environment,
      release: this.config.release || "unknown",
      browser: this.getBrowserName(),
      os: this.getOSName(),
    };
  }

  private getBrowserInfo(): BrowserInfo {
    if (typeof window === "undefined") {
      return {
        userAgent: "SSR",
        language: "en",
        platform: "server",
        cookieEnabled: false,
        onLine: false,
        viewport: { width: 0, height: 0 },
        screen: { width: 0, height: 0 },
        timezone: "UTC",
      };
    }

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    if (typeof window === "undefined") {
      return {};
    }

    const metrics: PerformanceMetrics = {};

    if ("memory" in performance) {
      const memory = (performance as PerformanceWithMemory).memory;
      metrics.memoryUsage = memory.usedJSHeapSize;
    }

    if ("connection" in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection;
      if (connection) {
        metrics.connectionType = connection.type;
        metrics.effectiveType = connection.effectiveType;
      }
    }

    return metrics;
  }

  private getBrowserName(): string {
    if (typeof window === "undefined") return "SSR";

    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown";
  }

  private getOSName(): string {
    if (typeof window === "undefined") return "Server";

    const platform = navigator.platform;
    if (platform.includes("Win")) return "Windows";
    if (platform.includes("Mac")) return "macOS";
    if (platform.includes("Linux")) return "Linux";
    if (platform.includes("iPhone") || platform.includes("iPad")) return "iOS";
    if (platform.includes("Android")) return "Android";
    return "Unknown";
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private cleanupOldReports(): void {
    if (this.errorReports.size > this.config.maxReports) {
      const reports = Array.from(this.errorReports.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      );

      const toDelete = reports.slice(
        0,
        reports.length - this.config.maxReports
      );
      toDelete.forEach(([id]) => this.errorReports.delete(id));
    }
  }

  private async sendToExternalService(errorReport: ErrorReport): Promise<void> {
    if (!this.config.dsn) return;

    try {
      // This would integrate with services like Sentry, LogRocket, etc.
      // For now, we'll just log to console in development
      if (this.config.environment === "development") {
        console.group(`🚨 Error Report: ${errorReport.error.message}`);
        console.log("Error:", errorReport.error);
        console.log("Context:", errorReport.context);
        console.log("Breadcrumbs:", errorReport.breadcrumbs);
        console.groupEnd();
      }
    } catch (error) {
      console.warn("Failed to send error report to external service:", error);
    }
  }

  private sendPeriodicReport(): void {
    const report = this.generateErrorReport();

    // Send summary to analytics or monitoring service
    if (this.config.environment === "development") {
      console.log("📊 Periodic Error Report:", report.summary);
    }
  }

  // Public API methods
  getErrorReports(): ErrorReport[] {
    return Array.from(this.errorReports.values());
  }

  getErrorAggregations(): ErrorAggregation[] {
    return Array.from(this.errorAggregations.values());
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  clearAllData(): void {
    this.errorReports.clear();
    this.errorAggregations.clear();
    this.breadcrumbs = [];
    this.addBreadcrumb({
      category: "info",
      message: "Error monitoring data cleared",
      level: "info",
    });
  }

  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default configuration
export const defaultMonitoringConfig: MonitoringConfig = {
  enabled: true,
  maxBreadcrumbs: 100,
  maxReports: 1000,
  reportingInterval: 300000, // 5 minutes
  enablePerformanceMonitoring: true,
  enableUserInteractionTracking: true,
  enableNetworkMonitoring: true,
  enableConsoleCapture: false, // Disabled by default to avoid noise
  sampleRate: 1.0, // 100% in development, should be lower in production
  environment:
    (process.env.NODE_ENV as "development" | "staging" | "production") ||
    "development",
  release: process.env.REACT_APP_VERSION || "1.0.0",
};

// Error monitoring utilities
export const ErrorMonitoringUtils = {
  // Initialize with custom config
  initialize(config?: Partial<MonitoringConfig>): ErrorMonitoringSystem {
    const finalConfig = { ...defaultMonitoringConfig, ...config };
    const monitor = ErrorMonitoringSystem.getInstance(finalConfig);
    monitor.initialize();
    return monitor;
  },

  // Get current instance
  getInstance(): ErrorMonitoringSystem | null {
    try {
      return ErrorMonitoringSystem.getInstance();
    } catch {
      return null;
    }
  },

  // Quick error capture
  captureError(error: Error | AppError, context?: ErrorContext): string {
    const monitor = this.getInstance();
    if (!monitor) return "";

    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            ErrorCategory.SYSTEM,
            ErrorSeverity.MEDIUM,
            "CAPTURED_ERROR",
            { originalError: error }
          );

    return monitor.captureError(appError, context);
  },

  // Quick breadcrumb
  addBreadcrumb(
    message: string,
    category: Breadcrumb["category"] = "info",
    data?: Record<string, unknown>
  ): void {
    const monitor = this.getInstance();
    if (!monitor) return;

    monitor.addBreadcrumb({
      category,
      message,
      level: "info",
      data,
    });
  },

  // Generate and display error report
  showErrorReport(): void {
    const monitor = this.getInstance();
    if (!monitor) return;

    const report = monitor.generateErrorReport();

    toast.info("Error Report Generated", {
      description: `${report.summary.totalErrors} total errors, ${report.summary.uniqueErrors} unique`,
      action: {
        label: "View Details",
        onClick: () => {
          console.group("📊 Error Monitoring Report");
          console.log("Summary:", report.summary);
          console.log("Top Errors:", report.topErrors);
          console.log("By Category:", report.errorsByCategory);
          console.log("By Severity:", report.errorsBySeverity);
          console.groupEnd();
        },
      },
    });
  },
};
