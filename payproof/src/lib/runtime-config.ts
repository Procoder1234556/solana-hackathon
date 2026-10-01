import { z } from "zod";

const publicRuntimeConfigSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SOLANA_CLUSTER: z.literal("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.url(),
});

export type PublicRuntimeConfig = z.infer<typeof publicRuntimeConfigSchema>;

export function readPublicRuntimeConfig(
  environment: Record<string, string | undefined> = process.env,
): PublicRuntimeConfig {
  return publicRuntimeConfigSchema.parse({
    NEXT_PUBLIC_APP_URL: environment.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOLANA_CLUSTER: environment.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_SOLANA_RPC_URL: environment.NEXT_PUBLIC_SOLANA_RPC_URL,
  });
}
