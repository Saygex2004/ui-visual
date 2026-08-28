// API — letter template bodies. Admin-only, like the rest of settings.
import { z } from 'zod';
import { CartaTemplateInputSchema, CartaTemplateSchema } from '../partB/cartaTemplate.js';

export const CartaTemplatesResponseSchema = z.object({
  /** Only the types an admin has actually overridden; the client falls back
   *  to the shipped defaults for the rest. */
  templates: z.array(CartaTemplateSchema),
});

export const SetCartaTemplateRequestSchema = CartaTemplateInputSchema;
export const SetCartaTemplateResponseSchema = z.object({ template: CartaTemplateSchema });

export type CartaTemplatesResponse = z.infer<typeof CartaTemplatesResponseSchema>;
export type SetCartaTemplateRequest = z.infer<typeof SetCartaTemplateRequestSchema>;
export type SetCartaTemplateResponse = z.infer<typeof SetCartaTemplateResponseSchema>;
