import { useState, useEffect, useCallback, useRef } from "react";
import {
  PetriDishData,
  GridStatistics,
  AntibioticZone,
  Bacterium,
} from "../PetriDishVisualization";

interface WebSocketMessage {
  type:
    | "spatial_update"
    | "grid_stats"
    | "antibiotic_zones"
    | "bacteria_positions"
    | "simulation_update"
    | "error";
  data: unknown;
  timestamp: number;
  error?: string;
}

export interface UsePetriDishDataOptions {
  simulationId?: string;
  autoConnect?: boolean;
  updateInterval?: number;
  enableBuffering?: boolean;
  bufferSize?: number;
}

export interface UsePetriDishDataReturn {
  data: PetriDishData | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: (simulationId: string) => void;
  disconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => void;
  refreshData: () => void;
}

const DEFAULT_DATA: PetriDishData = {
  bacteria: [],
  antibiotic_zones: [],
  grid_statistics: {
    total_bacteria: 0,
    occupied_cells: 0,
    occupancy_rate: 0,
    antibiotic_coverage: 0,
    grid_dimensions: [100, 100],
    physical_dimensions: [100, 100],
  },
  timestamp: Date.now(),
};

export const usePetriDishData = (
  options: UsePetriDishDataOptions = {}
): UsePetriDishDataReturn => {
  const {
    simulationId,
    autoConnect = false,
    updateInterval = 1000,
    enableBuffering = true,
    bufferSize = 10,
  } = options;

  const [data, setData] = useState<PetriDishData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateBufferRef = useRef<WebSocketMessage[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);

  // Get WebSocket URL
  const getWebSocketUrl = useCallback((simId: string): string => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "8000";
    return `${protocol}//${host.replace(
      ":3000",
      ""
    )}:${port}/ws/spatial/${simId}`;
  }, []);

  // Process buffered updates
  const processBufferedUpdates = useCallback(() => {
    if (updateBufferRef.current.length === 0) return;

    const now = Date.now();
    if (now - lastUpdateTimeRef.current < updateInterval) return;

    // Get the latest message for each type
    const latestMessages = updateBufferRef.current.reduce((acc, message) => {
      if (
        !acc[message.type] ||
        message.timestamp > acc[message.type].timestamp
      ) {
        acc[message.type] = message;
      }
      return acc;
    }, {} as Record<string, WebSocketMessage>);

    // Apply updates
    setData(prevData => {
      if (!prevData) return prevData;

      let newData = { ...prevData };

      // Process each type of update
      Object.values(latestMessages).forEach(message => {
        switch (message.type) {
          case "spatial_update":
            // Full spatial data update
            if (message.data && typeof message.data === "object") {
              newData = {
                ...newData,
                ...message.data,
                timestamp: message.timestamp,
              };
            }
            break;

          case "bacteria_positions":
            // Update only bacterial positions
            if (message.data && typeof message.data === "object") {
              const data = message.data as { bacteria?: Bacterium[] };
              newData = {
                ...newData,
                bacteria: data.bacteria || [],
                timestamp: message.timestamp,
              };
            }
            break;

          case "grid_stats":
            // Update grid statistics
            if (message.data && typeof message.data === "object") {
              newData = {
                ...newData,
                grid_statistics:
                  (message.data as GridStatistics) ||
                  DEFAULT_DATA.grid_statistics,
                timestamp: message.timestamp,
              };
            }
            break;

          case "antibiotic_zones":
            // Update antibiotic zones
            if (message.data && typeof message.data === "object") {
              newData = {
                ...newData,
                antibiotic_zones: (message.data as AntibioticZone[]) || [],
                timestamp: message.timestamp,
              };
            }
            break;
        }
      });

      return newData;
    });

    // Clear buffer and update timestamp
    updateBufferRef.current = [];
    lastUpdateTimeRef.current = now;
  }, [updateInterval]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle different message types
        if (message.type === "spatial_update" && message.data) {
          const messageData = message.data as Record<string, unknown>;

          // Handle spatial data updates
          if (messageData.type === "spatial_update") {
            const newData: PetriDishData = {
              bacteria: (messageData.bacteria as Bacterium[]) || [],
              antibiotic_zones:
                (messageData.antibiotic_zones as AntibioticZone[]) || [],
              grid_statistics:
                (messageData.grid_statistics as GridStatistics) ||
                DEFAULT_DATA.grid_statistics,
              timestamp:
                typeof messageData.timestamp === "number"
                  ? messageData.timestamp
                  : Date.now(),
            };

            if (enableBuffering) {
              // Add to buffer
              updateBufferRef.current.push(message);
              if (updateBufferRef.current.length > bufferSize) {
                updateBufferRef.current.shift();
              }
            } else {
              // Update immediately
              setData(newData);
            }
          }

          // Handle spatial initialization
          else if (messageData.type === "spatial_initialization") {
            console.log("Spatial grid initialized:", messageData);

            // Update grid statistics with initialization data
            if (
              messageData.grid_dimensions &&
              Array.isArray(messageData.grid_dimensions)
            ) {
              const [width, height] = messageData.grid_dimensions as [
                number,
                number
              ];
              setData(prev =>
                prev
                  ? {
                      ...prev,
                      grid_statistics: {
                        ...prev.grid_statistics,
                        grid_dimensions: [width, height],
                        physical_dimensions: [width, height],
                      },
                    }
                  : DEFAULT_DATA
              );
            }
          }
        }

        // Handle simulation updates with spatial data
        else if (message.type === "simulation_update" && message.data) {
          const messageData = message.data as Record<string, unknown>;

          if (messageData.spatial_data) {
            const spatialData = messageData.spatial_data as Record<
              string,
              unknown
            >;
            const newData: PetriDishData = {
              bacteria: (spatialData.bacteria as Bacterium[]) || [],
              antibiotic_zones:
                (spatialData.antibiotic_zones as AntibioticZone[]) || [],
              grid_statistics:
                (spatialData.grid_statistics as GridStatistics) ||
                DEFAULT_DATA.grid_statistics,
              timestamp:
                typeof spatialData.timestamp === "number"
                  ? spatialData.timestamp
                  : Date.now(),
            };

            if (enableBuffering) {
              updateBufferRef.current.push(message);
              if (updateBufferRef.current.length > bufferSize) {
                updateBufferRef.current.shift();
              }
            } else {
              setData(newData);
            }
          }
        }

        // Handle errors
        else if (message.type === "error") {
          console.error("WebSocket error:", message.error || message.data);
          setError(message.error || "Unknown WebSocket error");
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
        setError("Failed to parse message from server");
      }
    },
    [enableBuffering, bufferSize]
  );

  // Connect to WebSocket
  const connect = useCallback(
    (simId: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      setIsLoading(true);
      setError(null);

      try {
        const wsUrl = getWebSocketUrl(simId);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Connected to spatial WebSocket");
          setIsConnected(true);
          setIsLoading(false);
          setError(null);

          // Request initial spatial data using the backend protocol
          ws.send(
            JSON.stringify({
              type: "get_spatial_data",
              simulation_id: simId,
              data: { type: "get_spatial_data" },
              timestamp: new Date().toISOString(),
            })
          );
        };

        ws.onmessage = handleMessage;

        ws.onerror = error => {
          console.error("WebSocket error:", error);
          setError("Connection error occurred");
          setIsLoading(false);
        };

        ws.onclose = event => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          setIsConnected(false);
          setIsLoading(false);

          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && !reconnectTimeoutRef.current) {
            console.log("Attempting to reconnect in 3 seconds...");
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connect(simId);
            }, 3000);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.error("Failed to connect to WebSocket:", err);
        setError("Failed to establish connection");
        setIsLoading(false);
      }
    },
    [getWebSocketUrl, handleMessage]
  );

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsLoading(false);
  }, []);

  // Send message to WebSocket
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket not connected");
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && simulationId) {
      sendMessage({
        type: "get_spatial_data",
        simulation_id: simulationId,
      });
    }
  }, [sendMessage, simulationId]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && simulationId) {
      connect(simulationId);
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, simulationId, connect, disconnect]);

  // Process buffered updates periodically
  useEffect(() => {
    if (!enableBuffering) return;

    const interval = setInterval(processBufferedUpdates, updateInterval);
    return () => clearInterval(interval);
  }, [enableBuffering, updateInterval, processBufferedUpdates]);

  // Initialize with default data
  useEffect(() => {
    if (!data) {
      setData(DEFAULT_DATA);
    }
  }, [data]);

  return {
    data,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    sendMessage,
    refreshData,
  };
};

export default usePetriDishData;
