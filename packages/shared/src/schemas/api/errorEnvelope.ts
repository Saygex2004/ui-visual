// API error envelope (API_CONTRACT.md §1). Every non-2xx response.
import { z } from 'zod';

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.number().int(), // the HTTP status
    key: z.string(), // i18n key from the shared `errors` namespace
    details: z.record(z.string(), z.unknown()),
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
