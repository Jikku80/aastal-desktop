import * as crypto from 'crypto';

/**
 * Reversible encryption for the one secret in this module that has to be
 * stored reversibly: the outbound webhook signing secret (we need the
 * plaintext to compute an HMAC on every dispatch, unlike the bearer token
 * itself, which is only ever hashed — see JwantraIntegration entity).
 *
 * No such helper existed elsewhere in this codebase (checked — everything
 * else either hashes with SHA-256 for one-way comparison, like ApiKey and
 * the token here, or stores third-party OAuth secrets in env vars). Uses
 * AES-256-GCM with a key derived from INTEGRATION_ENCRYPTION_KEY so a raw
 * DB dump doesn't leak usable secrets.
 */
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) {
    // Fail loudly rather than silently storing secrets in plaintext or
    // with a hardcoded key — this must be set in production. Falling back
    // to JWT_SECRET (already required, already present in every deployed
    // env) keeps local/dev setups working without a new required var.
    const fallback = process.env.JWT_SECRET;
    if (!fallback) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY (or JWT_SECRET as a fallback) must be set to store webhook secrets.',
      );
    }
    return crypto.createHash('sha256').update(fallback).digest();
  }
  // Accept either a raw passphrase or a 64-char hex-encoded 32-byte key.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

/** Returns "iv:authTag:ciphertext", all hex-encoded. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted secret');
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
