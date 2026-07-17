"""
StadiumOS AI — Cache Service implementation.

Provides typed cache operations and geo-spatial utilities wrapper around
the Redis client, separating application layers from the direct Redis dependency.
"""

import json
from typing import Any
import redis.asyncio as aioredis
from src.infrastructure.cache.redis_client import get_redis_client


class CacheService:
    """
    Service wrapper for managing cache interactions and spatial indexing.

    Attributes:
        client: The underlying async Redis client instance.
    """

    def __init__(self, client: aioredis.Redis | None = None) -> None:
        self.client = client or get_redis_client()

    async def get(self, key: str) -> str | None:
        """Retrieve a string value from the cache."""
        return await self.client.get(key)

    async def set(self, key: str, value: str, expire_seconds: int | None = None) -> bool:
        """Store a string value in the cache with optional expiration."""
        return await self.client.set(key, value, ex=expire_seconds)

    async def get_json(self, key: str) -> Any | None:
        """Retrieve and decode a JSON object from the cache."""
        data = await self.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_json(self, key: str, value: Any, expire_seconds: int | None = None) -> bool:
        """Encode and store a JSON-serializable value in the cache."""
        encoded = json.dumps(value)
        return await self.set(key, encoded, expire_seconds=expire_seconds)

    async def delete(self, key: str) -> int:
        """Delete one or more keys from the cache."""
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if a key exists in the cache."""
        result = await self.client.exists(key)
        return bool(result)

    # ---------------------------------------------------------------------------
    # Spatial Geo Utilities
    # ---------------------------------------------------------------------------

    async def geo_add(self, key: str, member: str, longitude: float, latitude: float) -> int:
        """
        Add a member's coordinate point to a geo-spatial index.

        Args:
            key: Redis key for the geospatial index (e.g., 'volunteers:locations').
            member: Name/ID of the tracked member.
            longitude: WGS84 longitude.
            latitude: WGS84 latitude.

        Returns:
            The number of elements added.
        """
        # Redis geoadd takes coordinates in the order: longitude, latitude
        return await self.client.geoadd(key, (longitude, latitude, member))

    async def geo_remove(self, key: str, member: str) -> int:
        """Remove a member from the geo-spatial index (uses ZREM)."""
        return await self.client.zrem(key, member)

    async def geo_search_radius(
        self, key: str, longitude: float, latitude: float, radius_meters: float
    ) -> list[dict[str, Any]]:
        """
        Find members in the geo-spatial index within a given radius.

        Uses the standard GEORADIUS query interface compatible with Redis 6.2+.

        Args:
            key: Redis key representing the geospatial index.
            longitude: Center longitude.
            latitude: Center latitude.
            radius_meters: Search radius in meters.

        Returns:
            List of dicts representing matched members, their distances, and coordinates.
            Format: [{"member": "uuid", "distance": 12.3, "coordinates": (long, lat)}]
        """
        # georadius returns matches with distance in meters and coordinates
        raw_results = await self.client.georadius(
            name=key,
            longitude=longitude,
            latitude=latitude,
            radius=radius_meters,
            unit="m",
            withdist=True,
            withcoord=True,
            sort="ASC",
        )
        
        results = []
        for item in raw_results:
            # item structure: [member, distance, [longitude, latitude]]
            results.append({
                "member": item[0],
                "distance_meters": float(item[1]),
                "longitude": float(item[2][0]),
                "latitude": float(item[2][1]),
            })
        return results
