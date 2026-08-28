// The view switches, held in memory for a few seconds at a time.
//
// Every authenticated request that names a view consults these, so reading the
// document each time would turn one Firestore read into one per request — the
// dominant cost of the whole service, for a value that changes a few times a
// year. So it is cached, and the cache is refreshed at most once per window.
//
// A write through `invalidate` is seen at once by the instance that made it,
// and within one window by any other instance. That lag is acceptable and
// deliberate: this is a maintenance switch, not an authorisation boundary —
// the grants, which ARE the boundary, are read from the account on every
// request and are not cached at all.
import type { Firestore } from 'firebase-admin/firestore';
import type { StatiViste } from '@pvp/shared';
import { visteStatiRepo } from '../repositories/index.js';

const FINESTRA_MS = 30_000;

export class VisteStatiCache {
  private valore: StatiViste = {};
  private letturaA = 0;
  private inCorso: Promise<void> | null = null;

  constructor(
    private readonly db: Firestore,
    private readonly finestraMs: number = FINESTRA_MS,
  ) {}

  async stati(): Promise<StatiViste> {
    if (Date.now() - this.letturaA < this.finestraMs) return this.valore;
    // One read even under concurrent requests: without this, a cold instance
    // taking ten simultaneous requests would issue ten identical reads.
    this.inCorso ??= this.aggiorna().finally(() => {
      this.inCorso = null;
    });
    await this.inCorso;
    return this.valore;
  }

  /** Called by the write path so the instance that changed it does not serve
   *  its own stale answer for the rest of the window. */
  invalidate(stati: StatiViste): void {
    this.valore = stati;
    this.letturaA = Date.now();
  }

  private async aggiorna(): Promise<void> {
    try {
      const doc = await visteStatiRepo.get(this.db);
      this.valore = doc?.stati ?? {};
      this.letturaA = Date.now();
    } catch {
      // A failed read must not lock everyone out of every view: keep serving
      // the last known answer (empty = all open, on a cold instance) and try
      // again on the next request rather than turning a blip into an outage.
    }
  }
}
