// Who may sign, and under what title: the administrator's list where one
// exists, the names shipped in code otherwise — the same contract the letter
// templates use, so "customised" always means "someone decided this", never
// "a copy was made at install time and has been drifting since".
import type { CartaFirmatari, Firmatario } from '@pvp/shared';
import { FIRMATARI_FREQUENTI, QUALIFICHE_RINUNCIA } from '../data/aziende.js';

export interface Anagrafica {
  firmatari: Firmatario[];
  qualifiche: string[];
}

export const ANAGRAFICA_DI_FABBRICA: Anagrafica = {
  firmatari: FIRMATARI_FREQUENTI,
  qualifiche: [...QUALIFICHE_RINUNCIA],
};

export function anagraficaEffettiva(custom: CartaFirmatari | null | undefined): Anagrafica {
  if (!custom) return ANAGRAFICA_DI_FABBRICA;
  // Each list falls back on its own: an administrator who empties the titles
  // but keeps the people should not be left with a select that cannot be
  // answered, and vice versa.
  return {
    firmatari: custom.firmatari.length ? custom.firmatari : ANAGRAFICA_DI_FABBRICA.firmatari,
    qualifiche: custom.qualifiche.length ? custom.qualifiche : ANAGRAFICA_DI_FABBRICA.qualifiche,
  };
}
