// Exclusion rules (DOMAIN_RULES.md §5) — real estate only.
// A real-estate listing whose `cod_tipo_rito` is in this set is excluded from
// every cluster and from automatic calendar assignment. Null/unrecognized rito
// is NEVER excluded (fail-open). The corporate scope is never evaluated.
// The set is deliberately easy to edit; its *meaning* (the four groups) is the
// contract, this code set its current encoding (see §5 verification note).

export type ExclusionGroup =
  'ordinary_enforcement' | 'movable_enforcement' | 'tax_enforcement' | 'civil_litigation';

export interface ExclusionCode {
  readonly code: string;
  readonly label: string;
  readonly group: ExclusionGroup;
}

export const EXCLUSION_CODES: readonly ExclusionCode[] = [
  { code: 'EI80', label: 'Esecuzione Immobiliare Post Legge 80', group: 'ordinary_enforcement' },
  { code: 'ESIM', label: 'Esecuzione Immobiliari', group: 'ordinary_enforcement' },
  { code: 'EICA', label: 'Espropriazione Immobiliare (cartabia)', group: 'ordinary_enforcement' },
  { code: 'ESMO', label: 'Esecuzioni Mobiliari Con Vendita', group: 'movable_enforcement' },
  {
    code: 'EV80',
    label: 'Esecuzioni Mobiliari Con Vendita Post Legge 80',
    group: 'movable_enforcement',
  },
  { code: 'EMCA', label: 'Espropriazione Mobiliare (cartabia)', group: 'movable_enforcement' },
  {
    code: 'ESECESATTIMM',
    label: 'Esecuzioni Esattoriali Immobiliari',
    group: 'tax_enforcement',
  },
  { code: 'CONTCIV', label: 'Contenzioso Civile', group: 'civil_litigation' },
] as const;

export const EXCLUSION_RITO_CODES: ReadonlySet<string> = new Set(
  EXCLUSION_CODES.map((e) => e.code),
);
