// Procedural-category (rito) catalog — DOMAIN_RULES.md Appendix A.
// Rendered as four grouped checkboxes in the admin panel (UI §8.2). The DEFAULT
// selection applies when `settings/extraction_categories` is absent. A code not
// in this table is handled fail-open (always stored by the scraper; never
// excluded here; shown as an "unrecognized" group in the admin panel).

export type CategoryGroup =
  'concorsuali' | 'liquidazione_volontaria' | 'esecuzioni' | 'contenzioso';

export interface CategoryGroupInfo {
  readonly key: CategoryGroup;
  readonly label: string;
}

export const CATEGORY_GROUPS: readonly CategoryGroupInfo[] = [
  { key: 'concorsuali', label: 'Procedure concorsuali' },
  { key: 'liquidazione_volontaria', label: 'Liquidazione volontaria e volontaria giurisdizione' },
  { key: 'esecuzioni', label: 'Esecuzioni' },
  { key: 'contenzioso', label: 'Contenzioso civile' },
] as const;

export interface CategoryCode {
  readonly code: string;
  readonly label: string;
  readonly group: CategoryGroup;
}

export const CATEGORY_CATALOG: readonly CategoryCode[] = [
  { code: 'ASP', label: 'Amministrazione Straordinaria Prodi Bis (cci)', group: 'concorsuali' },
  { code: 'CM', label: 'Concordato Minore (cci)', group: 'concorsuali' },
  { code: 'COPR', label: 'Concordato Preventivo', group: 'concorsuali' },
  { code: 'CP', label: 'Concordato Preventivo Omologato (cci)', group: 'concorsuali' },
  { code: 'CSCI', label: 'Concordato Semplificato (cci)', group: 'concorsuali' },
  { code: 'LCAM', label: 'Liquidazione Coatta Amministrativa', group: 'concorsuali' },
  { code: 'LCA', label: 'Liquidazione Coatta Amministrativa (cci)', group: 'concorsuali' },
  { code: 'LC', label: 'Liquidazione Controllata (cci)', group: 'concorsuali' },
  { code: 'LDPD', label: 'Liquidazione del Patrimonio del Debitore', group: 'concorsuali' },
  { code: 'LG', label: 'Liquidazione Giudiziale (cci)', group: 'concorsuali' },
  { code: 'NUCP', label: 'Nuovo Concordato Preventivo', group: 'concorsuali' },
  { code: 'PDCC', label: 'Piano del Consumatore', group: 'concorsuali' },
  { code: 'PRO', label: 'Piano di Ristrutturazione Omologato (cci)', group: 'concorsuali' },
  { code: 'RD', label: 'Ristrutturazione dei Debiti (cci)', group: 'concorsuali' },
  { code: 'FALL', label: 'Fallimentare', group: 'concorsuali' },
  { code: 'NFAL', label: 'Fallimentare (nuovo rito)', group: 'concorsuali' },
  { code: 'ADCC', label: 'Accordo di Composizione della Crisi', group: 'concorsuali' },
  { code: 'PU09', label: 'Ricorso Concordato Minore', group: 'concorsuali' },
  {
    code: 'PU02',
    label: 'Ricorso Fissazione Termine per Deposito Proposta o Accordi',
    group: 'concorsuali',
  },
  { code: 'PU10', label: 'Ricorso Liquidazione Controllata', group: 'concorsuali' },
  { code: 'PU03', label: 'Ricorso per Ammissione Concordato Preventivo', group: 'concorsuali' },
  {
    code: 'PU05',
    label: 'Ricorso per la Dichiarazione Stato Insolvenza (lca)',
    group: 'concorsuali',
  },
  { code: 'PU01', label: 'Ricorso per Liquidazione Giudiziale', group: 'concorsuali' },
  {
    code: 'PU11',
    label: 'Ricorso per Omologazione Piano di Ristrutturazione',
    group: 'concorsuali',
  },
  { code: 'PU08', label: 'Ricorso Ristrutturazione Debiti del Consumatore', group: 'concorsuali' },
  {
    code: 'LIQUVOLGIU',
    label: 'Liquidazione Volontaria - Giudiziale',
    group: 'liquidazione_volontaria',
  },
  { code: 'VOLGIU', label: 'Volontaria Giurisdizione', group: 'liquidazione_volontaria' },
  { code: 'EI80', label: 'Esecuzione Immobiliare Post Legge 80', group: 'esecuzioni' },
  { code: 'ESIM', label: 'Esecuzione Immobiliari', group: 'esecuzioni' },
  { code: 'EICA', label: 'Espropriazione Immobiliare (cartabia)', group: 'esecuzioni' },
  { code: 'ESMO', label: 'Esecuzioni Mobiliari Con Vendita', group: 'esecuzioni' },
  { code: 'EV80', label: 'Esecuzioni Mobiliari Con Vendita Post Legge 80', group: 'esecuzioni' },
  { code: 'EMCA', label: 'Espropriazione Mobiliare (cartabia)', group: 'esecuzioni' },
  { code: 'ESECESATTIMM', label: 'Esecuzioni Esattoriali Immobiliari', group: 'esecuzioni' },
  { code: 'CONTCIV', label: 'Contenzioso Civile', group: 'contenzioso' },
] as const;

/** In effect when `settings/extraction_categories` is absent (the base set). */
export const DEFAULT_CATEGORY_SELECTION: readonly string[] = [
  'ASP',
  'COPR',
  'CP',
  'LCAM',
  'LCA',
  'LG',
  'LIQUVOLGIU',
  'NUCP',
  'FALL',
  'NFAL',
] as const;

export const KNOWN_CATEGORY_CODES: ReadonlySet<string> = new Set(
  CATEGORY_CATALOG.map((c) => c.code),
);
