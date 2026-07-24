import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, verifyDummyPassword } from './passwords.js';

describe('passwords (argon2id, SPECIFICATIONS.md §1/§7)', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('CorrectHorseBattery1!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'CorrectHorseBattery1!')).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('CorrectHorseBattery1!');
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });

  it('the dummy hash is a validly-formatted argon2id hash (not a stub that fails fast)', async () => {
    // A malformed string rejects in <1ms; a real hash costs ~50ms+. If this
    // ever regresses to a malformed placeholder, this timing floor catches it.
    const start = performance.now();
    const result = await verifyDummyPassword('anything');
    const elapsedMs = performance.now() - start;
    expect(result).toBe(false);
    expect(elapsedMs).toBeGreaterThan(5);
  });
});
