/**
 * StadiumOS AI — Jest Test Setup Environment.
 * 
 * Mock out Redis client operations using an in-memory map to isolate tests.
 */

import { jest } from "@jest/globals";

// Mocking ioredis client singleton
jest.mock("../src/infrastructure/cache/redisClient", () => {
  const store = new Map<string, string>();
  const geoStore = new Map<string, Array<{ member: string; lon: number; lat: number }>>();

  const mockRedisInstance = {
    get: jest.fn(async (key: string) => store.get(key) || null),
    set: jest.fn(async (key: string, val: string) => {
      store.set(key, val);
      return "OK";
    }),
    del: jest.fn(async (key: string) => {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    }),
    exists: jest.fn(async (key: string) => (store.has(key) ? 1 : 0)),
    geoadd: jest.fn(async (key: string, lon: number, lat: number, member: string) => {
      let list = geoStore.get(key) || [];
      list = list.filter((item) => item.member !== member);
      list.push({ member, lon, lat });
      geoStore.set(key, list);
      return 1;
    }),
    zrem: jest.fn(async (key: string, member: string) => {
      let list = geoStore.get(key) || [];
      const initialLen = list.length;
      list = list.filter((item) => item.member !== member);
      geoStore.set(key, list);
      return initialLen > list.length ? 1 : 0;
    }),
    georadius: jest.fn(async (key: string, lon: number, lat: number, radius: number) => {
      const list = geoStore.get(key) || [];
      // Simple mockup payload returning mapped geo elements
      return list.map((item) => [
        item.member,
        "250", // distance mockup
        [String(item.lon), String(item.lat)]
      ]);
    }),
    on: jest.fn(),
    quit: jest.fn(async () => "OK"),
    duplicate: jest.fn(() => mockRedisInstance)
  };

  return {
    getRedisClient: () => mockRedisInstance,
    closeRedis: async () => {}
  };
});
