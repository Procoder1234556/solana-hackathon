import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { readServerConfig } from "@/lib/server-config";
import { setSession } from "@/lib/session";

const bodySchema = z.object({
  publicKey: z.string().min(32).max(64),
  nonce: z.string().length(64),
  signature: z.string().min(1), // base58 or base64, client sends base58
  role: z.enum(["EMPLOYER", "CONTRACTOR"]),
});

/**
 * Verifies a wallet signature over the nonce message.
 * On success, sets an HTTP-only session cookie and clears the nonce.
 * Nonce is consumed regardless of outcome to prevent replay.
 */
export async function POST(request: Request) {
  const config = readServerConfig();
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "publicKey, nonce, signature, and role are required.", requestId: crypto.randomUUID() } },
      { status: 400 },
    );
  }

  const { publicKey, nonce, signature, role } = body;
  const identity = await prisma.walletIdentity.findUnique({ where: { publicKey } });
  if (!identity?.nonceHash) {
    return NextResponse.json(
      { error: { code: "NONCE_MISSING", message: "Request a nonce first.", requestId: crypto.randomUUID() } },
      { status: 401 },
    );
  }

  // Consume nonce immediately — prevents replay on success and failure.
  await prisma.walletIdentity.update({ where: { publicKey }, data: { nonceHash: null, role } });

  // Verify nonce hash matches.
  const expectedHash = createHash("sha256").update(config.SESSION_SECRET + nonce).digest("hex");
  const expected = Buffer.from(expectedHash);
  const received = Buffer.from(identity.nonceHash);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Nonce mismatch.", requestId: crypto.randomUUID() } },
      { status: 401 },
    );
  }

  // Verify Ed25519 signature over "PayProof sign-in\n<nonce>".
  let verified = false;
  try {
    const { default: nacl } = await import("tweetnacl");
    const { default: bs58 } = await import("bs58");
    const pubkeyBytes = bs58.decode(publicKey);
    const sigBytes = bs58.decode(signature);
    const message = new TextEncoder().encode(`PayProof sign-in\n${nonce}`);
    verified = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Signature verification failed.", requestId: crypto.randomUUID() } },
      { status: 401 },
    );
  }

  if (!verified) {
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Signature does not match the wallet.", requestId: crypto.randomUUID() } },
      { status: 401 },
    );
  }

  await setSession({ publicKey, role }, config.SESSION_SECRET);
  return NextResponse.json({ ok: true, publicKey, role }, { status: 200 });
}
