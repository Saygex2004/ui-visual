// The form's initial values, lifted out of the screen component.
//
// Kept as a function of the selected company rather than a constant: the
// signatory fields are prefilled from whichever company is chosen, and a
// shared constant would be mutated by the first edit.
import type { Azienda } from './data/aziende.js';
import type { CartaFormData } from './types.js';
import { TESTI_DEFAULT } from './data/aziende.js';

/** Today, as the date inputs expect it. */
function oggi(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function datiIniziali(azienda: Azienda): CartaFormData {
  const testi = TESTI_DEFAULT.proposta;
  return {
    data: oggi(),
    destinatarioNome: '',
    destinatarioVia: '',
    destinatarioCap: '',
    destinatarioCitta: '',
    destinatarioPec: '',
    oggetto: 'Proposta di finanziamento',
    importo: '',
    importoLettere: '',
    scadenza: '31 dicembre 2026',
    tasso: '10',
    conErogazione: true, // proposta: include o meno la riga "Erogazione"
    apertura: testi.apertura ?? '',
    testo: testi.corpo ?? '',
    chiusura: testi.chiusura ?? '',
    // template vuoto: mittente manuale
    mittenteNome: '',
    // firma libera (tutti i tipi): intestazione + 1/2 firmatari, tutto opzionale
    firmaSenza: false,
    firmaIntestazione: '',
    // accettazione extra
    testoPropostaOriginale: '', // testo della proposta citata nell'accettazione
    // rinuncia a crediti extra
    destinatarioCF: '',
    importoCredito: '',
    importoRinunciato: '',
    dataSituazione: oggi(),
    valoreFiscale: '',
    legaleNome: azienda.firmatario?.nome || '',
    legaleCarica: azienda.firmatario?.carica || 'legale rappresentante',
    legaleGenere: azienda.firmatario?.genere ?? 'M',
    // acquisto crediti pecuniari extra
    destinatarioReferente: '',
    cessionarioId: '',
    masterServicer: '',
    debitore: '',
    ndg: '',
    assuntoExtraTipo: '', // '' | 'concordato' | 'ipotecario' | 'libero'
    concordatoTribunale: '',
    concordatoNumero: '',
    concordatoImporto: '',
    ipotecarioGrado: '',
    assuntoExtraLibero: '',
    importoCrediti: '',
    importoCreditiLettere: '',
    corrispettivoTipo: 'fisso', // 'fisso' | 'earnout'
    corrispettivo: '',
    corrispettivoLettere: '',
    earnoutSoglia: '',
    earnoutSogliaLettere: '',
    earnoutScadenza: '',
    earnoutImporto: '',
    earnoutImportoLettere: '',
    scadenzaOfferta: '',
    numFirmatari: 1,
    firmatario1Nome: '',
    firmatario1Carica: '',
    firmatario2Nome: '',
    firmatario2Carica: '',
  };
}
