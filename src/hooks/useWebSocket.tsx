import { useEffect, useRef, useState, useCallback } from "react";

export interface WebSocketMessage {
  data: string;
  timestamp: number;
  type?: string;
}

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "error";

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  lastMessage: WebSocketMessage | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  sendMessage: (message: string) => void;
  reconnect: () => void;
}

interface UseWebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [reconnectCount, setReconnectCount] = useState(0);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const socketRef = useRef<WebSocket | null>(null);
  const isManualClose = useRef(false);

  const isConnected = connectionState === "connected";

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState("connecting");

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;
      setSocket(ws);

      ws.onopen = event => {
        setConnectionState("connected");
        setReconnectCount(0);
        onOpen?.(event);
      };

      ws.onclose = event => {
        setConnectionState("disconnected");
        setSocket(null);
        socketRef.current = null;
        onClose?.(event);

        // Auto-reconnect unless manually closed
        if (!isManualClose.current && reconnectCount < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = event => {
        setConnectionState("error");
        onError?.(event);
        console.error("WebSocket error:", event);
      };

      ws.onmessage = event => {
        const message: WebSocketMessage = {
          data: event.data,
          timestamp: Date.now(),
          type: (() => {
            try {
              const parsed = JSON.parse(event.data);
              return parsed.type;
            } catch {
              return undefined;
            }
          })(),
        };

        setLastMessage(message);
        onMessage?.(message);
      };
    } catch (error) {
      setConnectionState("error");
      console.error("Failed to create WebSocket:", error);
    }
  }, [
    url,
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectAttempts,
    reconnectCount,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    isManualClose.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (socketRef.current) {
      setConnectionState("disconnecting");
      socketRef.current.close();
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }, []);

  const reconnect = useCallback(() => {
    isManualClose.current = false;
    setReconnectCount(0);
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Initial connection
  useEffect(() => {
    isManualClose.current = false;
    connect();

    return () => {
      isManualClose.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isManualClose.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    socket,
    lastMessage,
    connectionState,
    isConnected,
    sendMessage,
    reconnect,
  };
};
