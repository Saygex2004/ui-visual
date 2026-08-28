// Which required fields are still missing, per section of the form.
//
// Extracted from the screen component, where it sat among 1,200 lines of JSX.
// Pure and section-by-section: the form shows each section's own list beside
// its heading, and generating a document with gaps is allowed but warned
// about — these letters are often drafted before every figure is known.
import type { Azienda } from '../data/aziende.js';
import type { CartaFormData, TipoLettera } from '../types.js';

/** Rich text that renders as nothing: tags and non-breaking spaces only. */
export function htmlIsEmpty(s: string | null | undefined): boolean {
  return (
    !s ||
    !s
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
  );
}

export function missingMittente(azienda: Azienda | undefined, formData: CartaFormData): string[] {
  // Only the blank template needs a sender typed in; every real company
  // carries its own.
  return azienda?.id === 'template-vuoto' && !formData.mittenteNome
    ? ['Ragione sociale mittente']
    : [];
}

export function missingDestinatario(formData: CartaFormData): string[] {
  return formData.destinatarioNome ? [] : ['Ragione sociale'];
}

export function missingLettera(tipo: TipoLettera, formData: CartaFormData): string[] {
  const m: string[] = [];
  if (!formData.oggetto) m.push('Oggetto');
  if (tipo === 'proposta') {
    if (!formData.importo) m.push('Importo');
    if (!formData.scadenza) m.push('Scadenza finanziamento');
  }
  return m;
}

export function missingRinuncia(formData: CartaFormData): string[] {
  const m: string[] = [];
  if (!formData.destinatarioCF) m.push('C.F. società destinataria');
  if (!formData.importoCredito) m.push('Credito complessivo');
  if (!formData.importoRinunciato) m.push('Importo oggetto di rinuncia');
  // Compared against '' rather than falsy: a fiscal value of 0 is a real
  // answer, and `!0` would demand it be filled in again.
  if (formData.valoreFiscale === '') m.push('Valore fiscale del credito');
  if (!formData.legaleNome) m.push('Firmatario');
  return m;
}

export function missingAccettazione(formData: CartaFormData): string[] {
  return formData.testoPropostaOriginale ? [] : ['Proposta originale da citare'];
}

export function missingAcquisto(formData: CartaFormData): string[] {
  const m: string[] = [];
  if (!formData.cessionarioId) m.push('Cessionario');
  if (!formData.masterServicer) m.push('Master servicer');
  if (!formData.debitore) m.push('Debitore');
  if (!formData.importoCrediti) m.push('Importo crediti');
  if (!formData.corrispettivo) m.push('Corrispettivo offerto');
  if (formData.corrispettivoTipo === 'earnout') {
    if (!formData.earnoutSoglia) m.push('Soglia riparto concorsuale');
    if (!formData.earnoutScadenza) m.push('Scadenza incasso riparto');
    if (!formData.earnoutImporto) m.push('Corrispettivo aggiuntivo');
  }
  if (!formData.scadenzaOfferta) m.push('Validità offerta');
  return m;
}

export function missingTesto(tipo: TipoLettera, formData: CartaFormData): string[] {
  const m: string[] = [];
  if (!formData.apertura) m.push('Formula di apertura');
  if (tipo === 'lettera' && htmlIsEmpty(formData.testo)) m.push('Corpo del testo');
  if (!formData.chiusura) m.push('Formula di chiusura');
  return m;
}

/** Everything still missing, across the sections that apply to this document
 *  type — what the "generate anyway?" confirmation lists. */
export function missingTutto(
  tipo: TipoLettera,
  azienda: Azienda | undefined,
  formData: CartaFormData,
): string[] {
  return [
    ...missingMittente(azienda, formData),
    ...missingDestinatario(formData),
    ...missingLettera(tipo, formData),
    ...missingTesto(tipo, formData),
    ...(tipo === 'rinuncia' ? missingRinuncia(formData) : []),
    ...(tipo === 'accettazione' ? missingAccettazione(formData) : []),
    ...(tipo === 'acquisto' ? missingAcquisto(formData) : []),
  ];
}
