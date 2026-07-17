/**
 * StadiumOS AI — WebSockets Real-Time Sync Provider.
 * 
 * Subscribes to the backend WS gateway, catches telemetry events,
 * and invalidates TanStack React Query keys to update the UI instantly.
 * Employs automatic reconnect backoff triggers.
 */

import React, { createContext, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WebSocketContext = createContext<null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connectSocket = () => {
    const token = localStorage.getItem("stadiumos-access-token");
    if (!token) return;

    // Build URL pointing to backend gateway WebSocket
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
    const ws = new WebSocket(`${wsUrl}?token=${token}`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected successfully.");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("Real-time telemetry event received:", payload);

        // Map events to Query Client cache invalidation rules
        if (payload.type === "INCIDENT_REPORTED" || payload.type === "INCIDENT_RESOLVED" || payload.type === "INCIDENT_ASSIGNED") {
          queryClient.invalidateQueries({ queryKey: ["incidents"] });
        } else if (payload.type === "GATE_STATUS_CHANGED") {
          queryClient.invalidateQueries({ queryKey: ["gates"] });
          queryClient.invalidateQueries({ queryKey: ["crowd-status"] });
        }
      } catch (err) {
        console.warn("Failed to parse socket payload:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed. Attempting reconnect...");
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error("WebSocket socket error encountered:", err);
      ws.close();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectSocket();
    }, 5000); // Attempt reconnection every 5 seconds
  };

  useEffect(() => {
    connectSocket();

    return () => {
      if (socketRef.current) {
        // Clear close listener to prevent auto-reconnect loops on unmount
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [queryClient]);

  return (
    <WebSocketContext.Provider value={null}>
      {children}
    </WebSocketContext.Provider>
  );
};
export default WebSocketProvider;
