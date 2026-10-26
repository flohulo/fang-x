// Einfacher Ratenbegrenzer als Durable Object.

const MAX_KEYS = 5000;

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body: { key?: unknown; limit?: unknown; windowMs?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "Ungültiger Body" }, { status: 400 });
    }

    const key = typeof body.key === "string" ? body.key.slice(0, 120) : "unbekannt";
    const limit = clampNumber(body.limit, 1, 10_000, 60);
    const windowMs = clampNumber(body.windowMs, 1000, 60 * 60_000, 60_000);

    const now = Date.now();
    this.sweep(now);

    let bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count++;

    const allowed = bucket.count <= limit;
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    return Response.json({
      allowed,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds,
    });
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 10_000 && this.buckets.size < MAX_KEYS) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
    // Notbremse: nie unbegrenzt Speicher halten.
    if (this.buckets.size > MAX_KEYS) this.buckets.clear();
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
