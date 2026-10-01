import { z } from "zod";

const serverConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  DISCLOSURE_TOKEN_PEPPER: z.string().min(32),
  RECEIPT_ENVELOPE_MASTER_KEY: z.string().min(32),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

export function readServerConfig(environment: Record<string, string | undefined> = process.env): ServerConfig {
  return serverConfigSchema.parse(environment);
}
