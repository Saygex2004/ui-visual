// The {{PLACEHOLDER}} tokens a letter template may carry, and the check that
// stops an edit from quietly breaking one.
//
// This matters more than it looks. The acquisto template is 5,300 characters
// of legal text; deleting {{CORRISPETTIVO}} while rewording a sentence
// produces documents with no price in them, and nothing anywhere would say
// so — the generator substitutes what it finds and leaves the rest alone.

/** Every token the generator substitutes. A template may use any of these and
 *  nothing else; anything else survives into the document literally, braces
 *  and all. Kept beside the generator's `vars` — if one gains a token, so
 *  must this. */
export const SEGNAPOSTO_VALIDI = [
  'ASSUNTO_EXTRA_BULLET',
  'BENEFICIARIO',
  'CESSIONARIO',
  'CESSIONARIO_CF',
  'CESSIONARIO_SEDE',
  'CORRISPETTIVO',
  'CORRISPETTIVO_LETTERE',
  'DATA_SITUAZIONE',
  'DEBITORE',
  'DESTINATARIO',
  'DESTINATARIO_CF',
  'EARNOUT_CLAUSE',
  'EROGAZIONE',
  'IMPORTO',
  'IMPORTO_CREDITI',
  'IMPORTO_CREDITI_LETTERE',
  'IMPORTO_CREDITO',
  'IMPORTO_CREDITO_LETTERE',
  'IMPORTO_LETTERE',
  'MASTER_SERVICER',
  'MITTENTE',
  'MITTENTE_PEC',
  'NDG',
  'REFERENTE',
  'REFERENTE_EMAIL',
  'SCADENZA',
  'SCADENZA_OFFERTA',
  'TASSO',
] as const;

const VALIDI = new Set<string>(SEGNAPOSTO_VALIDI);

/** The tokens a piece of template text uses, in first-appearance order. */
export function segnapostoUsati(testo: string): string[] {
  const trovati = testo.match(/\{\{([A-Z_]+)\}\}/g) ?? [];
  return [...new Set(trovati.map((t) => t.slice(2, -2)))];
}

export interface EsitoControllo {
  /** Present in the original text and gone from the edited one. The dangerous
   *  case: the document silently loses whatever that token carried. */
  rimossi: string[];
  /** Written in the edit but not substituted by anything — a typo like
   *  {{CORRISPETIVO}} reaches the document with its braces showing. */
  sconosciuti: string[];
  /** Added, and real. Harmless; reported so the change is visible. */
  aggiunti: string[];
}

/**
 * Compares an edited template against the one it replaces.
 *
 * Deliberately advisory rather than blocking: dropping a placeholder is
 * sometimes exactly the intent — a clause is being removed. What must not
 * happen is dropping one WITHOUT NOTICING, so this names them and the screen
 * asks for confirmation.
 */
export function controllaSegnaposto(originale: string, modificato: string): EsitoControllo {
  const prima = new Set(segnapostoUsati(originale));
  const dopo = segnapostoUsati(modificato);
  const dopoSet = new Set(dopo);

  return {
    rimossi: [...prima].filter((s) => !dopoSet.has(s)),
    sconosciuti: dopo.filter((s) => !VALIDI.has(s)),
    aggiunti: dopo.filter((s) => VALIDI.has(s) && !prima.has(s)),
  };
}

/** Whether anything about this edit is worth stopping to confirm. */
export function daConfermare(esito: EsitoControllo): boolean {
  return esito.rimossi.length > 0 || esito.sconosciuti.length > 0;
}
