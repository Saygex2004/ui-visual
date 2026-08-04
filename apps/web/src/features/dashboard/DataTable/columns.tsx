// Column configs per table kind — UI §4.1's show/hide matrix in one place.
// Phase 13 (Claude Design reference) restructures the area tables: N°/Anno
// stacked, Tipo and Tribunale merged into one stacked identity cell led by
// the read-only rating dot, Valore right-aligned. Real estate vs
// credits/shares still differ in exactly one data column (Disponibilità vs
// Descrizione); the archive variant of either kind adds the Cluster column
// (origin, since the archive mixes clusters). The "Apri scheda" + overflow
// actions live in DataTable's frozen actions column, not here.
import type { ReactNode } from 'react';
import type { AreaSlug, ListingRow, BloccoIndexEntry, ClusterBlock } from '@pvp/shared';
import type { SortKey } from '../urlState.js';
import { OccupancyIndicator } from './OccupancyIndicator.js';
import { BloccoBadge } from './BloccoBadge.js';
import { ProceduraConcorsualeIndicator } from './ProceduraConcorsualeIndicator.js';
import { RatingControl, RatingDot } from '../../ratings/RatingControl.js';
import type { RatingsMap } from '../../ratings/join.js';
import {
  formatCurrency,
  formatDate,
  formatText,
  formatComuneProvincia,
  formatNumeroAnno,
  NOT_AVAILABLE,
} from './formatting.js';

export type AreaTableKind = 'real_estate' | 'credits' | 'calendar';

export interface ColumnContext {
  bloccoIndex: Readonly<Record<string, BloccoIndexEntry>>;
  /** The blocco key currently isolated (URL `blocco`), or `null`. */
  activeBlocco: string | null;
  /** This table's own cluster (plain cluster tables); `null` for the
   *  Archivio table, where every row already carries its own `cluster_key`. */
  currentClusterKey: string | null;
  /** The whole snapshot's cluster list — resolves a jump target's number/
   *  buckets (UI §4.4's cross-cluster jump). */
  clusters: readonly ClusterBlock[];
  /** Joined shared ratings (UI §5) — the identity cell's read-only dot. */
  ratings: RatingsMap;
  /** Toggle isolation of one block within its own cluster/table. */
  onIsolate: (bloccoKey: string) => void;
  /** Jump to another cluster: switches cluster + Principali/Fallimenti tab,
   *  isolates the block there, and scrolls it into view. */
  onJump: (targetClusterKey: string, bloccoKey: string) => void;
}

/** `cluster_key` is optional here (present only on archive rows) so the same
 *  column configs render both plain cluster tables and the archive without a
 *  cast at the call site. `area` is optional too (present only on calendar
 *  day rows, which can mix immobili + corporate — DataTable falls back to
 *  its own table-wide `area` prop when a row doesn't carry one). */
export type TableRow = ListingRow & { cluster_key?: string; area?: AreaSlug };

export interface ColumnDef {
  key: string;
  headerKey: string;
  sortKey?: SortKey;
  /** Flex-basis width — a functional default; the Hallmark pass may refine
   *  these visually, not structurally. */
  width: string;
  /** Right-aligns header + cells (numeric columns — Valore). */
  align?: 'right';
  render: (row: TableRow, ctx: ColumnContext) => ReactNode;
}

function bloccoCount(row: TableRow, ctx: ColumnContext): number | null {
  if (row.blocco_key == null) return null;
  return ctx.bloccoIndex[row.blocco_key]?.count ?? null;
}

// UI §4.1: the asset-type column header wording adapts by table kind ("Tipo
// di immobile" vs "Tipo di bene") even though both read the same field.
const TIPO_BENE_CREDITS: ColumnDef = {
  key: 'tipo_bene',
  headerKey: 'table.columns.tipoBene',
  width: '150px',
  render: (row) => formatText(row.tipo_bene),
};

/** Phase 13 identity cell: read-only rating dot + Tipo over Tribunale. */
const TIPO_TRIBUNALE: ColumnDef = {
  key: 'tipo_tribunale',
  headerKey: 'table.columns.tipoTribunale',
  width: '210px',
  render: (row, ctx) => (
    <span className="data-table-identity">
      <RatingDot value={ctx.ratings.get(row.id) ?? null} />
      <span className="data-table-stack">
        <span className="data-table-stack-primary">{formatText(row.tipo_bene)}</span>
        <span className="data-table-stack-secondary">{formatText(row.tribunale)}</span>
      </span>
    </span>
  ),
};

const TIPO_PROCEDURA: ColumnDef = {
  key: 'tipo_procedura',
  headerKey: 'table.columns.tipoProcedura',
  width: '150px',
  render: (row) => formatText(row.tipo_procedura),
};

const DISPONIBILITA: ColumnDef = {
  key: 'disponibilita',
  headerKey: 'table.columns.disponibilita',
  width: '175px',
  render: (row) => <OccupancyIndicator value={row.disponibilita} />,
};

const DESCRIZIONE: ColumnDef = {
  key: 'descrizione',
  headerKey: 'table.columns.descrizione',
  width: '220px',
  render: (row) => formatText(row.descrizione_excerpt),
};

/** Phase 13: Anno emphasized over the procedure number (stacked). */
const NUMERO_ANNO: ColumnDef = {
  key: 'numero_anno',
  headerKey: 'table.columns.numeroAnno',
  width: '92px',
  render: (row) => (
    <span className="data-table-stack">
      <span className="data-table-stack-primary">{row.anno ?? NOT_AVAILABLE}</span>
      <span className="data-table-stack-secondary">{formatNumeroAnno(row.numero, row.anno)}</span>
    </span>
  ),
};

const BLOCCO: ColumnDef = {
  key: 'blocco',
  headerKey: 'table.columns.blocco',
  sortKey: 'blocco',
  width: '78px',
  render: (row, ctx) => (
    <BloccoBadge
      bloccoKey={row.blocco_key}
      count={bloccoCount(row, ctx)}
      effectiveClusterKey={row.cluster_key ?? ctx.currentClusterKey ?? ''}
      ctx={ctx}
    />
  ),
};

const PROCEDURA_CONCORSUALE: ColumnDef = {
  key: 'procedura_concorsuale',
  headerKey: 'table.columns.proceduraConcorsuale',
  width: '40px',
  render: (row) => <ProceduraConcorsualeIndicator present={row.has_procedura_concorsuale} />,
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
  width: '165px',
  render: (row) => formatComuneProvincia(row.comune, row.provincia),
};

const VALORE: ColumnDef = {
  key: 'valore_richiesto',
  headerKey: 'table.columns.valoreRichiesto',
  sortKey: 'valore',
  width: '124px',
  align: 'right',
  render: (row) => (
    <span className="data-table-valore">{formatCurrency(row.valore_richiesto)}</span>
  ),
};

const DATA_PUBBLICAZIONE: ColumnDef = {
  key: 'data_pubblicazione',
  headerKey: 'table.columns.dataPubblicazione',
  sortKey: 'pubblicazione',
  width: '112px',
  render: (row) => formatDate(row.data_pubblicazione),
};

const DATA_VENDITA: ColumnDef = {
  key: 'data_vendita',
  headerKey: 'table.columns.dataVendita',
  sortKey: 'vendita',
  width: '100px',
  render: (row) => formatDate(row.data_vendita),
};

const CLUSTER_ORIGIN: ColumnDef = {
  key: 'cluster_key',
  headerKey: 'table.columns.cluster',
  width: '150px',
  render: (row) => formatText(row.cluster_key ?? null),
};

const CALENDAR_ID: ColumnDef = {
  key: 'id',
  headerKey: 'table.columns.id',
  width: '80px',
  render: (row) => row.id,
};

const CALENDAR_REGIONE: ColumnDef = {
  key: 'regione',
  headerKey: 'table.columns.regione',
  width: '140px',
  render: (row) => formatText(row.regione),
};

/** A day's rows have no cluster/tab context to isolate or jump into (unlike
 *  an area-view table), so this is a plain presence indicator — not
 *  `BloccoBadge`, whose count and click-to-isolate/jump both depend on the
 *  area-wide `bloccoIndex` + nav callbacks a calendar page doesn't have. */
const CALENDAR_BLOCCO: ColumnDef = {
  key: 'blocco',
  headerKey: 'table.columns.blocco',
  width: '90px',
  render: (row) =>
    row.blocco_key ? <span className="calendar-blocco-indicator" title={row.blocco_key} /> : null,
};

/** The calendar day table keeps an in-row Valutazione control — that screen
 *  is a rate-through worklist and its scheda link leaves the calendar (see
 *  RatingControl.tsx). Dashboard/archive rows show the read-only dot only. */
const CALENDAR_RATING: ColumnDef = {
  key: 'valutazione',
  headerKey: 'table.columns.valutazione',
  width: '120px',
  render: (row, ctx) => (
    <RatingControl listingId={row.id} value={ctx.ratings.get(row.id) ?? null} compact />
  ),
};

const CALENDAR_COLUMNS: ColumnDef[] = [
  CALENDAR_RATING,
  TIPO_BENE_CREDITS,
  TIPO_PROCEDURA,
  CALENDAR_BLOCCO,
  TRIBUNALE,
  CALENDAR_REGIONE,
  COMUNE_PROVINCIA,
  DISPONIBILITA,
  VALORE,
  DATA_VENDITA,
];

const REAL_ESTATE_COLUMNS: ColumnDef[] = [
  NUMERO_ANNO,
  BLOCCO,
  PROCEDURA_CONCORSUALE,
  TIPO_TRIBUNALE,
  TIPO_PROCEDURA,
  DISPONIBILITA,
  COMUNE_PROVINCIA,
  VALORE,
  DATA_PUBBLICAZIONE,
  DATA_VENDITA,
];

const CREDITS_COLUMNS: ColumnDef[] = [
  NUMERO_ANNO,
  BLOCCO,
  PROCEDURA_CONCORSUALE,
  TIPO_TRIBUNALE,
  TIPO_PROCEDURA,
  DESCRIZIONE,
  COMUNE_PROVINCIA,
  VALORE,
  DATA_PUBBLICAZIONE,
  DATA_VENDITA,
];

export function getColumns(
  kind: AreaTableKind,
  opts?: { showClusterColumn?: boolean; showIdColumn?: boolean },
): ColumnDef[] {
  if (kind === 'calendar') {
    return opts?.showIdColumn ? [CALENDAR_ID, ...CALENDAR_COLUMNS] : CALENDAR_COLUMNS;
  }
  const base = kind === 'real_estate' ? REAL_ESTATE_COLUMNS : CREDITS_COLUMNS;
  return opts?.showClusterColumn ? [...base, CLUSTER_ORIGIN] : base;
}
