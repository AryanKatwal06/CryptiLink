import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl) {
  throw new Error('[PaySys] UPSTASH_REDIS_REST_URL is required');
}
if (!redisToken) {
  throw new Error('[PaySys] UPSTASH_REDIS_REST_TOKEN is required');
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

export const TTL = {
  SESSION: 60 * 60 * 24 * 7,
  OTP: 60 * 10,
  IDEMPOTENCY: 60 * 60 * 24,
  CACHE: 60 * 5,
  RATE_WINDOW: 60 * 60,
} as const;
