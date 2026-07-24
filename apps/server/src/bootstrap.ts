// First-run bootstrap (SPECIFICATIONS.md §7, Phase 3 task 3). On an empty
// `users` collection, creates the initial admin from
// PVPDASH_BOOTSTRAP_ADMIN_PASSWORD, flagged must_change_password. Refuses
// (throws) when the collection is empty and the variable is unset — the
// caller treats that as fatal, matching the fail-closed-and-loud posture
// applied to config validation (SPECIFICATIONS.md §15).
import type { Firestore } from 'firebase-admin/firestore';
import { usersRepo } from './repositories/index.js';
import { hashPassword } from './lib/passwords.js';

export interface BootstrapLogger {
  info: (obj: unknown, msg?: string) => void;
}

export async function bootstrapAdmin(
  db: Firestore,
  bootstrapPassword: string | undefined,
  log: BootstrapLogger,
): Promise<void> {
  const empty = await usersRepo.isEmpty(db);
  if (!empty) return; // already bootstrapped, or accounts already exist

  if (!bootstrapPassword) {
    throw new Error(
      'Cannot start: the `users` collection is empty and PVPDASH_BOOTSTRAP_ADMIN_PASSWORD ' +
        'is not set. Provide it for the first boot, then remove it from the environment.',
    );
  }

  const passwordHash = await hashPassword(bootstrapPassword);
  await usersRepo.create(db, {
    username: 'admin',
    passwordHash,
    role: 'admin',
    mustChangePassword: true,
  });

  // Never log the password — name only the username.
  log.info({ username: 'admin' }, 'bootstrap: initial admin account created');
}
