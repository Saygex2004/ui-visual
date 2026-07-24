// Session tokens (DATA_MODEL.md §9): a cryptographically random 128-bit+
// token is what the cookie carries; only its HASH is ever stored (the
// `sessions` document id). A Firestore read alone can never yield a usable
// session token.
import { randomBytes, createHash } from 'node:crypto';

/** 256 bits of randomness, base64url — the raw value the cookie carries. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The `sessions` document id: sha256 of the raw token, hex-encoded. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
