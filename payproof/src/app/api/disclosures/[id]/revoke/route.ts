import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readServerConfig } from "@/lib/server-config";
import { getSession } from "@/lib/session";

/**
 * POST /api/disclosures/:id/revoke
 * Contractor idempotently revokes a disclosure. The token can never be used
 * to retrieve fields after revocation.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const config = readServerConfig();
  const session = await getSession(config.SESSION_SECRET);
  if (!session || session.role !== "CONTRACTOR") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Contractor session required.", requestId: crypto.randomUUID() } }, { status: 401 });
  }

  const { id } = await params;
  const disclosure = await prisma.disclosure.findUnique({
    where: { id },
    include: { receipt: { select: { recipientPublicKey: true } } },
  });

  if (!disclosure || disclosure.receipt.recipientPublicKey !== session.publicKey) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Disclosure not found.", requestId: crypto.randomUUID() } }, { status: 404 });
  }

  // Idempotent — already revoked is fine.
  if (!disclosure.revokedAt) {
    await prisma.disclosure.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, revokedAt: disclosure.revokedAt ?? new Date() });
}
