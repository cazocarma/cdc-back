import { createHash } from "node:crypto";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type ConsumeLimitOptions = {
  limit: number;
  windowMs: number;
};

type ConsumeLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

declare global {
  // eslint-disable-next-line no-var
  var cdcRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

function getStore(): Map<string, RateLimitBucket> {
  if (!global.cdcRateLimitStore) {
    global.cdcRateLimitStore = new Map<string, RateLimitBucket>();
  }
  return global.cdcRateLimitStore;
}

function pruneExpiredEntries(now: number) {
  const store = getStore();
  if (store.size <= 2000) {
    return;
  }

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function normalizeStoreKey(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function normalizePositiveNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

export function consumeRateLimit(key: string, options: ConsumeLimitOptions): ConsumeLimitResult {
  const now = Date.now();
  pruneExpiredEntries(now);

  const normalizedLimit = normalizePositiveNumber(options.limit, 1);
  const normalizedWindowMs = normalizePositiveNumber(options.windowMs, 60_000);
  const safeKey = normalizeStoreKey(key);

  const store = getStore();
  const existing = store.get(safeKey);

  if (!existing || existing.resetAt <= now) {
    const nextBucket: RateLimitBucket = {
      count: 1,
      resetAt: now + normalizedWindowMs,
    };
    store.set(safeKey, nextBucket);

    return {
      allowed: true,
      remaining: Math.max(0, normalizedLimit - 1),
      retryAfterSeconds: Math.ceil(normalizedWindowMs / 1000),
    };
  }

  existing.count += 1;
  store.set(safeKey, existing);

  const allowed = existing.count <= normalizedLimit;
  const remaining = Math.max(0, normalizedLimit - existing.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed,
    remaining,
    retryAfterSeconds,
  };
}
