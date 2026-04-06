import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

function createLimiter(tokens: number, window: `${number} s` | `${number} m` | `${number} h`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
  });
}

export const rateLimiters = {
  baslikOlustur: createLimiter(60, "1 h"),
  entryYaz: createLimiter(120, "1 h"),
  oyVer: createLimiter(300, "1 h"),
  giris: createLimiter(20, "15 m"),
  kayit: createLimiter(5, "1 h"),
  sifreSifirla: createLimiter(5, "1 h"),
  genel: createLimiter(120, "1 m"),
};

export async function checkRateLimit(
  limiter: ReturnType<typeof createLimiter>,
  identifier: string
): Promise<{ allowed: boolean; remaining?: number }> {
  if (!limiter) return { allowed: true };
  try {
    const result = await limiter.limit(identifier);
    return { allowed: result.success, remaining: result.remaining };
  } catch {
    return { allowed: false }; // Fail closed if Redis unavailable
  }
}
