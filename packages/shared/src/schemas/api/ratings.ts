// API — ratings bodies (API_CONTRACT.md §4). Delta poll returns tombstones
// ({ value: null }) for cleared ratings within the `since` window.
import { z } from 'zod';
import { RatingValueSchema, RatingSchema } from '../partB/ratings.js';

export const RatingDeltaEntrySchema = z.object({
  listing_id: z.string(),
  value: RatingValueSchema.nullable(), // null = tombstone (cleared)
  set_by: z.string().nullable(),
  set_at: z.string().nullable(),
});

export const RatingsDeltaResponseSchema = z.object({
  ratings: z.array(RatingDeltaEntrySchema),
  now: z.string(),
});

export const SetRatingRequestSchema = z.object({ value: RatingValueSchema });

export const SetRatingResponseSchema = z.object({ rating: RatingSchema });

export type RatingDeltaEntry = z.infer<typeof RatingDeltaEntrySchema>;
export type RatingsDeltaResponse = z.infer<typeof RatingsDeltaResponseSchema>;
export type SetRatingRequest = z.infer<typeof SetRatingRequestSchema>;
export type SetRatingResponse = z.infer<typeof SetRatingResponseSchema>;
