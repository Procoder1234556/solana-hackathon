import { z } from "zod";

const publicRuntimeConfigSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SOLANA_CLUSTER: z.literal("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),
  NEXT_PUBLIC_DEVNET_TOKEN_2022_MINT: z.string().optional(),
  NEXT_PUBLIC_CASH_MINT: z.string().optional(),
  NEXT_PUBLIC_PHANTOM_APP_ID: z.string().optional(),
  NEXT_PUBLIC_HELIUS_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_QUICKNODE_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_ALCHEMY_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_IRONFORGE_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_SHYFT_RPC_URL: z.string().url().optional(),
});

export type PublicRuntimeConfig = z.infer<typeof publicRuntimeConfigSchema>;

export function readPublicRuntimeConfig(
  environment: Record<string, string | undefined> = process.env,
): PublicRuntimeConfig {
  const heliusKey = environment.NEXT_PUBLIC_HELIUS_API_KEY || environment.HELIUS_API_KEY;
  const heliusRpc = environment.NEXT_PUBLIC_HELIUS_RPC_URL || (heliusKey ? `https://devnet.helius-rpc.com/?api-key=${heliusKey}` : undefined);
  const rpcUrl =
    environment.NEXT_PUBLIC_SOLANA_RPC_URL ||
    heliusRpc ||
    environment.NEXT_PUBLIC_QUICKNODE_RPC_URL ||
    environment.NEXT_PUBLIC_ALCHEMY_RPC_URL ||
    environment.NEXT_PUBLIC_IRONFORGE_RPC_URL ||
    environment.NEXT_PUBLIC_SHYFT_RPC_URL ||
    "https://api.devnet.solana.com";

  const payload: Record<string, string | undefined> = {
    NEXT_PUBLIC_APP_URL: environment.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOLANA_CLUSTER: environment.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_SOLANA_RPC_URL: rpcUrl,
  };

  if (environment.NEXT_PUBLIC_DEVNET_TOKEN_2022_MINT) {
    payload.NEXT_PUBLIC_DEVNET_TOKEN_2022_MINT = environment.NEXT_PUBLIC_DEVNET_TOKEN_2022_MINT;
  }
  if (environment.NEXT_PUBLIC_CASH_MINT) {
    payload.NEXT_PUBLIC_CASH_MINT = environment.NEXT_PUBLIC_CASH_MINT;
  }
  if (environment.NEXT_PUBLIC_PHANTOM_APP_ID) {
    payload.NEXT_PUBLIC_PHANTOM_APP_ID = environment.NEXT_PUBLIC_PHANTOM_APP_ID;
  }
  if (heliusRpc) {
    payload.NEXT_PUBLIC_HELIUS_RPC_URL = heliusRpc;
  }
  if (environment.NEXT_PUBLIC_QUICKNODE_RPC_URL) {
    payload.NEXT_PUBLIC_QUICKNODE_RPC_URL = environment.NEXT_PUBLIC_QUICKNODE_RPC_URL;
  }
  if (environment.NEXT_PUBLIC_ALCHEMY_RPC_URL) {
    payload.NEXT_PUBLIC_ALCHEMY_RPC_URL = environment.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  }
  if (environment.NEXT_PUBLIC_IRONFORGE_RPC_URL) {
    payload.NEXT_PUBLIC_IRONFORGE_RPC_URL = environment.NEXT_PUBLIC_IRONFORGE_RPC_URL;
  }
  if (environment.NEXT_PUBLIC_SHYFT_RPC_URL) {
    payload.NEXT_PUBLIC_SHYFT_RPC_URL = environment.NEXT_PUBLIC_SHYFT_RPC_URL;
  }

  return publicRuntimeConfigSchema.parse(payload);
}
