// Repository layer. Part A modules are READ-ONLY (no create/update/delete
// function exists — asserted structurally in the integration suite,
// TESTING.md §3). Part B writes are owned by their feature phases; this phase
// carries only the system activity append (`activity`).

export * as listingsRepo from './listings.js';
export * as omiPricesRepo from './omiPrices.js';
export * as metaRepo from './meta.js';
export * as runsRepo from './runs.js';
export * as settingsRepo from './settings.js';

// Part B (app-owned, writable) — scoped to this phase's one write.
export * as activityRepo from './activity.js';
