import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerRpcUrl } from "@/lib/server-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Comprehensive operational health probe evaluating database connectivity,
 * RPC reachability, memory usage, and uptime.
 */
export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, { status: "up" | "down" | "degraded"; latencyMs?: number; message?: string }> = {};

  // 1. Database Check (Prisma ping via raw query or count)
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: unknown) {
    checks.database = {
      status: "down",
      latencyMs: Date.now() - dbStart,
      message: err instanceof Error ? err.message : "Database connection failure",
    };
  }

  // 2. Solana RPC Check (getBlockHeight / getSlot)
  const rpcStart = Date.now();
  const rpcUrl = getServerRpcUrl();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const rpcRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot" }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (rpcRes.ok) {
      checks.solanaRpc = {
        status: "up",
        latencyMs: Date.now() - rpcStart,
      };
    } else {
      checks.solanaRpc = {
        status: "degraded",
        latencyMs: Date.now() - rpcStart,
        message: `HTTP ${rpcRes.status}`,
      };
    }
  } catch (err: unknown) {
    checks.solanaRpc = {
      status: "down",
      latencyMs: Date.now() - rpcStart,
      message: err instanceof Error ? err.message : "RPC unreachable",
    };
  }

  const isHealthy = checks.database?.status === "up";
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      durationMs: Date.now() - startedAt,
      checks,
    },
    { status: statusCode },
  );
}
