// Part B — `carta_anagrafica/firmatari`: who may sign, and under what title.
//
// One document holding two lists rather than a collection of people: they are
// always read together, always written together from one screen, and there
// are a handful of them. A collection would buy nothing and cost a query.
//
// Absence means "use the names shipped in code", the same contract as
// carta_template: nothing is copied into the database just to sit there.
import { z } from 'zod';
import { instant } from '../common.js';

/** Drives "Il sottoscritto" / "La sottoscritta" in the rinuncia declaration —
 *  the only place in these documents where it changes a word. */
export const GENERI = ['M', 'F'] as const;
export type Genere = (typeof GENERI)[number];
export const GenereSchema = z.enum(GENERI);

export const FirmatarioSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  carica: z.string().trim().min(1).max(120),
  genere: GenereSchema,
});

export const CartaFirmatariInputSchema = z.object({
  // Capped only to keep one bad request from writing an unbounded document;
  // the real list is a handful of people.
  firmatari: z.array(FirmatarioSchema).max(50),
  /** Titles offered for the rinuncia declaration, e.g. "Amministratore Unico". */
  qualifiche: z.array(z.string().trim().min(1).max(120)).max(50),
});

export const CartaFirmatariSchema = CartaFirmatariInputSchema.extend({
  updated_at: instant,
  updated_by: z.string(),
});

export type Firmatario = z.infer<typeof FirmatarioSchema>;
export type CartaFirmatariInput = z.infer<typeof CartaFirmatariInputSchema>;
export type CartaFirmatari = z.infer<typeof CartaFirmatariSchema>;
