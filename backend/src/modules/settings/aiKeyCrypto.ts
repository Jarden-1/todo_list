import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "node:crypto";

import { config } from "../../config";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export interface EncryptedAiApiKey {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function deriveAesKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptAiApiKey(
  apiKey: string,
  secret = config.AI_KEY_ENCRYPTION_SECRET
): EncryptedAiApiKey {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveAesKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptAiApiKey(
  encrypted: EncryptedAiApiKey,
  secret = config.AI_KEY_ENCRYPTION_SECRET
): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    deriveAesKey(secret),
    Buffer.from(encrypted.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}
