// Calendar read path (API_CONTRACT.md §7) — month/day views for the caller's
// own calendar (`req.user!.id`, no user param: this is always "my calendar").
// Auto-assignment on first open of today lives in `calendarRepo.assignToday`;
// this module only decides WHEN to call it (server-computed "today", never
// the client's claim — `calendarRepo.todayIso()`) and does the presentation
// join: `assignment_index` for permanent completion state (DATA_MODEL.md
// §11), live `ratings` for the month view's "actionable" flag (the rating
// VALUE isn't stored anywhere permanent, only a completion timestamp — see
// HANDOFF_PHASE_8.md for why these are deliberately two different sources).
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  yearMonth,
  calendarDate,
  MonthResponseSchema,
  DayResponseSchema,
  type RatingValue,
} from '@pvp/shared';
import {
  calendarRepo,
  assignmentIndexRepo,
  ratingsRepo,
  listingsRepo,
  activityRepo,
} from '../../repositories/index.js';
import { ApiError } from '../../plugins/errorEnvelope.js';
import { firstHeaderValue } from '../../lib/http.js';
import { toCalendarRow } from './rows.js';

const ACTIONABLE_VALUES: ReadonlySet<RatingValue> = new Set(['ottimo_affare', 'da_verificare']);

export interface CalendarModuleDeps {
  db: Firestore;
}

export function registerCalendarModule(app: FastifyInstance, deps: CalendarModuleDeps): void {
  const { db } = deps;

  app.get<{ Params: { month: string } }>('/calendar/:month', async (req) => {
    const parsedMonth = yearMonth.safeParse(req.params.month);
    if (!parsedMonth.success) throw new ApiError(400, 'errors.common.validation');
    const month = parsedMonth.data;
    const userId = req.user!.id;

    const days = await calendarRepo.listDaysForMonth(db, userId, month);
    const allIds = [...new Set(days.flatMap((d) => d.listing_ids))];
    const [completedMap, ratingsResult] = await Promise.all([
      assignmentIndexRepo.getMany(db, allIds),
      ratingsRepo.getSince(db, null),
    ]);
    const ratingByListing = new Map(ratingsResult.ratings.map((r) => [r.listing_id, r.value]));

    const responseDays = days
      .map((day) => {
        const completed = day.listing_ids.filter(
          (id) => completedMap.get(id)?.completed_at != null,
        ).length;
        const actionable = day.listing_ids.some((id) => {
          const value = ratingByListing.get(id);
          return value != null && ACTIONABLE_VALUES.has(value);
        });
        return {
          date: day.date,
          assigned: day.listing_ids.length,
          completed,
          actionable,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return MonthResponseSchema.parse({ days: responseDays });
  });

  app.get<{ Params: { date: string } }>('/calendar/day/:date', async (req, reply) => {
    const parsedDate = calendarDate.safeParse(req.params.date);
    if (!parsedDate.success) throw new ApiError(400, 'errors.common.validation');
    const date = parsedDate.data;
    const userId = req.user!.id;
    const today = calendarRepo.todayIso();

    let listingIds: string[];
    if (date === today) {
      const result = await calendarRepo.assignToday(db, userId, date);
      listingIds = result.listingIds;
      if (result.wasCreated && result.newlyAssignedIds.length > 0) {
        await Promise.all(
          result.newlyAssignedIds.map((id) =>
            activityRepo.appendEvent(db, {
              listing_id: id,
              type: 'calendar_assigned',
              actor_id: userId,
            }),
          ),
        );
      }
    } else {
      // Past/future dates never generate (UI §7.3) — a frozen day that was
      // never opened simply has nothing assigned.
      const day = await calendarRepo.getDay(db, userId, date);
      listingIds = day?.listing_ids ?? [];
    }

    const [listings, completedMap] = await Promise.all([
      listingsRepo.getByIds(db, listingIds),
      assignmentIndexRepo.getMany(db, listingIds),
    ]);
    const byId = new Map(listings.map((l) => [String(l.id), l]));

    // Preserve assignment order (listingIds), not Firestore's batch-read
    // order; a listing referenced by the day but since deleted is simply
    // skipped, not an error (frozen history over a live-mutable dataset).
    const rows = listingIds.flatMap((id) => {
      const listing = byId.get(id);
      return listing ? [toCalendarRow(listing)] : [];
    });

    const completed = listingIds.filter((id) => completedMap.get(id)?.completed_at != null).length;

    // API_CONTRACT.md §10: "304" — the assigned set is frozen (UI §7.3), so
    // only `completed` (driven by the separate live ratings poll, not this
    // route) can change between polls; the assignment order captures the
    // set itself.
    const etag = `"${listingIds.join(',')}:${completed}"`;
    reply.header('ETag', etag);
    const ifNoneMatch = firstHeaderValue(req.headers['if-none-match']);
    if (ifNoneMatch === etag) {
      return reply.code(304).send();
    }

    return DayResponseSchema.parse({
      listings: rows,
      progress: { completed, total: listingIds.length },
    });
  });
}
