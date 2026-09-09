// API — le risposte alla richiesta di fascicolo.
import { z } from 'zod';
import { RispostaPraticaInputSchema, RispostaPraticaSchema } from '../partB/praticheRisposte.js';

export const RispostePraticaResponseSchema = z.object({
  risposte: z.array(RispostaPraticaSchema),
});

/** Corpo accettato dall'endpoint di ricezione. Non e' una rotta autenticata a
 *  sessione: la chiama uno script esterno, con un segreto condiviso. */
export const InboundRispostaRequestSchema = RispostaPraticaInputSchema;

export type RispostePraticaResponse = z.infer<typeof RispostePraticaResponseSchema>;
export type InboundRispostaRequest = z.infer<typeof InboundRispostaRequestSchema>;
