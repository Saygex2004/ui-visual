// Part A — `settings/extraction_categories` (DATA_MODEL.md §7). The ONLY Part A
// document this application writes (UI §8.2). Absent document ⇒ default
// selection (DOMAIN_RULES.md Appendix A). Unknown extra fields tolerated.
import { z } from 'zod';
import { instant } from '../common.js';

export const ExtractionCategoriesSchema = z
  .object({
    codes: z.array(z.string()),
    updated_at: instant,
    updated_by: z.string(),
  })
  .passthrough();

export type ExtractionCategories = z.infer<typeof ExtractionCategoriesSchema>;
