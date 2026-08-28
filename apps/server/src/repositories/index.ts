// Repository layer. Part A modules are READ-ONLY (no create/update/delete
// function exists — asserted structurally in the integration suite,
// TESTING.md §3). Part B collections are writable and owned by their feature
// phases.

export * as listingsRepo from './listings.js';
export * as omiPricesRepo from './omiPrices.js';
export * as metaRepo from './meta.js';
export * as runsRepo from './runs.js';
export * as settingsRepo from './settings.js';
export * as procedureConcorsualiRepo from './procedureConcorsuali.js';

// Part B (app-owned, writable).
export * as activityRepo from './activity.js';
export * as usersRepo from './users.js';
export * as sessionsRepo from './sessions.js';
export * as adminEventsRepo from './adminEvents.js';
export * as ratingsRepo from './ratings.js';
export * as assignmentIndexRepo from './assignmentIndex.js';
export * as chatRepo from './chat.js';
export * as userCountersRepo from './userCounters.js';
export * as attachmentsRepo from './attachments.js';
export * as calendarRepo from './calendar.js';
export * as praticheRepo from './pratiche.js';
export * as cartaTemplateRepo from './cartaTemplate.js';
export * as cartaFirmatariRepo from './cartaFirmatari.js';
