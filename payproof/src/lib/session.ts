import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

// ponytail: using a simple signed HMAC cookie rather than iron-session/jwt
// dependencies. Upgrade path: swap to iron-session when multi-field sessions are needed.

const SESSION_COOKIE = "pp_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const sessionPayloadSchema = z.object({
  publicKey: z.string().min(32),
  role: z.enum(["EMPLOYER", "CONTRACTOR"]),
  iat: z.number(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

async function hmacSign(data: string, secret: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Encodes and sets an HTTP-only session cookie. */
export async function setSession(payload: Omit<SessionPayload, "iat">, secret: string): Promise<void> {
  const body = JSON.stringify({ ...payload, iat: Date.now() });
  const sig = await hmacSign(body, secret);
  const value = Buffer.from(body).toString("base64url") + "." + sig;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** Reads and verifies the session cookie. Returns null on any failure. */
export async function getSession(secret: string): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot === -1) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = await hmacSign(Buffer.from(encoded, "base64url").toString("utf8"), secret);
  if (sig !== expected) return null;
  try {
    const body = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return sessionPayloadSchema.parse(body);
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
