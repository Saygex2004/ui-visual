// Listings read path (API_CONTRACT.md §3): the area snapshot (served entirely
// from the in-memory cache — zero further Firestore reads) and one listing in
// full (a single targeted doc read + cache-derived classification/blocco/OMI).
// No auth in this phase — routes are open; Phase 3 locks every route behind
// sessions (do not invent an interim scheme here).
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  classifyListing,
  bloccoKey,
  AREA_SLUG_TO_SCOPE,
  ListingDetailSchema,
  type AreaSlug,
} from '@pvp/shared';
import type { SnapshotCache } from '../../cache/index.js';
import { listingsRepo, ratingsRepo, chatRepo } from '../../repositories/index.js';
import { ApiError } from '../../plugins/errorEnvelope.js';
import { firstHeaderValue } from '../../lib/http.js';

const VALID_AREA_SLUGS: ReadonlySet<string> = new Set(Object.keys(AREA_SLUG_TO_SCOPE));

export interface ListingsModuleDeps {
  cache: SnapshotCache;
  db: Firestore;
}

export function registerListingsModule(app: FastifyInstance, deps: ListingsModuleDeps): void {
  const { cache, db } = deps;

  app.get<{ Params: { area: string } }>('/areas/:area/snapshot', async (req, reply) => {
    const { area } = req.params;
    if (!VALID_AREA_SLUGS.has(area)) {
      throw new ApiError(404, 'errors.common.notFound');
    }
    const scope = AREA_SLUG_TO_SCOPE[area as AreaSlug];
    const snapshot = cache.get(scope);
    if (!snapshot) {
      // Cache not primed yet (should not happen once /readyz reports ready).
      throw new ApiError(503, 'errors.common.internal');
    }

    reply.header('ETag', snapshot.version);
    const ifNoneMatch = firstHeaderValue(req.headers['if-none-match']);
    if (ifNoneMatch === snapshot.version) {
      // Explicit empty send — returning a value here would serialize a body
      // even on a 304 (Fastify does not suppress it for us).
      return reply.code(304).send();
    }
    return snapshot;
  });

  app.get<{ Params: { id: string } }>('/listings/:id', async (req) => {
    const { id } = req.params;
    const listing = await listingsRepo.getById(db, id);
    if (!listing) {
      throw new ApiError(404, 'errors.common.notFound');
    }

    const classification = classifyListing(listing);
    const key = bloccoKey(listing);
    // Blocco siblings and OMI are derived from the CURRENT snapshot; an
    // archived listing's siblings are simply not tracked there (active-only
    // index) — a null blocco block on an archived detail is expected, not a bug.
    const blocco = cache.siblingsFor(listing.scope, key, id);
    const omi =
      listing.scope === 'immobili'
        ? cache.selectOmi('immobili', listing.provincia, listing.comune)
        : null;
    const rating = await ratingsRepo.getById(db, id);
    const thread = await chatRepo.getThread(db, id);
    const unread = thread ? await chatRepo.unreadCountFor(db, id, req.user!.id) : 0;

    const detail = {
      id: String(listing.id),
      scope: listing.scope,
      tipo_bene: listing.tipo_bene,
      cod_tipo_categ_lotto: listing.cod_tipo_categ_lotto,
      tipo_procedura: listing.tipo_procedura,
      cod_tipo_rito: listing.cod_tipo_rito,
      cod_tipo_registro: listing.cod_tipo_registro,
      numero: listing.numero,
      anno: listing.anno,
      tribunale: listing.tribunale,
      valore_richiesto: listing.valore_richiesto,
      data_pubblicazione: listing.data_pubblicazione,
      data_vendita: listing.data_vendita,
      regione: listing.regione,
      provincia: listing.provincia,
      comune: listing.comune,
      link: listing.link,
      disponibilita: listing.disponibilita,
      descrizione: listing.descrizione, // full, untruncated (UI §4.5)
      archived_at: listing.archived_at,
      classification: {
        area: classification.area,
        cluster_key: classification.clusterKey,
        cluster_number: classification.clusterNumber,
        cluster_name: classification.clusterName,
        bucket: classification.bucket,
        excluded: classification.excluded,
        band: classification.band,
      },
      blocco,
      omi,
      rating,
      thread: { exists: thread !== null, closed: thread?.closed ?? false, unread },
    };

    return ListingDetailSchema.parse(detail);
  });
}
