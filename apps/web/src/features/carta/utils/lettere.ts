// Which amount fields carry a companion spelled out in words.
//
// The letters are not decoration: a financing proposal states the figure and
// then repeats it in words, and the words are what prevails if the two ever
// disagree. So the pair has to travel together — the document reads
// "Euro 60.000,00 (sessantamila/00)".
import type { CartaFormData } from '../types.js';

export const COPPIE_LETTERE = {
  importo: 'importoLettere',
  importoCrediti: 'importoCreditiLettere',
  corrispettivo: 'corrispettivoLettere',
  earnoutSoglia: 'earnoutSogliaLettere',
  earnoutImporto: 'earnoutImportoLettere',
} as const satisfies Partial<Record<keyof CartaFormData, keyof CartaFormData>>;

export type CampoImporto = keyof typeof COPPIE_LETTERE;

export function haLettere(campo: keyof CartaFormData): campo is CampoImporto {
  return campo in COPPIE_LETTERE;
}
