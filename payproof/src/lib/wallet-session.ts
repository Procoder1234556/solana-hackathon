import { isAddress } from "@solana/kit";

export type SolanaWalletProvider = {
  connect: () => Promise<{ publicKey?: unknown }>;
  publicKey?: unknown;
  signAndSendTransaction?: (transaction: unknown) => Promise<{ signature: string }>;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
};

export type EmployerWalletSession = {
  publicKey: string;
};

function extractPublicKeyString(candidate: unknown): string {
  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate === "object") {
    if ("toBase58" in candidate && typeof (candidate as { toBase58: () => unknown }).toBase58 === "function") {
      return (candidate as { toBase58: () => string }).toBase58();
    }
    if ("toString" in candidate && typeof (candidate as { toString: () => unknown }).toString === "function") {
      const str = (candidate as { toString: () => string }).toString();
      if (str !== "[object Object]") return str;
    }
  }
  return "";
}

export async function connectEmployerWallet(provider: SolanaWalletProvider): Promise<EmployerWalletSession> {
  const connected = await provider.connect();
  const rawKey = connected?.publicKey ?? provider.publicKey;
  const keyString = extractPublicKeyString(rawKey);

  if (!isAddress(keyString)) {
    throw new Error("The connected wallet did not provide a valid Solana public key.");
  }
  return { publicKey: keyString };
}

export function getPhantomSolanaWallet(): SolanaWalletProvider {
  const phantom = (window as unknown as { phantom?: { solana?: SolanaWalletProvider } }).phantom?.solana;
  const solana = (window as unknown as { solana?: SolanaWalletProvider & { isPhantom?: boolean } }).solana;
  const provider = phantom ?? (solana?.isPhantom ? solana : solana);
  if (!provider) {
    throw new Error("Phantom wallet was not found. Install Phantom extension and try again.");
  }
  return provider;
}
