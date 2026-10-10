import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** 32 random bytes, URL-safe. This is the only secret in a share link / QR. */
export const newToken = () => randomBytes(32).toString("base64url");

/** Tokens are looked up by hash, so a database leak alone does not expose working links. */
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export const sha256Hex = (buf: Uint8Array | Buffer) => createHash("sha256").update(buf).digest("hex");

function key() {
  const secret = process.env.TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set");
  return createHash("sha256").update(`continuum-token:${secret}`).digest();
}

/** Encrypt a token (AES-256-GCM) so the patient can re-display an active QR later. */
export function encryptToken(t: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(t, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
}

export function decryptToken(s: string): string | null {
  try {
    const b = Buffer.from(s, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
