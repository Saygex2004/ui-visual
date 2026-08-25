// Who may open which view. Pure and shared, so the server's enforcement and
// the client's rendering cannot drift into two different answers.
import type { Vista } from '../schemas/partB/accounts.js';

export interface ConVista {
  role: 'user' | 'admin';
  viste: Vista[];
}

/**
 * An admin may open everything; anyone else only what has been granted.
 *
 * The admin bypass is deliberate rather than an oversight: permissions are
 * edited from an admin screen, so a rule that could strip an administrator of
 * access to it would be able to lock the last one out with no way back in.
 */
export function hasVista(user: ConVista, vista: Vista): boolean {
  return user.role === 'admin' || user.viste.includes(vista);
}

/** The views to actually render for this account, in the given order. */
export function visteVisibili<T extends Vista>(user: ConVista, tutte: readonly T[]): T[] {
  return tutte.filter((v) => hasVista(user, v));
}
