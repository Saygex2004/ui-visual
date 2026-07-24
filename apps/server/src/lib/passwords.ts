// Password hashing (SPECIFICATIONS.md §1, §7): argon2id only, current OWASP
// recommendation. No password is ever logged, returned, or stored in any other
// form.
import { hash, verify, argon2id } from 'argon2';

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, { type: argon2id });
}

export function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  return verify(storedHash, plain);
}

// A pre-computed, VALIDLY-FORMATTED argon2id hash used only to equalize
// response timing for unknown-username login attempts. It must parse
// successfully — a malformed string makes verify() reject in ~0.3ms instead of
// paying the real ~50-60ms memory-hard cost, which would reopen exactly the
// timing side-channel this exists to close. Never a real account's credential.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$7iBdtLA5LPmAA2M7MRMULA$mxS0S4HgMOzH9lsTI+QhMyJRW7KMwwtE24eI/5xUkrw';

/** Run a verify() against the dummy hash — same cost, no real secret. */
export function verifyDummyPassword(plain: string): Promise<boolean> {
  return verify(DUMMY_HASH, plain);
}
