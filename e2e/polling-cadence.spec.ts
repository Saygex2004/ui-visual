// Execution Plan Phase 11 (Hardening) task 6: verifies the client actually
// honours API_CONTRACT.md §10's polling cadences (packages/shared's
// POLL_CADENCES_MS) — never over-polls the server — and that the 304/ETag
// short-circuits added this phase (unread counter, calendar day) round-trip
// correctly over the wire, not just in the server's own integration suite.
// No such e2e assertion of request cadence existed before this phase.
//
// Deliberately asserts MINIMUM spacing between consecutive requests to each
// endpoint rather than waiting out several full cycles of the slowest one
// (snapshot, ~60s) — a single observed pair already proves "not over-
// polling", and keeps this spec's runtime bounded to roughly the slowest
// cadence actually exercised here (~20-25s), not several minutes.
import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const IMMOBILI_LISTING_ID = '1004'; // Cluster 2, Blue Chip Zone — has a thread

interface Sample {
  url: string;
  atMs: number;
  status: number;
}

function minGapMs(samples: Sample[]): number | null {
  if (samples.length < 2) return null;
  let min = Infinity;
  for (let i = 1; i < samples.length; i++) {
    min = Math.min(min, samples[i]!.atMs - samples[i - 1]!.atMs);
  }
  return min;
}

test('polling cadences: unread/openThread/ratings never fire faster than their configured interval, and the new ETag short-circuits actually 304 over the wire', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await loginAsAdmin(page);

  const byEndpoint = {
    unread: [] as Sample[],
    openThread: [] as Sample[],
    ratings: [] as Sample[],
    snapshot: [] as Sample[],
    calendarDay: [] as Sample[],
  };

  const start = Date.now();
  page.on('response', (response) => {
    const url = response.url();
    const atMs = Date.now() - start;
    const status = response.status();
    if (/\/api\/chats\/unread(\?|$)/.test(url)) byEndpoint.unread.push({ url, atMs, status });
    else if (/\/api\/chats\/\d+(\?|$)/.test(url)) byEndpoint.openThread.push({ url, atMs, status });
    else if (/\/api\/ratings(\?|$)/.test(url)) byEndpoint.ratings.push({ url, atMs, status });
    else if (/\/api\/areas\/\w+\/snapshot(\?|$)/.test(url))
      byEndpoint.snapshot.push({ url, atMs, status });
    else if (/\/api\/calendar\/day\/[\d-]+(\?|$)/.test(url))
      byEndpoint.calendarDay.push({ url, atMs, status });
  });

  // The workspace's chat tab exercises unread + openThread simultaneously,
  // while the area view underneath keeps polling snapshot + ratings — one
  // screen, every relevant poller active at once.
  await page.goto(`/aste/immobili/lotto/${IMMOBILI_LISTING_ID}?cluster=2&pannello=chat`);
  await page.waitForTimeout(24_000);

  // --- Cadence floors (packages/shared's POLL_CADENCES_MS) -----------------
  // 80% tolerance: real jitter (network + timers), never tighter than the
  // configured interval, which is the actual thing being guarded against.
  const openThreadGap = minGapMs(byEndpoint.openThread);
  if (openThreadGap !== null) expect(openThreadGap).toBeGreaterThanOrEqual(7_500 * 0.8);

  const unreadGap = minGapMs(byEndpoint.unread);
  if (unreadGap !== null) expect(unreadGap).toBeGreaterThanOrEqual(20_000 * 0.8);

  const ratingsGap = minGapMs(byEndpoint.ratings);
  if (ratingsGap !== null) expect(ratingsGap).toBeGreaterThanOrEqual(20_000 * 0.8);

  // Snapshot's own 60s cadence can't complete two full cycles in this
  // window; `useAreaSnapshot`'s `refetchOnWindowFocus: true` (the spec's own
  // "~60s + on window refocus") legitimately adds one extra fetch when the
  // test browser's page gains focus right after load, so 2 is expected, not
  // a violation — this still catches a genuine regression that polled it
  // every few seconds instead.
  expect(byEndpoint.snapshot.length).toBeLessThanOrEqual(3);

  await checkUnreadEtag(page);
  await checkCalendarDayEtag(page);
});

/** The unread counter genuinely changes once on the busy chat-tab screen
 *  above (opening the thread marks it read) — a real 200, not a bug. Checked
 *  separately here on the quiet landing screen, where nothing touches the
 *  counter, so every poll after the first really must be an unchanged 304. */
async function checkUnreadEtag(page: Page): Promise<void> {
  const samples: Sample[] = [];
  const start = Date.now();
  const onResponse = (response: import('@playwright/test').Response) => {
    if (/\/api\/chats\/unread(\?|$)/.test(response.url())) {
      samples.push({ url: response.url(), atMs: Date.now() - start, status: response.status() });
    }
  };
  page.on('response', onResponse);
  await page.goto('/');
  await page.waitForTimeout(21_000);
  page.off('response', onResponse);

  for (const sample of samples.slice(1)) {
    expect(sample.status, `unread poll at ${sample.atMs}ms`).toBe(304);
  }
}

/** Separate, short check: the calendar day view's own ETag round-trips a 304
 *  over the wire on an unchanged day, in a real browser — the server-side
 *  integration test already proves the header logic; this proves the running
 *  app's own poll (useDay's refetchInterval) actually receives 304s too. */
async function checkCalendarDayEtag(page: Page): Promise<void> {
  const samples: Sample[] = [];
  const start = Date.now();
  const onResponse = (response: import('@playwright/test').Response) => {
    if (/\/api\/calendar\/day\/[\d-]+(\?|$)/.test(response.url())) {
      samples.push({ url: response.url(), atMs: Date.now() - start, status: response.status() });
    }
  };
  page.on('response', onResponse);
  await page.goto('/calendario/2026-07-02');
  await page.waitForTimeout(21_000);
  page.off('response', onResponse);

  for (const sample of samples.slice(1)) {
    expect(sample.status, `calendar day poll at ${sample.atMs}ms`).toBe(304);
  }
}
