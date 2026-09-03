// API — pratiche bodies. Every route is admin-only; the whole register is
// returned in one call rather than paged, because the client filters, sorts
// and exports across the full set and paging would silently make an export
// mean "the page you were looking at" instead of "everything that matched".
import { z } from 'zod';
import { PraticaSchema, PraticaInputSchema, PraticaPatchSchema } from '../partB/pratiche.js';

export const PraticheListResponseSchema = z.object({
  pratiche: z.array(PraticaSchema),
  /** Accounts that may be named in `ordinato_da`, so the client can render a
   *  person instead of an opaque id without a second round-trip. */
  utenti: z.array(
    z.object({
      id: z.string(),
      username: z.string(),
      /** Whether this account has a Slack member id, and can therefore be
       *  chosen as the person to mention. The id itself is deliberately not
       *  sent: the form needs to know who is offerable, not their identifier
       *  on another service. */
      taggabile: z.boolean().default(false),
    }),
  ),
});

export const CreatePraticaRequestSchema = PraticaInputSchema;
export const CreatePraticaResponseSchema = z.object({ pratica: PraticaSchema });

export const UpdatePraticaRequestSchema = PraticaPatchSchema;
export const UpdatePraticaResponseSchema = z.object({ pratica: PraticaSchema });

export type PraticheListResponse = z.infer<typeof PraticheListResponseSchema>;
export type CreatePraticaRequest = z.infer<typeof CreatePraticaRequestSchema>;
export type CreatePraticaResponse = z.infer<typeof CreatePraticaResponseSchema>;
export type UpdatePraticaRequest = z.infer<typeof UpdatePraticaRequestSchema>;
export type UpdatePraticaResponse = z.infer<typeof UpdatePraticaResponseSchema>;
