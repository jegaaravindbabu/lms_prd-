// ============================================================================
//  Credential encryption (AES-256-GCM)
// ----------------------------------------------------------------------------
//  Payment-gateway secrets are encrypted at rest with CREDENTIAL_ENC_KEY
//  (a 32-byte key, base64). We store iv:tag:ciphertext (all base64). Never log
//  plaintext secrets.
//
//  Generate a key:  openssl rand -base64 32
// ============================================================================

import crypto from "crypto";

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.CREDENTIAL_ENC_KEY;
  if (!raw) throw new Error("CREDENTIAL_ENC_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("CREDENTIAL_ENC_KEY must be 32 bytes (base64)");
  return buf;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted secret");
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

/** Mask a secret for display (e.g. "rzp_test_••••4f2a"). */
export function maskKey(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 8)}••••${value.slice(-4)}`;
}
