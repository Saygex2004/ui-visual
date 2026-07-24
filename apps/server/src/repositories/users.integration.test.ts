// Integration — users repository (TESTING.md §3: "username uniqueness under
// concurrent creates"; DATA_MODEL.md §9 invariants).
import { describe, it, expect, beforeEach } from 'vitest';
import { usersRepo } from './index.js';
import { UsernameTakenError } from './users.js';
import { reseed, testDb } from '../testSupport/emulator.js';

beforeEach(async () => {
  await reseed();
}, 30_000);

describe('usersRepo.create — username uniqueness', () => {
  it('rejects a duplicate username case-insensitively', async () => {
    const db = testDb();
    await usersRepo.create(db, {
      username: 'Unico',
      passwordHash: 'x',
      role: 'user',
      mustChangePassword: true,
    });

    await expect(
      usersRepo.create(db, {
        username: 'unico',
        passwordHash: 'y',
        role: 'user',
        mustChangePassword: true,
      }),
    ).rejects.toThrow(UsernameTakenError);
  });

  it('holds under concurrent creates of the same username — exactly one wins', async () => {
    const db = testDb();
    const attempts = Array.from({ length: 5 }, (_, i) =>
      usersRepo
        .create(db, {
          username: 'concorrente',
          passwordHash: `h${i}`,
          role: 'user',
          mustChangePassword: true,
        })
        .then(() => 'ok' as const)
        .catch((err: unknown) => {
          if (err instanceof UsernameTakenError) return 'taken' as const;
          throw err;
        }),
    );

    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
    expect(results.filter((r) => r === 'taken')).toHaveLength(4);
  });
});

describe('usersRepo.isLastActiveAdmin (DATA_MODEL.md §9, UI §8.1)', () => {
  it('true for the sole active admin', async () => {
    expect(await usersRepo.isLastActiveAdmin(testDb(), 'user-admin-1')).toBe(true);
  });

  it('false for a non-admin', async () => {
    expect(await usersRepo.isLastActiveAdmin(testDb(), 'user-1')).toBe(false);
  });

  it('false once a second active admin exists (neither is "last" anymore)', async () => {
    const db = testDb();
    const second = await usersRepo.create(db, {
      username: 'secondo-admin',
      passwordHash: 'x',
      role: 'admin',
      mustChangePassword: true,
    });

    expect(await usersRepo.isLastActiveAdmin(db, 'user-admin-1')).toBe(false);
    expect(await usersRepo.isLastActiveAdmin(db, second.id)).toBe(false);
  });

  it('true again for the remaining admin once the other is disabled', async () => {
    const db = testDb();
    const second = await usersRepo.create(db, {
      username: 'secondo-admin',
      passwordHash: 'x',
      role: 'admin',
      mustChangePassword: true,
    });
    await usersRepo.setDisabled(db, second.id, true);

    expect(await usersRepo.isLastActiveAdmin(db, 'user-admin-1')).toBe(true);
  });
});
