import { z } from "zod";
import { isAddress } from "@solana/kit";

const solanaPublicKeySchema: z.ZodType<string> = z
  .string()
  .trim()
  .refine((value) => Boolean(isAddress(value)), "Enter a valid Solana public key.");

const decimalAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, "Enter an amount with no more than eight decimal places.")
  .refine((amount) => Number(amount) > 0, "Amount must be greater than zero.");

export const paymentRequestSchema = z.object({
  recipientPublicKey: solanaPublicKeySchema,
  amount: decimalAmountSchema,
  mintAddress: solanaPublicKeySchema,
  period: z.string().trim().min(1, "Enter the payment period.").max(200),
  invoiceReference: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).max(200).optional(),
  ),
});

export type PaymentRequest = z.infer<typeof paymentRequestSchema>;

export type PaymentReview = PaymentRequest & {
  issuerPublicKey: string;
  status: "ready-for-signature";
};

/**
 * Validates the immutable facts displayed in the employer's review step. This
 * record is deliberately local: receipt plaintext must not reach an API before
 * client-side encryption.
 */
export function createPaymentReview(request: unknown, issuerPublicKey: string): PaymentReview {
  return {
    ...paymentRequestSchema.parse(request),
    issuerPublicKey: solanaPublicKeySchema.parse(issuerPublicKey),
    status: "ready-for-signature",
  };
}
