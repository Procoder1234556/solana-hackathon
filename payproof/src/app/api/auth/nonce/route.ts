import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readServerConfig } from "@/lib/server-config";
import { createHash, randomBytes } from "node:crypto";

const bodySchema = z.object({
  publicKey: z.string().min(32).max(64),
  role: z.enum(["EMPLOYER", "CONTRACTOR"]).optional(),
});

/**
 * Issues a short-lived nonce for the given wallet public key.
 * The nonce is stored as a hash; the plaintext is returned to the client
 * and must be signed to prove key ownership.
 */
export async function POST(request: Request) {
  let publicKey: string;
  let requestedRole: "EMPLOYER" | "CONTRACTOR" = "EMPLOYER";

  try {
    const body = bodySchema.parse(await request.json());
    publicKey = body.publicKey;
    if (body.role) {
      requestedRole = body.role;
    }
  } catch {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: "A valid public key is required.", requestId: crypto.randomUUID() } }, { status: 400 });
  }

  const config = readServerConfig();
  const nonce = randomBytes(32).toString("hex");
  const nonceHash = createHash("sha256").update(config.SESSION_SECRET + nonce).digest("hex");

  try {
    await prisma.walletIdentity.upsert({
      where: { publicKey },
      update: { nonceHash },
      create: { publicKey, role: requestedRole, nonceHash },
    });
  } catch {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Unable to issue nonce.", requestId: crypto.randomUUID() } }, { status: 500 });
  }

  return NextResponse.json({ nonce }, { status: 200 });
}
