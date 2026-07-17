/**
 * StadiumOS AI — WebSocket Gateway Connection Manager.
 * 
 * Manages active WebSocket connections at '/ws', authenticates client tokens,
 * and streams Redis pub/sub broadcast notifications to active displays.
 */

import { IncomingMessage } from "http";
import WebSocket from "ws";
import { verifyToken } from "../../../infrastructure/security/securityHelpers";
import { getRedisClient } from "../../../infrastructure/cache/redisClient";
import { logger } from "../../../infrastructure/logging/logger";

class WebSocketConnectionManager {
  private wss: WebSocket.Server | null = null;
  private activeConnections: Map<string, WebSocket> = new Map();
  private redisSubscriber: any = null;

  public initialize(server: any): void {
    logger.info("Initializing WebSocket Gateway server...");
    
    this.wss = new WebSocket.Server({ noServer: true });

    // Handle WebSocket upgrade manually to perform token validation
    server.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
      const url = new URL(request.url || "", `http://${request.headers.host}`);
      
      if (url.pathname === "/ws") {
        // Authenticate via token query param: /ws?token=ACCESS_TOKEN
        const token = url.searchParams.get("token");
        
        try {
          if (!token) throw new Error("Authorization credentials missing.");
          const payload = verifyToken(token, "access");
          const userId = payload.sub;

          this.wss!.handleUpgrade(request, socket, head, (ws) => {
            this.wss!.emit("connection", ws, request, userId);
          });
        } catch (err: any) {
          logger.warn(`WebSocket upgrade rejected: ${err.message}`);
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
        }
      } else {
        socket.destroy();
      }
    });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage, userId: string) => {
      logger.info({ userId }, "WebSocket connection established");
      this.activeConnections.set(userId, ws);

      ws.on("close", () => {
        logger.info({ userId }, "WebSocket connection closed");
        this.activeConnections.delete(userId);
      });

      ws.on("error", (err) => {
        logger.error({ userId, error: err.message }, "WebSocket socket error");
      });
    });

    // Initialize Redis pub/sub subscription
    this.setupRedisSubscriber();
  }

  /**
   * Subscribe to Redis channel to broadcast live events
   */
  private async setupRedisSubscriber(): Promise<void> {
    try {
      const redis = getRedisClient().duplicate();
      this.redisSubscriber = redis;

      await redis.subscribe("stadiumos:broadcast");
      logger.info("Subscribed to Redis pub/sub channel 'stadiumos:broadcast'");

      redis.on("message", (channel, message) => {
        if (channel === "stadiumos:broadcast") {
          logger.debug("Broadcasting pub/sub message to clients");
          this.broadcast(message);
        }
      });
    } catch (err: any) {
      logger.warn("Failed to subscribe to Redis broadcast channel, running without live pub/sub updates:", err.message);
    }
  }

  /**
   * Send JSON notification payload to all active clients.
   */
  public broadcast(message: string): void {
    if (this.activeConnections.size === 0) return;
    
    this.activeConnections.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

export const wsConnectionManager = new WebSocketConnectionManager();
