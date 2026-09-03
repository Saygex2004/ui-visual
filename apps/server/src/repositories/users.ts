// Repository — `users` + the `usernames/{lowercased}` uniqueness claim
// (DATA_MODEL.md §9, Part B, app-owned). Creation is transactional: check the
// claim absent, then write the claim + the user doc atomically — this is what
// makes username uniqueness race-safe under concurrent creates
// (TESTING.md §3: "username uniqueness under concurrent creates").
import { randomUUID } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { UserSchema, type User, type Role, type Vista } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const USERS = 'users';
const USERNAMES = 'usernames';

export class UsernameTakenError extends Error {
  constructor(username: string) {
    super(`username already taken: ${username}`);
    this.name = 'UsernameTakenError';
  }
}

function claimId(username: string): string {
  return username.toLowerCase();
}

export interface NewUser {
  username: string;
  passwordHash: string;
  role: Role;
  mustChangePassword: boolean;
}

/** Transactionally claims the username and creates the user. Never deleted
 *  (DATA_MODEL.md §9) — there is deliberately no delete/update-in-place-of-
 *  create path here. */
export async function create(db: Firestore, input: NewUser): Promise<User> {
  const id = randomUUID();
  const claimRef = db.collection(USERNAMES).doc(claimId(input.username));
  const userRef = db.collection(USERS).doc(id);

  await db.runTransaction(async (tx) => {
    const claim = await tx.get(claimRef);
    if (claim.exists) {
      throw new UsernameTakenError(input.username);
    }
    tx.set(claimRef, { user_id: id });
    tx.set(userRef, {
      username: input.username,
      password_hash: input.passwordHash,
      role: input.role,
      disabled: false,
      must_change_password: input.mustChangePassword,
      // No views by default: a new account sees nothing until an admin
      // grants something, rather than silently inheriting access.
      viste: [],
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  const created = await userRef.get();
  return UserSchema.parse({ id, ...firestoreToPlain<Record<string, unknown>>(created.data()) });
}

export async function getById(db: Firestore, id: string): Promise<User | null> {
  const doc = await db.collection(USERS).doc(id).get();
  if (!doc.exists) return null;
  return UserSchema.parse({ id, ...firestoreToPlain<Record<string, unknown>>(doc.data()) });
}

/** Case-insensitive lookup via the uniqueness claim — the login path. */
export async function getByUsername(db: Firestore, username: string): Promise<User | null> {
  const claim = await db.collection(USERNAMES).doc(claimId(username)).get();
  if (!claim.exists) return null;
  const userId = (claim.data() as { user_id: string }).user_id;
  return getById(db, userId);
}

/** Lightweight existence check for bootstrap — avoids reading/parsing every
 *  document just to know whether the collection is empty. */
export async function isEmpty(db: Firestore): Promise<boolean> {
  const snap = await db.collection(USERS).limit(1).get();
  return snap.empty;
}

export async function listAll(db: Firestore): Promise<User[]> {
  const snap = await db.collection(USERS).get();
  return snap.docs.map((doc) =>
    UserSchema.parse({ id: doc.id, ...firestoreToPlain<Record<string, unknown>>(doc.data()) }),
  );
}

export async function setPasswordHash(
  db: Firestore,
  id: string,
  passwordHash: string,
  mustChangePassword: boolean,
): Promise<void> {
  await db.collection(USERS).doc(id).update({
    password_hash: passwordHash,
    must_change_password: mustChangePassword,
    updated_at: FieldValue.serverTimestamp(),
  });
}

export async function setRole(db: Firestore, id: string, role: Role): Promise<void> {
  await db.collection(USERS).doc(id).update({ role, updated_at: FieldValue.serverTimestamp() });
}

export async function setDisabled(db: Firestore, id: string, disabled: boolean): Promise<void> {
  await db.collection(USERS).doc(id).update({ disabled, updated_at: FieldValue.serverTimestamp() });
}

/** True when `id` is currently the sole active (non-disabled) admin —
 *  the guard behind last-admin protection (DATA_MODEL.md §9, UI §8.1). */
export async function isLastActiveAdmin(db: Firestore, id: string): Promise<boolean> {
  const target = await getById(db, id);
  if (!target || target.role !== 'admin' || target.disabled) return false;
  const all = await listAll(db);
  const activeAdmins = all.filter((u) => u.role === 'admin' && !u.disabled);
  return activeAdmins.length <= 1 && activeAdmins.some((u) => u.id === id);
}

/** Replaces the granted views wholesale. A set operation, not add/remove:
 *  the admin screen edits the whole list, and two concurrent partial updates
 *  would otherwise interleave into a list neither admin chose. */
export async function setViste(db: Firestore, id: string, viste: Vista[]): Promise<void> {
  await db.collection(USERS).doc(id).update({
    viste,
    updated_at: FieldValue.serverTimestamp(),
  });
}

/** Sets or clears the Slack member id used to mention this person. */
export async function setSlackId(db: Firestore, id: string, slackId: string | null): Promise<void> {
  await db.collection(USERS).doc(id).update({
    slack_id: slackId,
    updated_at: FieldValue.serverTimestamp(),
  });
}
