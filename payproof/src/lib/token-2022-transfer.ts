const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

export const TOKEN_2022_PROGRAM_ADDRESS = TOKEN_2022_PROGRAM_ID;

export function decimalToTokenUnits(amount: string, decimals: number): bigint {
  const [whole, fraction = ""] = amount.split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction) || fraction.length > decimals) {
    throw new Error("Amount exceeds the mint precision.");
  }
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

/** Builds a standard, visibly non-confidential Token-2022 fallback transfer. */
export async function createToken2022TransferPlan(input: { issuerPublicKey: string; recipientPublicKey: string; mintAddress: string; amount: string; decimals: number }) {
  const [{ PublicKey, SystemProgram, Transaction, TransactionInstruction }, { Buffer }] = await Promise.all([import("@solana/web3.js"), import("buffer")]);
  const issuer = new PublicKey(input.issuerPublicKey);
  const recipient = new PublicKey(input.recipientPublicKey);
  const mint = new PublicKey(input.mintAddress);
  const tokenProgram = new PublicKey(TOKEN_2022_PROGRAM_ID);
  const associatedTokenProgram = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
  const associatedTokenAddress = (owner: InstanceType<typeof PublicKey>) =>
    PublicKey.findProgramAddressSync([owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()], associatedTokenProgram)[0];
  const source = associatedTokenAddress(issuer);
  const destination = associatedTokenAddress(recipient);
  const amount = decimalToTokenUnits(input.amount, input.decimals);
  const uint64LE = (value: bigint) => {
    const bytes = Buffer.alloc(8);
    bytes.writeBigUInt64LE(value);
    return bytes;
  };

  return new Transaction().add(
    new TransactionInstruction({
      programId: associatedTokenProgram,
      keys: [
        { pubkey: issuer, isSigner: true, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([1]),
    }),
    new TransactionInstruction({
      programId: tokenProgram,
      keys: [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: issuer, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([Buffer.from([12]), uint64LE(amount), Buffer.from([input.decimals])]),
    }),
  );
}

export async function submitToken2022Transfer(input: {
  rpcUrl: string;
  issuerPublicKey: string;
  recipientPublicKey: string;
  mintAddress: string;
  amount: string;
  signAndSendTransaction: (transaction: unknown) => Promise<{ signature: string }>;
}): Promise<{ signature: string }> {
  const { Connection, PublicKey } = await import("@solana/web3.js");
  const connection = new Connection(input.rpcUrl, "confirmed");
  const mint = new PublicKey(input.mintAddress);
  const mintAccount = await connection.getAccountInfo(mint, "confirmed");
  if (!mintAccount || !mintAccount.owner.equals(new PublicKey(TOKEN_2022_PROGRAM_ID))) {
    throw new Error("The selected mint is not a Token-2022 mint on the configured cluster.");
  }
  const decimals = mintAccount.data[44];
  if (decimals === undefined) throw new Error("The selected mint does not expose token decimals.");

  const transaction = await createToken2022TransferPlan({ ...input, decimals });
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = new PublicKey(input.issuerPublicKey);
  transaction.recentBlockhash = latestBlockhash.blockhash;
  return input.signAndSendTransaction(transaction);
}
