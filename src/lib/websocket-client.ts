import { z } from "zod";
import {
  WebSocketErrorHandler,
  AppError,
  ErrorCategory,
  ErrorSeverity,
} from "./error-handling";
import { WebSocketProtocolMessageSchema } from "./schemas/websocket";
import { notifications } from "@/components/ui/notification-system";

// WebSocket connection states
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
}

// WebSocket client configuration
export interface WebSocketClientConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  messageTimeout: number;
  validateMessages: boolean;
}

const DEFAULT_WS_CONFIG: WebSocketClientConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws",
  protocols: [],
  reconnectAttempts: 3, // Reduced from 5 to prevent excessive retries
  reconnectDelay: 2000, // Increased initial delay to 2 seconds
  heartbeatInterval: 60000, // Increased to 60 seconds to match backend
  messageTimeout: 15000, // Increased timeout for slower connections
  validateMessages: true,
};

// Message types for type safety
export interface OutgoingMessage {
  type: string;
  payload?: Record<string, unknown>;
  id?: string;
}

export interface IncomingMessage {
  type: string;
  payload?: Record<string, unknown>;
  id?: string;
  timestamp?: string;
}

// Event handlers interface
export interface WebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onMessage?: (message: IncomingMessage) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
  onStateChange?: (state: ConnectionState) => void;
}

export class WebSocketClient {
  private config: WebSocketClientConfig;
  private socket: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private errorHandler: WebSocketErrorHandler;
  private handlers: WebSocketEventHandlers = {};
  private messageQueue: OutgoingMessage[] = [];
  private pendingMessages: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private lastConnectionTime = 0; // Track when last connection was established
  private connectionStabilityThreshold = 5000; // Minimum time for stable connection (5s)

  constructor(config: Partial<WebSocketClientConfig> = {}) {
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
    this.errorHandler = new WebSocketErrorHandler();
  }

  // Set event handlers
  setEventHandlers(handlers: WebSocketEventHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Get current connection state
  getState(): ConnectionState {
    return this.state;
  }

  // Check if connected
  isConnected(): boolean {
    return (
      this.state === ConnectionState.CONNECTED &&
      this.socket?.readyState === WebSocket.OPEN
    );
  }

  // Connect to WebSocket server
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTING || this.isConnected()) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      this.socket = new WebSocket(this.config.url, this.config.protocols);
      this.setupSocketEventListeners();

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new AppError(
              "WebSocket connection timeout",
              ErrorCategory.WEBSOCKET,
              ErrorSeverity.MEDIUM,
              "CONNECTION_TIMEOUT"
            )
          );
        }, 10000);

        this.socket!.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.socket!.onerror = event => {
          clearTimeout(timeout);
          reject(this.errorHandler.handleConnectionError(event));
        };
      });
    } catch (error) {
      this.setState(ConnectionState.FAILED);
      this.handleConnectionError(error);
      throw error;
    }
  }

  // Disconnect from WebSocket server
  disconnect(reason?: string): void {
    this.clearReconnectTimeout();
    this.clearHeartbeat();
    this.setState(ConnectionState.DISCONNECTED);

    if (this.socket) {
      this.socket.close(1000, reason || "Client disconnect");
      this.socket = null;
    }

    this.handlers.onDisconnect?.(reason);
  }

  // Send message to server
  async sendMessage(
    message: OutgoingMessage,
    waitForResponse = false
  ): Promise<unknown> {
    if (!this.isConnected()) {
      if (this.state === ConnectionState.DISCONNECTED) {
        await this.connect();
      } else {
        this.messageQueue.push(message);
        throw new AppError(
          "WebSocket not connected. Message queued.",
          ErrorCategory.WEBSOCKET,
          ErrorSeverity.LOW,
          "NOT_CONNECTED"
        );
      }
    }

    // Validate message if enabled
    if (this.config.validateMessages) {
      try {
        WebSocketProtocolMessageSchema.parse(message);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new AppError(
            "Invalid message format",
            ErrorCategory.VALIDATION,
            ErrorSeverity.MEDIUM,
            "INVALID_MESSAGE",
            { validationErrors: error.errors }
          );
        }
      }
    }

    const messageWithId = {
      ...message,
      id: message.id || this.generateMessageId(),
    };

    try {
      this.socket!.send(JSON.stringify(messageWithId));

      if (waitForResponse) {
        return this.waitForResponse(messageWithId.id!);
      }
    } catch (error) {
      const wsError = this.errorHandler.handleMessageError(error);
      throw new AppError(
        wsError.message,
        ErrorCategory.WEBSOCKET,
        ErrorSeverity.MEDIUM,
        wsError.code
      );
    }
  }

  // Wait for a response to a specific message
  private waitForResponse(messageId: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(
          new AppError(
            "Message response timeout",
            ErrorCategory.WEBSOCKET,
            ErrorSeverity.MEDIUM,
            "RESPONSE_TIMEOUT"
          )
        );
      }, this.config.messageTimeout);

      this.pendingMessages.set(messageId, {
        resolve,
        reject,
        timeout,
      });
    });
  }

  // Setup WebSocket event listeners
  private setupSocketEventListeners(): void {
    if (!this.socket) return;
    this.socket.onopen = () => {
      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.lastConnectionTime = Date.now(); // Track connection time
      this.errorHandler.resetReconnectAttempts();
      this.startHeartbeat();
      this.flushMessageQueue();
      this.handlers.onConnect?.();

      notifications.success({
        title: "Connected",
        description: "Successfully connected to the simulation server.",
        duration: 3000,
      });
    };

    this.socket.onclose = event => {
      this.clearHeartbeat();

      if (event.code !== 1000) {
        // Not a normal closure
        this.handleDisconnection(event);
      } else {
        this.setState(ConnectionState.DISCONNECTED);
        this.handlers.onDisconnect?.(event.reason);
      }
    };

    this.socket.onerror = event => {
      const error = this.errorHandler.handleConnectionError(event);
      this.handleConnectionError(error);
    };

    this.socket.onmessage = event => {
      this.handleIncomingMessage(event.data);
    };
  }

  // Handle incoming messages
  private handleIncomingMessage(data: string): void {
    try {
      const message: IncomingMessage = JSON.parse(data);

      // Validate message if enabled
      if (this.config.validateMessages) {
        try {
          WebSocketProtocolMessageSchema.parse(message);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const wsError = this.errorHandler.handleMessageError(message);
            const appError = new AppError(
              wsError.message,
              ErrorCategory.WEBSOCKET,
              ErrorSeverity.MEDIUM,
              wsError.code
            );
            this.handlers.onError?.(appError);
            return;
          }
        }
      }

      // Handle response correlation
      if (message.id && this.pendingMessages.has(message.id)) {
        const { resolve, timeout } = this.pendingMessages.get(message.id)!;
        clearTimeout(timeout);
        this.pendingMessages.delete(message.id);
        resolve(message);
        return;
      }

      // Handle heartbeat
      if (message.type === "pong") {
        return; // Heartbeat acknowledged
      }

      // Pass message to handler
      this.handlers.onMessage?.(message);
    } catch (_error) {
      const wsError = this.errorHandler.handleMessageError(data);
      const appError = new AppError(
        wsError.message,
        ErrorCategory.WEBSOCKET,
        ErrorSeverity.MEDIUM,
        wsError.code
      );
      this.handlers.onError?.(appError);
    }
  }

  // Handle connection errors
  private handleConnectionError(error: unknown): void {
    this.setState(ConnectionState.FAILED);

    const appError = AppError.fromUnknown(
      error,
      "WebSocket connection error",
      ErrorCategory.WEBSOCKET
    );

    notifications.error({
      title: "Connection Error",
      description: appError.message,
      duration: 5000,
    });

    this.handlers.onError?.(appError);

    // Attempt reconnection
    this.attemptReconnection();
  } // Handle WebSocket disconnection
  private handleDisconnection(event: CloseEvent): void {
    this.setState(ConnectionState.DISCONNECTED);
    this.clearHeartbeat();

    // Log disconnect for debugging
    console.debug("WebSocket disconnected:", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    // Handle different close codes appropriately
    const isCleanClose = event.code === 1000 || event.code === 1001;
    const isServerShutdown = event.code === 1001;

    // Don't show notification for clean disconnections
    if (!isCleanClose) {
      notifications.warning({
        title: "Connection Lost",
        description: "Lost connection to the simulation server.",
        duration: 4000,
      });
    }

    this.handlers.onDisconnect?.(event.reason); // Only attempt reconnection for unexpected disconnections
    // Avoid reconnecting on clean shutdowns or explicit client disconnects
    if (
      !isCleanClose &&
      !isServerShutdown &&
      this.state !== ConnectionState.FAILED
    ) {
      // Check if connection was stable enough to warrant reconnection
      const connectionDuration = Date.now() - this.lastConnectionTime;
      if (connectionDuration < this.connectionStabilityThreshold) {
        // Connection was too short, increase delay before reconnection
        console.warn(
          `Connection lasted only ${connectionDuration}ms, delaying reconnection`
        );
        setTimeout(() => {
          if (this.state === ConnectionState.DISCONNECTED) {
            this.attemptReconnection();
          }
        }, 3000); // Wait 3 seconds for unstable connections
      } else {
        // Normal reconnection for stable connections
        setTimeout(() => {
          if (this.state === ConnectionState.DISCONNECTED) {
            this.attemptReconnection();
          }
        }, 1000);
      }
    }
  }
  // Attempt to reconnect
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.setState(ConnectionState.FAILED);
      this.handlers.onReconnectFailed?.();

      notifications.error({
        title: "Connection Failed",
        description:
          "Unable to reconnect to the server. Please refresh the page.",
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
      return;
    }

    this.setState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;

    // More conservative exponential backoff
    const baseDelay = this.config.reconnectDelay;
    const exponentialDelay =
      baseDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    const maxDelay = 30000; // Cap at 30 seconds
    const delay = Math.min(exponentialDelay, maxDelay);

    notifications.info({
      title: "Reconnecting",
      description: `Attempting to reconnect in ${Math.round(
        delay / 1000
      )}s... (${this.reconnectAttempts}/${this.config.reconnectAttempts})`,
      duration: Math.min(delay, 5000),
    });

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        this.handlers.onReconnect?.(this.reconnectAttempts);
      } catch {
        this.attemptReconnection();
      }
    }, delay);
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ type: "ping" }, false);
      }
    }, this.config.heartbeatInterval);
  }

  // Clear heartbeat interval
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Clear reconnection timeout
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Flush queued messages
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message);
    }
  }

  // Set connection state and notify handlers
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.handlers.onStateChange?.(state);
    }
  }

  // Generate unique message ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up resources
  destroy(): void {
    this.disconnect("Client destroyed");
    this.clearReconnectTimeout();
    this.clearHeartbeat();

    // Clear pending messages
    this.pendingMessages.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(
        new AppError(
          "WebSocket client destroyed",
          ErrorCategory.WEBSOCKET,
          ErrorSeverity.LOW,
          "CLIENT_DESTROYED"
        )
      );
    });
    this.pendingMessages.clear();
  }
}

// Simulation-specific WebSocket client
export class SimulationWebSocketClient extends WebSocketClient {
  async startSimulation(parameters: Record<string, unknown>): Promise<unknown> {
    return this.sendMessage(
      {
        type: "start_simulation",
        payload: parameters,
      },
      true
    );
  }

  async stopSimulation(simulationId: string): Promise<unknown> {
    return this.sendMessage(
      {
        type: "stop_simulation",
        payload: { simulation_id: simulationId },
      },
      true
    );
  }

  async pauseSimulation(simulationId: string): Promise<unknown> {
    return this.sendMessage(
      {
        type: "pause_simulation",
        payload: { simulation_id: simulationId },
      },
      true
    );
  }

  async resumeSimulation(simulationId: string): Promise<unknown> {
    return this.sendMessage(
      {
        type: "resume_simulation",
        payload: { simulation_id: simulationId },
      },
      true
    );
  }

  async getSimulationStatus(simulationId: string): Promise<unknown> {
    return this.sendMessage(
      {
        type: "get_status",
        payload: { simulation_id: simulationId },
      },
      true
    );
  }

  subscribeToUpdates(simulationId: string): void {
    this.sendMessage({
      type: "subscribe_updates",
      payload: { simulation_id: simulationId },
    });
  }

  unsubscribeFromUpdates(simulationId: string): void {
    this.sendMessage({
      type: "unsubscribe_updates",
      payload: { simulation_id: simulationId },
    });
  }
}

// Create and export default instance
export const simulationWebSocket = new SimulationWebSocketClient();
