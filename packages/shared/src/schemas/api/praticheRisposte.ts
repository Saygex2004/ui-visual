// API — le risposte alla richiesta di fascicolo.
import { z } from 'zod';
import { RispostaPraticaInputSchema, RispostaPraticaSchema } from '../partB/praticheRisposte.js';

export const RispostePraticaResponseSchema = z.object({
  risposte: z.array(RispostaPraticaSchema),
});

/** Corpo accettato dall'endpoint di ricezione. Non e' una rotta autenticata a
 *  sessione: la chiama uno script esterno, con un segreto condiviso.
 *
 *  Porta il CODICE letto dall'indirizzo, non l'id della pratica: chi raccoglie
 *  le risposte non sa nulla degli identificativi interni, e il server risolve
 *  l'uno nell'altro. */
export const InboundRispostaRequestSchema = RispostaPraticaInputSchema.omit({
  pratica_id: true,
}).extend({
  reply_key: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{8,32}$/),
});

export type RispostePraticaResponse = z.infer<typeof RispostePraticaResponseSchema>;
export type InboundRispostaRequest = z.infer<typeof InboundRispostaRequestSchema>;
