import { describe, expect, it } from "vitest";
import { rateLimit, rateLimitConfig } from "../rate-limit";

const { MAX_REQUESTS, WINDOW_MS } = rateLimitConfig;

let seq = 0;
const uniqueKey = () => `test-${seq++}`;

describe("rateLimit", () => {
  it("allows up to the limit within one window", () => {
    const key = uniqueKey();
    for (let i = 0; i < MAX_REQUESTS; i++) {
      expect(rateLimit(key, 1000).allowed, `request ${i + 1}`).toBe(true);
    }
  });

  it("blocks the request after the limit", () => {
    const key = uniqueKey();
    for (let i = 0; i < MAX_REQUESTS; i++) rateLimit(key, 1000);

    const result = rateLimit(key, 1000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("lets requests through again once the window has passed", () => {
    const key = uniqueKey();
    for (let i = 0; i < MAX_REQUESTS; i++) rateLimit(key, 1000);
    expect(rateLimit(key, 1000).allowed).toBe(false);
    expect(rateLimit(key, 1000 + WINDOW_MS + 1).allowed).toBe(true);
  });

  it("tracks each key separately", () => {
    const a = uniqueKey();
    const b = uniqueKey();
    for (let i = 0; i < MAX_REQUESTS; i++) rateLimit(a, 1000);

    expect(rateLimit(a, 1000).allowed).toBe(false);
    expect(rateLimit(b, 1000).allowed).toBe(true);
  });
});
