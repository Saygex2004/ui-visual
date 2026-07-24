// Column configs per table kind — UI §4.1's show/hide matrix in one place.
// Real estate vs credits/shares differ in exactly two columns (Disponibilità
// vs Descrizione); the archive variant of either kind adds the Cluster
// column (origin, since the archive mixes clusters). The Valutazione cell and
// the "Vai all'annuncio →" action live in DataTable's frozen actions column,
// not here (Valutazione is a Phase 6 placeholder this phase).
import type { ReactNode } from 'react';
import type { ListingRow, BloccoIndexEntry } from '@pvp/shared';
import type { SortKey } from '../urlState.js';
import { OccupancyIndicator } from './OccupancyIndicator.js';
import { BloccoBadge } from './BloccoBadge.js';
import {
  formatCurrency,
  formatDate,
  formatText,
  formatComuneProvincia,
  formatNumeroAnno,
} from './formatting.js';

export type AreaTableKind = 'real_estate' | 'credits';

export interface ColumnContext {
  bloccoIndex: Readonly<Record<string, BloccoIndexEntry>>;
}

/** `cluster_key` is optional here (present only on archive rows) so the same
 *  column configs render both plain cluster tables and the archive without a
 *  cast at the call site. */
export type TableRow = ListingRow & { cluster_key?: string };

export interface ColumnDef {
  key: string;
  headerKey: string;
  sortKey?: SortKey;
  /** Flex-basis width — a functional default; the Hallmark pass may refine
   *  these visually, not structurally. */
  width: string;
  render: (row: TableRow, ctx: ColumnContext) => ReactNode;
}

function bloccoCount(row: TableRow, ctx: ColumnContext): number | null {
  if (row.blocco_key == null) return null;
  return ctx.bloccoIndex[row.blocco_key]?.count ?? null;
}

// UI §4.1: the asset-type column header wording adapts by table kind ("Tipo
// di immobile" vs "Tipo di bene") even though both read the same field.
const TIPO_IMMOBILE: ColumnDef = {
  key: 'tipo_bene',
  headerKey: 'table.columns.tipoImmobile',
  width: '160px',
  render: (row) => formatText(row.tipo_bene),
};

const TIPO_BENE_CREDITS: ColumnDef = {
  key: 'tipo_bene',
  headerKey: 'table.columns.tipoBene',
  width: '160px',
  render: (row) => formatText(row.tipo_bene),
};

const TIPO_PROCEDURA: ColumnDef = {
  key: 'tipo_procedura',
  headerKey: 'table.columns.tipoProcedura',
  width: '160px',
  render: (row) => formatText(row.tipo_procedura),
};

const DISPONIBILITA: ColumnDef = {
  key: 'disponibilita',
  headerKey: 'table.columns.disponibilita',
  width: '180px',
  render: (row) => <OccupancyIndicator value={row.disponibilita} />,
};

const DESCRIZIONE: ColumnDef = {
  key: 'descrizione',
  headerKey: 'table.columns.descrizione',
  width: '280px',
  render: (row) => formatText(row.descrizione_excerpt),
};

const NUMERO_ANNO: ColumnDef = {
  key: 'numero_anno',
  headerKey: 'table.columns.numeroAnno',
  width: '110px',
  render: (row) => formatNumeroAnno(row.numero, row.anno),
};

const BLOCCO: ColumnDef = {
  key: 'blocco',
  headerKey: 'table.columns.blocco',
  sortKey: 'blocco',
  width: '90px',
  render: (row, ctx) => <BloccoBadge count={bloccoCount(row, ctx)} />,
};

const TRIBUNALE: ColumnDef = {
  key: 'tribunale',
  headerKey: 'table.columns.tribunale',
  width: '180px',
  render: (row) => formatText(row.tribunale),
};

const COMUNE_PROVINCIA: ColumnDef = {
  key: 'comune_provincia',
  headerKey: 'table.columns.comuneProvincia',
  width: '190px',
  render: (row) => formatComuneProvincia(row.comune, row.provincia),
};

const VALORE: ColumnDef = {
  key: 'valore_richiesto',
  headerKey: 'table.columns.valoreRichiesto',
  sortKey: 'valore',
  width: '140px',
  render: (row) => formatCurrency(row.valore_richiesto),
};

const DATA_PUBBLICAZIONE: ColumnDef = {
  key: 'data_pubblicazione',
  headerKey: 'table.columns.dataPubblicazione',
  sortKey: 'pubblicazione',
  width: '130px',
  render: (row) => formatDate(row.data_pubblicazione),
};

const DATA_VENDITA: ColumnDef = {
  key: 'data_vendita',
  headerKey: 'table.columns.dataVendita',
  sortKey: 'vendita',
  width: '130px',
  render: (row) => formatDate(row.data_vendita),
};

const CLUSTER_ORIGIN: ColumnDef = {
  key: 'cluster_key',
  headerKey: 'table.columns.cluster',
  width: '150px',
  render: (row) => formatText(row.cluster_key ?? null),
};

const REAL_ESTATE_COLUMNS: ColumnDef[] = [
  TIPO_IMMOBILE,
  TIPO_PROCEDURA,
  DISPONIBILITA,
  NUMERO_ANNO,
  BLOCCO,
  TRIBUNALE,
  COMUNE_PROVINCIA,
  VALORE,
  DATA_PUBBLICAZIONE,
  DATA_VENDITA,
];

const CREDITS_COLUMNS: ColumnDef[] = [
  TIPO_BENE_CREDITS,
  TIPO_PROCEDURA,
  DESCRIZIONE,
  NUMERO_ANNO,
  BLOCCO,
  TRIBUNALE,
  COMUNE_PROVINCIA,
  VALORE,
  DATA_PUBBLICAZIONE,
  DATA_VENDITA,
];

export function getColumns(
  kind: AreaTableKind,
  opts?: { showClusterColumn?: boolean },
): ColumnDef[] {
  const base = kind === 'real_estate' ? REAL_ESTATE_COLUMNS : CREDITS_COLUMNS;
  return opts?.showClusterColumn ? [...base, CLUSTER_ORIGIN] : base;
}
