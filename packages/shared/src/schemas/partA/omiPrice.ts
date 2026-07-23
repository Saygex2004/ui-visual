// Part A — `omi_prices` (DATA_MODEL.md §4). Read-only. One doc per
// (provincia, comune). `error` set ⇒ "we tried, no data" (the five data fields
// are null); absent document ⇒ "not processed yet". The reference is always
// residential (§4).
import { z } from 'zod';
import { instant } from '../common.js';

export const OmiPriceSchema = z
  .object({
    provincia: z.string(),
    comune: z.string(),
    tipologia: z.string().nullable(),
    stato: z.string().nullable(),
    min_mq: z.number().nullable(),
    max_mq: z.number().nullable(),
    zona: z.string().nullable(),
    semestre: z.string(),
    fetched_at: instant,
    error: z.string().nullable(),
  })
  .passthrough();

export type OmiPrice = z.infer<typeof OmiPriceSchema>;
