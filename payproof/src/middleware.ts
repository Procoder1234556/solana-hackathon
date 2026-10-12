import { NextResponse, type NextRequest } from "next/server";

// Rate limiting in-memory bucket map (Sliding Window / Fixed Window per minute)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

function checkRateLimit(ip: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Periodic map eviction
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
    lastCleanup = now;
  }

  const existing = rateLimitMap.get(ip);
  if (!existing || existing.resetAt <= now) {
    const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(ip, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // Rate limiting for public and auth endpoints
  let limit = 120; // default 120 req/min
  let windowMs = 60 * 1000;

  if (pathname.startsWith("/api/auth/")) {
    limit = 20; // 20 nonce/verify requests per minute per IP to prevent brute force
  } else if (pathname.startsWith("/api/verify/")) {
    limit = 60; // 60 verification queries per minute per IP
  } else if (pathname.startsWith("/api/receipts") && request.method === "POST") {
    limit = 30; // 30 receipt creation attempts per minute
  }

  if (pathname.startsWith("/api/")) {
    const rateCheck = checkRateLimit(`${ip}:${pathname.split("/")[2]}`, limit, windowMs);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            requestId: crypto.randomUUID(),
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateCheck.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
  }

  // Security headers (OWASP ASVS / NIST compliant)
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
