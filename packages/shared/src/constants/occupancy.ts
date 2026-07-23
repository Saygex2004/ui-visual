// Occupancy labels (`disponibilita`, DATA_MODEL.md §3.2). Exactly one of six,
// already summarized by the scraper (highest-risk-wins); the application treats
// the label as authoritative and never re-derives it.

export const OCCUPANCY_LABELS = [
  'Libero',
  'Occupato',
  'Occupato senza titolo',
  'In corso di liberazione',
  'Parzialmente occupato',
  'Non specificato',
] as const;

export type OccupancyLabel = (typeof OCCUPANCY_LABELS)[number];
