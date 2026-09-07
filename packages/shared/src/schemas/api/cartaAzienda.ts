// API — companies added on top of the shipped ones. Readable with the carta
// view (the form offers them), writable by an administrator: a company here
// prints its name and registered office on a signed letter.
import { z } from 'zod';
import { CartaAziendaInputSchema, CartaAziendaSchema } from '../partB/cartaAzienda.js';

export const CartaAziendeResponseSchema = z.object({
  aziende: z.array(CartaAziendaSchema),
});

export const CreateCartaAziendaRequestSchema = CartaAziendaInputSchema;
export const CartaAziendaResponseSchema = z.object({ azienda: CartaAziendaSchema });

export type CartaAziendeResponse = z.infer<typeof CartaAziendeResponseSchema>;
export type CreateCartaAziendaRequest = z.infer<typeof CreateCartaAziendaRequestSchema>;
export type CartaAziendaResponse = z.infer<typeof CartaAziendaResponseSchema>;
