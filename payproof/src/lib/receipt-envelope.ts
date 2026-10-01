import { canonicalizeReceipt, receiptSchema, type ReceiptPayload } from "./receipt";

export type ReceiptEnvelope = {
  version: 1;
  algorithm: "RSA-OAEP-256/A256GCM";
  encryptedKey: string;
  iv: string;
  ciphertext: string;
};

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.slice().buffer as ArrayBuffer;
}

/**
 * Encrypts a canonical receipt only for the contractor's separately managed
 * RSA-OAEP public key. The contractor private key never enters this module or
 * server storage.
 */
export async function encryptReceiptEnvelope(payload: unknown, recipientEncryptionPublicKeyBase64: string): Promise<ReceiptEnvelope> {
  const recipientKey = await crypto.subtle.importKey(
    "spki",
    toArrayBuffer(base64ToBytes(recipientEncryptionPublicKeyBase64)),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const dataKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(canonicalizeReceipt(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, dataKey, toArrayBuffer(plaintext));
  const exportedDataKey = await crypto.subtle.exportKey("raw", dataKey);
  const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientKey, exportedDataKey);

  return {
    version: 1,
    algorithm: "RSA-OAEP-256/A256GCM",
    encryptedKey: bytesToBase64(new Uint8Array(encryptedKey)),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

/** Client-side recovery for the contractor's separately managed private key. */
export async function decryptReceiptEnvelope(envelope: ReceiptEnvelope, recipientEncryptionPrivateKeyBase64: string): Promise<ReceiptPayload> {
  if (envelope.version !== 1 || envelope.algorithm !== "RSA-OAEP-256/A256GCM") {
    throw new Error("Unsupported receipt envelope.");
  }

  const recipientKey = await crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(base64ToBytes(recipientEncryptionPrivateKeyBase64)),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
  const dataKeyBytes = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, recipientKey, toArrayBuffer(base64ToBytes(envelope.encryptedKey)));
  const dataKey = await crypto.subtle.importKey("raw", dataKeyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(base64ToBytes(envelope.iv)) },
    dataKey,
    toArrayBuffer(base64ToBytes(envelope.ciphertext)),
  );

  return receiptSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
}
