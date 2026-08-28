// The wording actually used: an admin's override where one exists, the text
// shipped in code otherwise.
//
// One function, used by both the letterhead view and the admin editor, so
// "what the document will say" and "what you are editing" cannot disagree.
import type { CartaTemplate, TipoTemplate } from '@pvp/shared';
import { TESTI_DEFAULT } from '../data/aziende.js';

export interface TestiLettera {
  apertura: string;
  corpo: string;
  chiusura: string;
}

/** The shipped text for a type — the baseline an override replaces. */
export function testiDiFabbrica(tipo: TipoTemplate): TestiLettera {
  const d = TESTI_DEFAULT[tipo] as Partial<TestiLettera> | undefined;
  return { apertura: d?.apertura ?? '', corpo: d?.corpo ?? '', chiusura: d?.chiusura ?? '' };
}

export function testiEffettivi(tipo: TipoTemplate, overrides: CartaTemplate[]): TestiLettera {
  const o = overrides.find((t) => t.tipo === tipo);
  return o ? { apertura: o.apertura, corpo: o.corpo, chiusura: o.chiusura } : testiDiFabbrica(tipo);
}
