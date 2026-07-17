"""
StadiumOS AI — WebSocket Routing Handlers.

Coordinates real-time WebSocket connection tracking and broadcast deliveries
across active operators, volunteers, and fans.
"""

from typing import Annotated
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import structlog

from src.infrastructure.cache.redis_client import get_redis_client

router = APIRouter(tags=["WebSockets"])
logger = structlog.get_logger("websocket_router")


class ConnectionManager:
    """
    Manages active in-memory WebSocket connections.
    """

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept connection and add to registry."""
        await websocket.accept()
        self.active_connections.append(websocket)
        await logger.ainfo("websocket_client_connected", active_count=len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove connection from registry."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("websocket_client_disconnected", active_count=len(self.active_connections))

    async def send_personal_message(self, message: str, websocket: WebSocket) -> None:
        """Send direct text message to specific client connection."""
        await websocket.send_text(message)

    async def broadcast(self, message: str) -> None:
        """Send broadcast text message to all active client connections."""
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Connection might be stale or already closed by client
                pass


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint serving real-time event feeds.
    """
    await manager.connect(websocket)
    redis_client = get_redis_client()
    
    # Subscribe to Redis pub/sub channel in background loop to stream updates to client
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("stadiumos:broadcast")
    
    try:
        # Keep connection open and read messages (or listen to Redis pub/sub)
        while True:
            # Check for messages from client (e.g. heartbeat pings)
            try:
                # Set brief timeout so we don't block indefinitely on receive
                import asyncio
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
                # Client sent a message, handle or respond
                await websocket.send_text(f"ACK: {data}")
            except asyncio.TimeoutError:
                # No client message received in timeout window, check Redis subscription messages
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
                if message and message.get("data"):
                    # Broadcast the Redis pub/sub payload directly to the WebSocket client
                    await websocket.send_text(str(message["data"]))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        await pubsub.unsubscribe("stadiumos:broadcast")
        await pubsub.close()
