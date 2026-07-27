// Settings module (API_CONTRACT.md §8, DATA_MODEL.md §7): the extraction-
// categories read/write. `PUT` is THE ONLY PART A WRITE IN THIS CODEBASE —
// admin-gated, going through settingsRepo.setExtractionCategories exclusively
// (00_OVERVIEW.md §5). A separate module from `admin` per SPECIFICATIONS.md
// §2's own module list ("one module per bounded feature... admin, settings").
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  CATEGORY_CATALOG,
  DEFAULT_CATEGORY_SELECTION,
  SetCategoriesRequestSchema,
} from '@pvp/shared';
import { settingsRepo, adminEventsRepo } from '../../repositories/index.js';
import type { SnapshotCache } from '../../cache/index.js';

export interface SettingsModuleDeps {
  db: Firestore;
  cache: SnapshotCache;
}

export function registerSettingsModule(app: FastifyInstance, deps: SettingsModuleDeps): void {
  const { db, cache } = deps;
  const adminOnly = { config: { auth: { role: 'admin' as const } } };

  app.get('/admin/categories', adminOnly, async () => {
    const current = await settingsRepo.getExtractionCategories(db);
    return {
      catalog: CATEGORY_CATALOG,
      selection: current?.codes ?? [...DEFAULT_CATEGORY_SELECTION],
      is_default: current === null,
      updated_at: current?.updated_at ?? null,
      updated_by: current?.updated_by ?? null,
      unrecognized_codes: cache.getUnrecognizedCategoryCodes(),
    };
  });

  app.put('/admin/categories', adminOnly, async (req) => {
    const body = SetCategoriesRequestSchema.parse(req.body);
    await settingsRepo.setExtractionCategories(db, {
      codes: body.codes,
      updatedBy: req.user!.id,
    });
    await adminEventsRepo.append(db, {
      type: 'categories_changed',
      actor_id: req.user!.id,
      subject: 'settings/extraction_categories',
      details: { codes: body.codes },
    });
    return { selection: body.codes };
  });
}
