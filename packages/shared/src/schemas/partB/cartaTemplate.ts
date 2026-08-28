// Part B — `carta_template`: the letter boilerplate, overridable by an admin.
//
// The application ships defaults in code; a document type gets a document
// here only once someone edits it. Absence therefore means "use the shipped
// text", which keeps the two in step: nothing is copied into the database
// just to sit there going stale.
import { z } from 'zod';
import { instant } from '../common.js';

export const TIPI_TEMPLATE = [
  'proposta',
  'accettazione',
  'rinuncia',
  'lettera',
  'acquisto',
] as const;

export type TipoTemplate = (typeof TIPI_TEMPLATE)[number];
export const TipoTemplateSchema = z.enum(TIPI_TEMPLATE);

export const CartaTemplateInputSchema = z.object({
  apertura: z.string(),
  /** The letter body, with its {{PLACEHOLDER}} tokens. Not trimmed and not
   *  length-capped: legal boilerplate runs to thousands of characters and its
   *  leading blank lines are deliberate spacing. */
  corpo: z.string(),
  chiusura: z.string(),
});

export const CartaTemplateSchema = CartaTemplateInputSchema.extend({
  tipo: TipoTemplateSchema,
  updated_at: instant,
  updated_by: z.string(),
});

export type CartaTemplateInput = z.infer<typeof CartaTemplateInputSchema>;
export type CartaTemplate = z.infer<typeof CartaTemplateSchema>;
