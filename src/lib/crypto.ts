import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey() {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Set BETTER_AUTH_SECRET or CREDENTIALS_ENCRYPTION_KEY to encrypt credentials.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string) {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Stored credential payload is invalid.");
  }
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
