// API — who may sign the documents. Readable with the carta view, writable
// by an administrator: the names appear under signed instruments.
import { z } from 'zod';
import { CartaFirmatariInputSchema, CartaFirmatariSchema } from '../partB/cartaFirmatari.js';

export const CartaFirmatariResponseSchema = z.object({
  /** Absent when no administrator has customised the list: the client then
   *  uses the names shipped in code. */
  anagrafica: CartaFirmatariSchema.nullable(),
});

export const SetCartaFirmatariRequestSchema = CartaFirmatariInputSchema;
export const SetCartaFirmatariResponseSchema = z.object({ anagrafica: CartaFirmatariSchema });

export type CartaFirmatariResponse = z.infer<typeof CartaFirmatariResponseSchema>;
export type SetCartaFirmatariRequest = z.infer<typeof SetCartaFirmatariRequestSchema>;
export type SetCartaFirmatariResponse = z.infer<typeof SetCartaFirmatariResponseSchema>;
