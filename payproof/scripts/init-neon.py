import psycopg2

conn_str = "postgresql://neondb_owner:npg_q0ngf6itovJj@ep-small-credit-b5koj3bq-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
conn = psycopg2.connect(conn_str)
cur = conn.cursor()

sql = """
DO $$ BEGIN
    CREATE TYPE "WalletRole" AS ENUM ('EMPLOYER', 'CONTRACTOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "WalletIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicKey" TEXT NOT NULL UNIQUE,
    "role" "WalletRole" NOT NULL,
    "nonceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issuerPublicKey" TEXT NOT NULL,
    "recipientPublicKey" TEXT NOT NULL,
    "transactionSignature" TEXT NOT NULL UNIQUE,
    "mintAddress" TEXT NOT NULL,
    "receiptHash" TEXT NOT NULL UNIQUE,
    "encryptedEnvelope" BYTEA NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Disclosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL REFERENCES "Receipt"("id") ON DELETE CASCADE,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "fields" JSONB NOT NULL,
    "encryptedPayload" BYTEA NOT NULL,
    "payloadSignature" BYTEA NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorKey" TEXT,
    "eventType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

cur.execute(sql)
conn.commit()

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
tables = [r[0] for r in cur.fetchall()]
print("SUCCESS: Live Neon tables verified:", tables)
cur.close()
conn.close()
