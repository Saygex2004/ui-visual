// The letterhead form's shape — the contract between the form, the preview
// and the Word generator. Derived from the standalone app's initial state, so
// every field it carried survives the port; the three that are not strings
// are typed as what they are rather than coerced.

/** Which document is being produced. Mirrors TIPI_DOCUMENTO in the data file
 *  — read from there, not inferred: a first pass at this union guessed four
 *  and missed 'lettera' (the free-form one), which the generator branches on
 *  in six places. TypeScript caught the impossible comparison. */
export type TipoLettera = 'proposta' | 'accettazione' | 'rinuncia' | 'lettera' | 'acquisto';

/** The extra clause an "acquisto" letter can carry in its recitals. */
export type AssuntoExtra = '' | 'concordato' | 'ipotecario' | 'libero';

export interface CartaFormData {
  data: string;

  // recipient
  destinatarioNome: string;
  destinatarioVia: string;
  destinatarioCap: string;
  destinatarioCitta: string;
  destinatarioPec: string;
  destinatarioCF: string;
  destinatarioReferente: string;

  oggetto: string;

  // body
  apertura: string;
  testo: string;
  chiusura: string;

  // amounts — kept as typed strings, not numbers: these are transcribed from
  // documents and an empty field must stay empty rather than becoming 0.
  importo: string;
  importoLettere: string;
  scadenza: string;
  tasso: string;
  /** Whether the proposta includes the "Erogazione" line. */
  conErogazione: boolean;

  /** Only for the blank template, where the sender is typed by hand. */
  mittenteNome: string;

  // signature block
  firmaSenza: boolean;
  firmaIntestazione: string;
  numFirmatari: number;
  firmatario1Nome: string;
  firmatario1Carica: string;
  firmatario2Nome: string;
  firmatario2Carica: string;

  /** The quoted proposal an "accettazione" replies to. */
  testoPropostaOriginale: string;

  // rinuncia
  importoCredito: string;
  importoRinunciato: string;
  dataSituazione: string;
  valoreFiscale: string;
  legaleNome: string;
  legaleCarica: string;
  legaleGenere: 'M' | 'F';

  // acquisto
  cessionarioId: string;
  masterServicer: string;
  debitore: string;
  ndg: string;
  assuntoExtraTipo: AssuntoExtra;
  concordatoTribunale: string;
  concordatoNumero: string;
  concordatoImporto: string;
  ipotecarioGrado: string;
  assuntoExtraLibero: string;
  importoCrediti: string;
  importoCreditiLettere: string;
  corrispettivoTipo: 'fisso' | 'earnout';
  corrispettivo: string;
  corrispettivoLettere: string;
  earnoutSoglia: string;
  earnoutSogliaLettere: string;
  earnoutScadenza: string;
  earnoutImporto: string;
  earnoutImportoLettere: string;
  scadenzaOfferta: string;
}

/**
 * What the Word generator receives: the form plus the kind of letter.
 *
 * `tipo` is deliberately NOT a form field — the app keeps it as separate
 * state and merges it at the call site. Modelling that here makes the
 * generator's real input explicit instead of leaving it an undeclared extra
 * property nobody typed.
 */
export interface DocumentoInput extends CartaFormData {
  tipo: TipoLettera;
}
