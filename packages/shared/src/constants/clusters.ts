// Cluster taxonomy (DOMAIN_RULES.md §2 real estate, §3 credits).
// Real-estate clusters route by `regione`; credits clusters route by
// `cod_tipo_categ_lotto`. Numbers are area-local (UI §2.4) and fixed here.
// Canonical region spellings match the PVP labels (DOMAIN_RULES.md §2).

export type RealEstateClusterKey = 'red' | 'blue_chip' | 'green' | 'grey' | 'black';
export type CreditsClusterKey = 'crediti' | 'partecipazioni';
export type ClusterKey = RealEstateClusterKey | CreditsClusterKey;

export interface RealEstateCluster {
  readonly key: RealEstateClusterKey;
  readonly number: number; // area-local (1..5)
  readonly name: string;
  readonly character: string;
  readonly regions: readonly string[]; // empty for the catch-all Black Zone
}

export interface CreditsCluster {
  readonly key: CreditsClusterKey;
  readonly number: number; // area-local (1..2)
  readonly name: string;
  readonly routedBy: string | null; // cod_tipo_categ_lotto value; null = default
}

export const REAL_ESTATE_CLUSTERS: readonly RealEstateCluster[] = [
  {
    key: 'red',
    number: 1,
    name: 'Red Zone — Core Tradizionale',
    character: 'Alto rendimento, alto rischio operativo',
    regions: ['Campania', 'Sicilia', 'Calabria', 'Puglia'],
  },
  {
    key: 'blue_chip',
    number: 2,
    name: 'Blue Chip Zone — Cash Flow Generativi',
    character: 'Alta liquidità, assorbimento rapido',
    regions: ['Lombardia', 'Lazio', 'Piemonte', 'Emilia-Romagna', 'Veneto', 'Toscana'],
  },
  {
    key: 'green',
    number: 3,
    name: 'Green Zone — Basso Rischio / Basso Rendimento',
    character: 'Basso rischio operativo, burocrazia difendibile',
    regions: [
      'Friuli-Venezia Giulia',
      'Trentino-Alto Adige',
      'Marche',
      'Umbria',
      'Abruzzo',
      'Sardegna',
      'Liguria',
    ],
  },
  {
    key: 'grey',
    number: 4,
    name: 'Grey Zone — Volumi Ridotti',
    character: 'Micro-mercati, bassa liquidità',
    regions: ['Molise', 'Basilicata', "Valle d'Aosta"],
  },
  {
    key: 'black',
    number: 5,
    name: 'Black Zone — Non Geolocalizzati',
    character: 'Catch-all per listing non geolocalizzati da PVP',
    regions: [],
  },
] as const;

/** The catch-all cluster for null / unrecognized regions. */
export const BLACK_ZONE_KEY: RealEstateClusterKey = 'black';

/** The 20 recognized regions (union of the four geolocated clusters). */
export const RECOGNIZED_REGIONS: readonly string[] = REAL_ESTATE_CLUSTERS.flatMap((c) => c.regions);

/** region (canonical spelling) → cluster key. Missing ⇒ Black Zone. */
export const REGION_TO_CLUSTER: ReadonlyMap<string, RealEstateClusterKey> = new Map(
  REAL_ESTATE_CLUSTERS.flatMap((c) => c.regions.map((r) => [r, c.key] as const)),
);

export const CREDITS_CLUSTERS: readonly CreditsCluster[] = [
  { key: 'crediti', number: 1, name: 'Crediti — Cessione di Crediti', routedBy: 'CREDITI' },
  {
    key: 'partecipazioni',
    number: 2,
    name: 'Partecipazioni — Quote Societarie',
    routedBy: 'QUOTA_SOCIETARIA',
  },
] as const;

/** The defensive default when a corporate code is null/unrecognized (§3). */
export const CREDITS_DEFAULT_CLUSTER: CreditsClusterKey = 'crediti';

/** cod_tipo_categ_lotto → credits cluster key. */
export const CATEG_LOTTO_TO_CLUSTER: ReadonlyMap<string, CreditsClusterKey> = new Map(
  CREDITS_CLUSTERS.filter((c) => c.routedBy !== null).map((c) => [c.routedBy as string, c.key]),
);
