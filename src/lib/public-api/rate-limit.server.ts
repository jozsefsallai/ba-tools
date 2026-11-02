import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export const RATE_LIMITS = {
  /** Public endpoints, and requests with a missing or invalid key, per IP. */
  public: 120,
  /** `POST /api/v1/pvp/stats/search`, per IP. */
  search: 20,
  /** `GET /api/v1/me/...`, per API key owner. */
  userRead: 120,
  /** `POST`/`PATCH`/`DELETE /api/v1/me/...`, per API key owner. */
  userWrite: 60,
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

export type RateLimitState = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms at which the window resets. */
  reset: number;
};

const environment = process.env.VERCEL_ENV ?? "development";

const limiters: Partial<Record<RateLimitTier, Ratelimit>> = {};

function getLimiter(tier: RateLimitTier) {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return undefined;
  }

  limiters[tier] ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(RATE_LIMITS[tier], "1 m"),
    prefix: `ratelimit:api-v1:${environment}:${tier}`,
    // On timeout the request is allowed rather than failed.
    timeout: 1000,
  });

  return limiters[tier];
}

export async function rateLimit(
  tier: RateLimitTier,
  identifier: string,
): Promise<RateLimitState | undefined> {
  const limiter = getLimiter(tier);
  if (!limiter) {
    return undefined;
  }

  try {
    const { success, limit, remaining, reset } =
      await limiter.limit(identifier);

    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error("[public-api] rate limiter unavailable", error);
    return undefined;
  }
}

export function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimitHeaders(state: RateLimitState) {
  return {
    "X-RateLimit-Limit": String(state.limit),
    "X-RateLimit-Remaining": String(Math.max(0, state.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(state.reset / 1000)),
  };
}
