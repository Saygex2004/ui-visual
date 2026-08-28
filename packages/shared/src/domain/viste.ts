// Who may open which view. Pure and shared, so the server's enforcement and
// the client's rendering cannot drift into two different answers.
import type { Vista } from '../schemas/partB/accounts.js';
import type { StatiViste, StatoVista } from '../schemas/partB/visteStati.js';

export interface ConVista {
  role: 'user' | 'admin';
  viste: Vista[];
}

/** A view with no state recorded is open: absence must not lock anything. */
export function statoVista(vista: Vista, stati?: StatiViste): StatoVista {
  return stati?.[vista] ?? 'attivo';
}

/**
 * An admin may open everything; anyone else only what has been granted AND
 * what is currently open.
 *
 * The admin bypass is deliberate rather than an oversight: permissions and
 * these states are edited from an admin screen, so a rule that could shut an
 * administrator out of it would be able to lock the last one out with no way
 * back in — including by flipping a view to "lavori" and losing the switch.
 */
export function hasVista(user: ConVista, vista: Vista, stati?: StatiViste): boolean {
  if (user.role === 'admin') return true;
  return statoVista(vista, stati) === 'attivo' && user.viste.includes(vista);
}

/** The views to actually render for this account, in the given order. */
export function visteVisibili<T extends Vista>(
  user: ConVista,
  tutte: readonly T[],
  stati?: StatiViste,
): T[] {
  return tutte.filter((v) => hasVista(user, v, stati));
}

/**
 * Whether to show this account a view it holds but cannot currently open,
 * marked as closed for work.
 *
 * "lavori" and "solo_admin" both deny access; they differ in what the person
 * is told. Work is temporary, so saying so is kinder than having the card
 * vanish and look like a permission that was taken away. A view reserved to
 * administrators is simply not theirs, and announcing it would only invite
 * the question of why they cannot open it.
 */
export function inLavorazionePer(user: ConVista, vista: Vista, stati?: StatiViste): boolean {
  return (
    user.role !== 'admin' && statoVista(vista, stati) === 'lavori' && user.viste.includes(vista)
  );
}
