import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "./client-fetch";

describe("fetchWithRetry", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns immediate successful response without retrying", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const res = await fetchWithRetry("/api/test");
    expect(res.status).toBe(200);
    expect(callCount).toBe(1);
  });

  it("retries on 502/503/429 transient backend errors with backoff", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return new Response("Gateway error", { status: 502 });
      }
      return new Response(JSON.stringify({ recovered: true }), { status: 200 });
    });

    const res = await fetchWithRetry("/api/test", { maxRetries: 3, initialDelayMs: 10 });
    expect(res.status).toBe(200);
    expect(callCount).toBe(3);
  });

  it("does not retry 400 or 401 client errors", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response("Unauthorized", { status: 401 });
    });

    const res = await fetchWithRetry("/api/test", { maxRetries: 3 });
    expect(res.status).toBe(401);
    expect(callCount).toBe(1);
  });

  it("retries on transient network errors and throws if maxRetries exceeded", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      throw new Error("Network offline");
    });

    await expect(
      fetchWithRetry("/api/test", { maxRetries: 2, initialDelayMs: 10 }),
    ).rejects.toThrow("Network offline");

    expect(callCount).toBe(3); // 1 initial + 2 retries
  });
});
