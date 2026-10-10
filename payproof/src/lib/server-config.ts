import { z } from "zod";

const serverConfigSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DISCLOSURE_TOKEN_PEPPER: z.string().min(32),
  RECEIPT_ENVELOPE_MASTER_KEY: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  HELIUS_API_KEY: z.string().optional(),
  SOLANA_RPC_URL: z.string().url().or(z.literal("")).optional(),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

export function readServerConfig(environment: Record<string, string | undefined> = process.env): ServerConfig {
  const cleaned: Record<string, string | undefined> = { ...environment };
  if (!cleaned.SOLANA_RPC_URL || cleaned.SOLANA_RPC_URL.trim() === "") {
    delete cleaned.SOLANA_RPC_URL;
  }
  if (!cleaned.HELIUS_API_KEY || cleaned.HELIUS_API_KEY.trim() === "") {
    delete cleaned.HELIUS_API_KEY;
  }
  return serverConfigSchema.parse(cleaned);
}

/**
 * Dynamically resolves the server-side Solana RPC URL from environment.
 * Evaluates dedicated server RPC -> Helius API key -> public RPC URL -> Solana Devnet fallback.
 */
export function getServerRpcUrl(environment: Record<string, string | undefined> = process.env): string {
  if (environment.SOLANA_RPC_URL?.trim()) return environment.SOLANA_RPC_URL.trim();
  if (environment.QUICKNODE_RPC_URL?.trim()) return environment.QUICKNODE_RPC_URL.trim();
  if (environment.ALCHEMY_RPC_URL?.trim()) return environment.ALCHEMY_RPC_URL.trim();
  if (environment.TRITON_RPC_URL) return environment.TRITON_RPC_URL;
  if (environment.HELIUS_API_KEY) return `https://devnet.helius-rpc.com/?api-key=${environment.HELIUS_API_KEY}`;
  if (environment.NEXT_PUBLIC_HELIUS_RPC_URL) return environment.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (environment.NEXT_PUBLIC_QUICKNODE_RPC_URL) return environment.NEXT_PUBLIC_QUICKNODE_RPC_URL;
  if (environment.NEXT_PUBLIC_ALCHEMY_RPC_URL) return environment.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  if (environment.NEXT_PUBLIC_IRONFORGE_RPC_URL) return environment.NEXT_PUBLIC_IRONFORGE_RPC_URL;
  if (environment.NEXT_PUBLIC_SHYFT_RPC_URL) return environment.NEXT_PUBLIC_SHYFT_RPC_URL;
  if (environment.NEXT_PUBLIC_SOLANA_RPC_URL) return environment.NEXT_PUBLIC_SOLANA_RPC_URL;
  return "https://api.devnet.solana.com";
}
