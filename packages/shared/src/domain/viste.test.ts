import { describe, expect, it } from 'vitest';
import { hasVista, visteVisibili } from './viste.js';
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
