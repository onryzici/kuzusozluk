import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token && url.startsWith("https://")
  ? new Redis({ url, token })
  : null;

export const TTL = {
  GUNDEM: 60 * 5,      // 5 dakika
  BASLIK: 60 * 60,     // 1 saat
  KULLANICI: 60 * 15,  // 15 dakika
  ARAMA: 60 * 2,       // 2 dakika
};

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttl: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttl });
  } catch {
    // Redis not available
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Redis not available
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    // Upstash doesn't support KEYS, so we delete specific known keys
    await redis.del(pattern);
  } catch {
    // Redis not available
  }
}
