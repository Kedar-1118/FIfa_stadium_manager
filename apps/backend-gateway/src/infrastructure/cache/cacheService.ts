/**
 * StadiumOS AI — Cache Service Wrapper.
 * 
 * Exposes type-safe caching operations and geo-spatial indices wraps around ioredis.
 */

import Redis from "ioredis";
import { getRedisClient } from "./redisClient";

export class CacheService {
  private client: Redis;

  constructor(client?: Redis) {
    this.client = client || getRedisClient();
  }

  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  public async set(key: string, value: string, expireSeconds?: number): Promise<string | null> {
    if (expireSeconds) {
      return await this.client.set(key, value, "EX", expireSeconds);
    }
    return await this.client.set(key, value);
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async setJson(key: string, value: any, expireSeconds?: number): Promise<string | null> {
    return await this.set(key, JSON.stringify(value), expireSeconds);
  }

  public async delete(key: string): Promise<number> {
    return await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  // ---------------------------------------------------------------------------
  // Geo Spatial Indexing
  // ---------------------------------------------------------------------------

  public async geoAdd(
    key: string,
    member: string,
    longitude: number,
    latitude: number
  ): Promise<number> {
    // ioredis takes arguments: key, longitude, latitude, member
    return await this.client.geoadd(key, longitude, latitude, member);
  }

  public async geoRemove(key: string, member: string): Promise<number> {
    return await this.client.zrem(key, member);
  }

  public async geoSearchRadius(
    key: string,
    longitude: number,
    latitude: number,
    radiusMeters: number
  ): Promise<Array<{ member: string; distanceMeters: number; longitude: number; latitude: number }>> {
    // georadius returns: [[member, distance, [longitude, latitude]], ...]
    const rawResults = await this.client.georadius(
      key,
      longitude,
      latitude,
      radiusMeters,
      "m",
      "WITHDIST",
      "WITHCOORD",
      "ASC"
    ) as any[];

    if (!rawResults || !Array.isArray(rawResults)) return [];

    return rawResults.map((item) => {
      const [member, distance, coords] = item;
      return {
        member,
        distanceMeters: parseFloat(distance),
        longitude: parseFloat(coords[0]),
        latitude: parseFloat(coords[1])
      };
    });
  }
}
