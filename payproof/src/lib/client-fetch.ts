/**
 * Options for resilient client-side API requests.
 */
export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  retryOnStatus?: number[];
}

/**
 * Standard client-to-backend fetch wrapper with bounded exponential backoff,
 * jitter, timeout cancellation, and intelligent transient error retry.
 *
 * Retries:
 * - 429 Too Many Requests (honors Retry-After header if present)
 * - 502 Bad Gateway
 * - 503 Service Unavailable
 * - 504 Gateway Timeout
 * - Transient network exceptions / fetch failures / timeouts
 *
 * Fails promptly on 4xx client errors (400, 401, 403, 404, 409, 410) unless explicitly configured.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 300,
    maxDelayMs = 3000,
    timeoutMs = 10000,
    retryOnStatus = [429, 502, 503, 504],
    ...fetchOptions
  } = options;

  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Merge caller signal if provided
    if (fetchOptions.signal) {
      fetchOptions.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(input, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Check if status is retryable and we have attempts remaining
      if (retryOnStatus.includes(response.status) && attempt < maxRetries) {
        attempt++;

        // Honor Retry-After header if present (in seconds)
        const retryAfterHeader = response.headers.get("Retry-After");
        let delayMs = 0;
        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            delayMs = Math.min(parsedSeconds * 1000, maxDelayMs);
          }
        }

        if (delayMs === 0) {
          const jitter = Math.random() * 80;
          delayMs = Math.min(initialDelayMs * Math.pow(2, attempt - 1) + jitter, maxDelayMs);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timer);

      // If user aborted intentionally, rethrow immediately
      if (fetchOptions.signal?.aborted) {
        throw err;
      }

      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }

      const jitter = Math.random() * 80;
      const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt - 1) + jitter, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Maximum retry attempts exceeded.");
}
