import { describe, it, expect } from 'vitest';
import { isEligibleForCalendar, diversifiedDraw, type DiversifiableListing } from './calendar.js';
import { classifyListing } from './classify.js';
import { ListingSchema } from '../schemas/partA/listing.js';
import { loadFixture } from '../__fixtures__/load.js';

const listings = loadFixture<unknown[]>('listings.json').map((l) => ListingSchema.parse(l));
const assignmentIds = new Set(
  loadFixture<Array<{ id: string }>>('assignment_index.json').map((a) => a.id),
);

const hasEntry = (id: number) => assignmentIds.has(String(id));

describe('isEligibleForCalendar (DOMAIN_RULES §8)', () => {
  it('eligible: active immobili, not excluded, never assigned', () => {
    const l = listings.find((x) => x.id === 1002)!; // Red, not excluded, no entry
    expect(isEligibleForCalendar(l, { hasAssignmentEntry: hasEntry(l.id) })).toBe(true);
  });

  it('corporate is never eligible automatically', () => {
    const l = listings.find((x) => x.id === 2001)!;
    expect(isEligibleForCalendar(l, { hasAssignmentEntry: false })).toBe(false);
  });

  it('excluded rito → ineligible', () => {
    const l = listings.find((x) => x.id === 1008)!; // ESIM
    expect(isEligibleForCalendar(l, { hasAssignmentEntry: false })).toBe(false);
  });

  it('archived → ineligible', () => {
    const l = listings.find((x) => x.id === 1051)!; // archived
    expect(isEligibleForCalendar(l, { hasAssignmentEntry: false })).toBe(false);
  });

  it('already assigned (or completed) → ineligible', () => {
    const l = listings.find((x) => x.id === 1001)!; // has assignment entry (completed)
    expect(isEligibleForCalendar(l, { hasAssignmentEntry: true })).toBe(false);
  });
});

// The eligible pool, computed exactly as the assignment path would.
const eligiblePool: DiversifiableListing[] = listings.filter((l) =>
  isEligibleForCalendar(l, { hasAssignmentEntry: hasEntry(l.id) }),
);

describe('diversifiedDraw (DOMAIN_RULES §8)', () => {
  it('is deterministic under a fixed seed', () => {
    const a = diversifiedDraw(eligiblePool, 6, 'seed-fixed');
    const b = diversifiedDraw(eligiblePool, 6, 'seed-fixed');
    expect(a).toEqual(b);
  });

  it('draws only from the pool, without duplicates', () => {
    const drawn = diversifiedDraw(eligiblePool, 6, 'seed-1');
    const poolIds = new Set(eligiblePool.map((l) => String(l.id)));
    expect(new Set(drawn).size).toBe(drawn.length); // unique
    for (const id of drawn) expect(poolIds.has(id)).toBe(true);
  });

  it('spreads across cells (regions/bands), not a run of one cluster', () => {
    const drawn = diversifiedDraw(eligiblePool, 6, 'seed-1');
    const clusters = new Set(
      drawn.map((id) => classifyListing(listings.find((l) => String(l.id) === id)!).clusterKey),
    );
    expect(clusters.size).toBeGreaterThan(1);
  });

  it('a pool smaller than the target yields the whole pool (short day, never padded)', () => {
    const drawn = diversifiedDraw(eligiblePool, 1000, 'seed-1');
    expect(new Set(drawn)).toEqual(new Set(eligiblePool.map((l) => String(l.id))));
    expect(drawn).toHaveLength(eligiblePool.length);
  });

  it('never draws an ineligible listing (excluded / corporate / archived / assigned)', () => {
    const drawn = new Set(diversifiedDraw(eligiblePool, 1000, 'seed-1'));
    const ineligibleIds = listings
      .filter((l) => !isEligibleForCalendar(l, { hasAssignmentEntry: hasEntry(l.id) }))
      .map((l) => String(l.id));
    for (const id of ineligibleIds) expect(drawn.has(id)).toBe(false);
  });

  it('empty pool or non-positive target → empty draw', () => {
    expect(diversifiedDraw([], 5, 's')).toEqual([]);
    expect(diversifiedDraw(eligiblePool, 0, 's')).toEqual([]);
  });
});
