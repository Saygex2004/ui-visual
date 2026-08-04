// In-process snapshot cache (SPECIFICATIONS.md §8). One cache, no cross-instance
// coordination (production runs max-instances=1). Every dashboard read is served
// from memory; invalidation is driven by polling the three `meta` documents.
// On rebuild, active/archived membership is diffed and the observed transitions
// are recorded as `listing_archived` / `listing_reactivated` activity events —
// the one Part B write this phase owns.
import type { Firestore } from 'firebase-admin/firestore';
import {
  SCOPES,
  selectOmiEntry,
  selectProceduraConcorsuale,
  type Scope,
  type AreaSnapshot,
  type BloccoSibling,
  type OmiPrice,
  type OmiSelection,
  type ProceduraConcorsualeDoc,
  type ProceduraConcorsualeSelection,
} from '@pvp/shared';
import { metaRepo, activityRepo } from '../repositories/index.js';
import { buildSnapshot } from './build.js';

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

const noopLogger: Logger = { info: () => {}, error: () => {} };

interface ScopeState {
  snapshot: AreaSnapshot;
  activeIds: Set<string>;
  archivedIds: Set<string>;
  summariesById: Map<string, BloccoSibling>;
  omiBySlug: Record<string, OmiPrice>;
  proceduraByKey: Record<string, ProceduraConcorsualeDoc>;
  unrecognizedCategoryCodes: string[];
  builtAtMs: number;
  hasPrevious: boolean;
}

export interface SnapshotCacheOptions {
  metaPollSeconds: number;
  snapshotMaxAgeHours: number;
  logger?: Logger;
}

export class SnapshotCache {
  private readonly db: Firestore;
  private readonly log: Logger;
  private readonly pollMs: number;
  private readonly maxAgeMs: number;
  private readonly states = new Map<Scope, ScopeState>();
  // Last-seen invalidation signals (meta last_success_at / omi fetched_at).
  private lastSignals: { immobili: string | null; corporate: string | null; omi: string | null } = {
    immobili: null,
    corporate: null,
    omi: null,
  };
  private timer: NodeJS.Timeout | undefined;

  constructor(db: Firestore, opts: SnapshotCacheOptions) {
    this.db = db;
    this.log = opts.logger ?? noopLogger;
    this.pollMs = opts.metaPollSeconds * 1000;
    this.maxAgeMs = opts.snapshotMaxAgeHours * 3600 * 1000;
  }

  /** Prime both scopes. No activity events on the first build. */
  async init(): Promise<void> {
    for (const scope of SCOPES) await this.rebuild(scope);
    await this.refreshSignals();
  }

  get(scope: Scope): AreaSnapshot | undefined {
    return this.states.get(scope)?.snapshot;
  }

  isReady(): boolean {
    return SCOPES.every((s) => this.states.has(s));
  }

  /**
   * Blocco siblings for a listing (from the in-memory summaries; 0 Firestore
   * reads). Returns the other active lots of the same proceeding, or `null`
   * when the listing has no blocco key / no group in the current snapshot.
   */
  siblingsFor(
    scope: Scope,
    bloccoKeyValue: string | null,
    selfId: string,
  ): { key: string; count: number; siblings: BloccoSibling[] } | null {
    if (bloccoKeyValue === null) return null;
    const state = this.states.get(scope);
    const entry = state?.snapshot.blocco_index[bloccoKeyValue];
    if (!state || !entry || entry.count < 2) return null;
    const siblings = entry.listing_ids
      .filter((id) => id !== selfId)
      .map((id) => state.summariesById.get(id))
      .filter((s): s is BloccoSibling => s !== undefined);
    return { key: bloccoKeyValue, count: entry.count, siblings };
  }

  /**
   * OMI selection for a listing (DOMAIN_RULES.md §9), from the in-memory raw
   * OMI map (immobili only). The province-capital fallback needs the drill-down
   * capital lookup (Phase 4/5); here we resolve the listing's own comune doc.
   */
  selectOmi(scope: Scope, provincia: string | null, comune: string | null): OmiSelection | null {
    if (scope !== 'immobili') return null;
    const state = this.states.get(scope);
    if (!state) return null;
    return selectOmiEntry(state.omiBySlug, { provincia, comune });
  }

  /**
   * Matched procedura concorsuale for a listing (DOMAIN_RULES.md §12), from
   * the in-memory raw map -- zero further Firestore reads. Not scope-gated
   * (unlike `selectOmi`): relevant to both immobili and corporate listings.
   */
  selectProcedura(
    scope: Scope,
    tribunale: string | null,
    numero: string | null,
    anno: string | null,
  ): ProceduraConcorsualeSelection | null {
    const state = this.states.get(scope);
    if (!state) return null;
    return selectProceduraConcorsuale(state.proceduraByKey, { tribunale, numero, anno });
  }

  /** `cod_tipo_rito` values observed on active immobili listings but not in
   *  the catalog (DOMAIN_RULES.md Appendix A) — feeds the admin categories
   *  screen's non-uncheckable 5th group (UI §8.2). Always empty for corporate. */
  getUnrecognizedCategoryCodes(): string[] {
    return this.states.get('immobili')?.unrecognizedCategoryCodes ?? [];
  }

  /** Rebuild a scope; diff membership vs the previous build and record events. */
  async rebuild(scope: Scope): Promise<AreaSnapshot> {
    const prev = this.states.get(scope);
    const {
      snapshot,
      activeIds,
      archivedIds,
      summariesById,
      omiBySlug,
      proceduraByKey,
      unrecognizedCategoryCodes,
    } = await buildSnapshot(this.db, scope);

    if (prev) {
      await this.recordTransitions(prev, activeIds, archivedIds);
    }

    this.states.set(scope, {
      snapshot,
      activeIds,
      archivedIds,
      summariesById,
      omiBySlug,
      proceduraByKey,
      unrecognizedCategoryCodes,
      builtAtMs: Date.now(),
      hasPrevious: true,
    });
    this.log.info({ scope, version: snapshot.version }, 'snapshot rebuilt');
    return snapshot;
  }

  private async recordTransitions(
    prev: ScopeState,
    activeIds: Set<string>,
    archivedIds: Set<string>,
  ): Promise<void> {
    for (const id of prev.activeIds) {
      if (archivedIds.has(id) && !activeIds.has(id)) {
        await activityRepo.appendEvent(this.db, {
          listing_id: id,
          type: 'listing_archived',
          actor_id: null,
        });
      }
    }
    for (const id of prev.archivedIds) {
      if (activeIds.has(id) && !archivedIds.has(id)) {
        await activityRepo.appendEvent(this.db, {
          listing_id: id,
          type: 'listing_reactivated',
          actor_id: null,
        });
      }
    }
  }

  /** Read the three meta docs and cache their invalidation signals. */
  private async refreshSignals(): Promise<void> {
    const [im, co, omi] = await Promise.all([
      metaRepo.getScopeMeta(this.db, 'immobili'),
      metaRepo.getScopeMeta(this.db, 'corporate'),
      metaRepo.getOmiMeta(this.db),
    ]);
    this.lastSignals = {
      immobili: im?.last_success_at ?? null,
      corporate: co?.last_success_at ?? null,
      omi: omi?.fetched_at ?? null,
    };
  }

  /**
   * One poll cycle: rebuild a scope whose `meta.last_success_at` changed (or,
   * for immobili, whose `omi.fetched_at` changed), plus the max-age safety
   * rebuild. Returns the scopes rebuilt (for tests).
   */
  async poll(): Promise<Scope[]> {
    const [im, co, omi] = await Promise.all([
      metaRepo.getScopeMeta(this.db, 'immobili'),
      metaRepo.getScopeMeta(this.db, 'corporate'),
      metaRepo.getOmiMeta(this.db),
    ]);
    const next = {
      immobili: im?.last_success_at ?? null,
      corporate: co?.last_success_at ?? null,
      omi: omi?.fetched_at ?? null,
    };

    const toRebuild = new Set<Scope>();
    if (next.immobili !== this.lastSignals.immobili) toRebuild.add('immobili');
    if (next.corporate !== this.lastSignals.corporate) toRebuild.add('corporate');
    if (next.omi !== this.lastSignals.omi) toRebuild.add('immobili'); // OMI feeds immobili

    // Max-age safety rebuild.
    const now = Date.now();
    for (const scope of SCOPES) {
      const state = this.states.get(scope);
      if (state && now - state.builtAtMs > this.maxAgeMs) toRebuild.add(scope);
    }

    for (const scope of toRebuild) {
      try {
        await this.rebuild(scope);
      } catch (err) {
        // Keep serving the last good cache on a rebuild failure (§15).
        this.log.error({ err, scope }, 'snapshot rebuild failed; serving stale cache');
      }
    }
    this.lastSignals = next;
    return [...toRebuild];
  }

  startPolling(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.poll();
    }, this.pollMs);
    this.timer.unref?.();
  }

  stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
