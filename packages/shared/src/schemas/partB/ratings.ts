// Part B — `ratings` (DATA_MODEL.md §10). Document id = listing id. One shared
// verdict per listing; clearing deletes the document.
import { z } from 'zod';
import { instant } from '../common.js';
import { RATING_VALUES } from '../../constants/ratings.js';

export const RatingValueSchema = z.enum(RATING_VALUES);

export const RatingSchema = z.object({
  value: RatingValueSchema,
  set_by: z.string(),
  set_at: instant,
});

export type Rating = z.infer<typeof RatingSchema>;
