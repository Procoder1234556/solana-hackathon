import { isAddress } from "@solana/kit";

export type SolanaWalletProvider = {
  connect: () => Promise<{ publicKey: string }>;
  signAndSendTransaction?: (transaction: unknown) => Promise<{ signature: string }>;
};

export type EmployerWalletSession = {
  publicKey: string;
};

export async function connectEmployerWallet(provider: SolanaWalletProvider): Promise<EmployerWalletSession> {
  const connected = await provider.connect();
  if (!isAddress(connected.publicKey)) {
    throw new Error("The connected wallet did not provide a valid Solana public key.");
  }
  return { publicKey: connected.publicKey };
}

export function getPhantomSolanaWallet(): SolanaWalletProvider {
  const provider = (window as unknown as { phantom?: { solana?: SolanaWalletProvider } }).phantom?.solana;
  if (!provider) {
    throw new Error("Phantom wallet was not found. Install Phantom and try again.");
  }
  return provider;
}
