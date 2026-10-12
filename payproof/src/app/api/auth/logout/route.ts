import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

/**
 * POST /api/auth/logout
 * Destroys HTTP-only session cookie.
 */
export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true, message: "Logged out successfully." }, { status: 200 });
}
