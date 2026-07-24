// Integration — first-run bootstrap (SPECIFICATIONS.md §7, Phase 3 task 3).
import { describe, it, expect } from 'vitest';
import { bootstrapAdmin } from './bootstrap.js';
import { usersRepo } from './repositories/index.js';
import { verifyPassword } from './lib/passwords.js';
import { reseed, testDb } from './testSupport/emulator.js';

const noopLog = { info: () => {} };

async function wipeUsers(): Promise<void> {
  const db = testDb();
  await db.recursiveDelete(db.collection('users'));
  await db.recursiveDelete(db.collection('usernames'));
}

describe('bootstrapAdmin', () => {
  it('creates the initial admin when `users` is empty and a password is configured', async () => {
    await wipeUsers();
    const db = testDb();

    await bootstrapAdmin(db, 'InitialAdminPass1!', noopLog);

    const admin = await usersRepo.getByUsername(db, 'admin');
    expect(admin).not.toBeNull();
    expect(admin!.role).toBe('admin');
    expect(admin!.disabled).toBe(false);
    expect(admin!.must_change_password).toBe(true);
    expect(await verifyPassword(admin!.password_hash, 'InitialAdminPass1!')).toBe(true);
  });

  it('refuses (throws) when `users` is empty and no bootstrap password is configured', async () => {
    await wipeUsers();
    const db = testDb();

    await expect(bootstrapAdmin(db, undefined, noopLog)).rejects.toThrow(
      /PVPDASH_BOOTSTRAP_ADMIN_PASSWORD/,
    );

    const admin = await usersRepo.getByUsername(db, 'admin');
    expect(admin).toBeNull(); // nothing was created
  });

  it('does nothing when `users` already has accounts, even without a password (never re-bootstraps)', async () => {
    await reseed(); // seeds the two fixture users, including one named "admin"
    const db = testDb();

    await expect(bootstrapAdmin(db, undefined, noopLog)).resolves.toBeUndefined();

    const all = await usersRepo.listAll(db);
    expect(all).toHaveLength(2); // unchanged — no duplicate/second admin appeared
  });
});
