// The subject line each document type carries by default.
//
// A letter of acceptance is "Accettazione proposta di finanziamento" and a
// binding offer is "Offerta vincolante di acquisto di crediti pecuniari" —
// these are the names of the instruments, not a suggestion, so choosing the
// type has to fill the subject in. A free-form letter has no standard subject
// and gets none.
import type { TipoLettera } from '../types.js';

export const OGGETTI_PREDEFINITI: Record<TipoLettera, string> = {
  proposta: 'Proposta di finanziamento',
  accettazione: 'Accettazione proposta di finanziamento',
  rinuncia: 'Rinuncia a crediti',
  acquisto: 'Offerta vincolante di acquisto di crediti pecuniari',
  lettera: '',
};

/** The subject after switching type, given what is currently in the field.
 *
 *  Anything the user wrote themselves survives the switch: only a subject
 *  still sitting at some type's default is treated as "not yet written" and
 *  replaced. That is what keeps the field both automatic and hand-editable,
 *  without a flag to explain and get out of step.  */
export function oggettoPerTipo(nuovo: TipoLettera, oggettoCorrente: string): string {
  const scrittoAMano = !Object.values(OGGETTI_PREDEFINITI).includes(oggettoCorrente.trim());
  return scrittoAMano && oggettoCorrente.trim() !== ''
    ? oggettoCorrente
    : OGGETTI_PREDEFINITI[nuovo];
}
