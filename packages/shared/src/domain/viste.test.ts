import { describe, expect, it } from 'vitest';
import { hasVista, inLavorazionePer, statoVista, visteVisibili } from './viste.js';
import { VISTE } from '../schemas/partB/accounts.js';

const utente = (viste: (typeof VISTE)[number][] = []) => ({ role: 'user' as const, viste });
const admin = { role: 'admin' as const, viste: [] };

describe('hasVista', () => {
  it('lets an admin open everything, even with nothing granted', () => {
    // Deliberate: permissions are edited from an admin screen, so a rule that
    // could strip an administrator of access to it could lock the last one out.
    for (const v of VISTE) expect(hasVista(admin, v)).toBe(true);
  });

  it('grants a normal account exactly what it was given, and nothing more', () => {
    const u = utente(['pratiche']);
    expect(hasVista(u, 'pratiche')).toBe(true);
    expect(hasVista(u, 'immobili')).toBe(false);
    expect(hasVista(u, 'crediti')).toBe(false);
  });

  it('gives an unconfigured account nothing', () => {
    for (const v of VISTE) expect(hasVista(utente(), v)).toBe(false);
  });
});

describe('visteVisibili', () => {
  it('keeps the caller order rather than the stored order', () => {
    // The landing renders in a fixed order; what a user happens to have
    // stored must not reshuffle the cards.
    expect(visteVisibili(utente(['pratiche', 'immobili']), VISTE)).toEqual([
      'immobili',
      'pratiche',
    ]);
  });

  it('returns everything for an admin and nothing for an unconfigured user', () => {
    expect(visteVisibili(admin, VISTE)).toEqual([...VISTE]);
    expect(visteVisibili(utente(), VISTE)).toEqual([]);
  });
});

describe('stato della vista', () => {
  const concessa = utente(['pratiche']);

  it('treats a view with no state recorded as open', () => {
    // Absence must never lock anything: an installation that has never
    // touched these switches behaves exactly as it did before they existed.
    expect(statoVista('pratiche')).toBe('attivo');
    expect(statoVista('pratiche', {})).toBe('attivo');
    expect(hasVista(concessa, 'pratiche', {})).toBe(true);
  });

  it('closes a granted view while it is reserved to admins or under work', () => {
    expect(hasVista(concessa, 'pratiche', { pratiche: 'solo_admin' })).toBe(false);
    expect(hasVista(concessa, 'pratiche', { pratiche: 'lavori' })).toBe(false);
  });

  it('never shuts an admin out — including of the screen holding the switch', () => {
    for (const stato of ['solo_admin', 'lavori'] as const) {
      expect(hasVista(admin, 'pratiche', { pratiche: stato })).toBe(true);
    }
  });

  it('closing one view leaves the others alone', () => {
    const u = utente(['pratiche', 'immobili']);
    expect(visteVisibili(u, VISTE, { pratiche: 'lavori' })).toEqual(['immobili']);
  });

  it('does not resurrect a view the account was never granted', () => {
    // "attivo" is a switch on the view, not a grant: it cannot hand anyone
    // access they do not have.
    expect(hasVista(utente(), 'pratiche', { pratiche: 'attivo' })).toBe(false);
  });

  it('announces work in progress, but not a view reserved to admins', () => {
    // Work is temporary, so saying so beats a card that silently vanishes and
    // reads as a permission taken away. A reserved view is simply not theirs.
    expect(inLavorazionePer(concessa, 'pratiche', { pratiche: 'lavori' })).toBe(true);
    expect(inLavorazionePer(concessa, 'pratiche', { pratiche: 'solo_admin' })).toBe(false);
    // Nothing to announce to someone who could not open it anyway...
    expect(inLavorazionePer(utente(), 'pratiche', { pratiche: 'lavori' })).toBe(false);
    // ...nor to an admin, who can simply open it.
    expect(inLavorazionePer(admin, 'pratiche', { pratiche: 'lavori' })).toBe(false);
  });
});
