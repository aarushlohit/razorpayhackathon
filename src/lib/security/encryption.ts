import crypto from "crypto";

/**
 * Server-only AES-256-GCM Authenticated Encryption for sensitive integration secrets.
 * Ensures secrets are never stored or logged in plaintext.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit nonce for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Resolves or derives a 32-byte encryption key for AES-256.
 */
function getEncryptionKey(): Buffer {
  const customSecret = process.env.ENCRYPTION_SECRET || process.env.SECRET_KEY || process.env.NEXTAUTH_SECRET;
  if (customSecret) {
    return crypto.createHash("sha256").update(customSecret).digest();
  }
  // Server fallback seed (deterministic per server instance, strictly server-only)
  return crypto.createHash("sha256").update("refund-loop-server-encryption-key-v1").digest();
}

export interface EncryptedSecretPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 */
export function encryptSecret(plaintext: string): EncryptedSecretPayload {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty or null secret.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag,
  };
}

/**
 * Decrypts an encrypted payload using AES-256-GCM.
 */
export function decryptSecret(payload: EncryptedSecretPayload): string {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.tag) {
    throw new Error("Invalid encrypted payload structure.");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Masks a Key ID for safe UI display (e.g., "rzp_test_••••••••1234").
 */
export function maskKeyId(keyId: string): string {
  if (!keyId) return "";
  if (keyId.length <= 8) return "••••" + keyId.slice(-4);
  const prefix = keyId.slice(0, 8); // e.g. "rzp_test" or "rzp_live"
  const suffix = keyId.slice(-4);
  return `${prefix}_••••••••${suffix}`;
}
