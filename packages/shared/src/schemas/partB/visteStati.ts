// Part B — `viste_config/stati`: whether each view is open, reserved to
// administrators, or closed for work.
//
// This is a switch for the whole installation, not a per-account grant: the
// grants say who MAY open a view, this says whether the view is open at all.
// The two are deliberately separate, so turning a view off for maintenance
// does not touch anybody's permissions and turning it back on restores them
// exactly as they were.
//
// Absence means "everything active", so a fresh installation behaves as it
// always has and nothing has to be seeded.
import { z } from 'zod';
import { instant } from '../common.js';
import { VistaSchema } from './accounts.js';

export const STATI_VISTA = ['attivo', 'solo_admin', 'lavori'] as const;
export type StatoVista = (typeof STATI_VISTA)[number];
export const StatoVistaSchema = z.enum(STATI_VISTA);

// partialRecord, not record: every entry is optional, because absence is the
// meaningful default ("open") and a schema demanding all four would refuse
// the empty document a fresh installation has.
export const StatiVisteSchema = z.partialRecord(VistaSchema, StatoVistaSchema);
export type StatiViste = z.infer<typeof StatiVisteSchema>;

export const VisteStatiInputSchema = z.object({ stati: StatiVisteSchema });

export const VisteStatiSchema = VisteStatiInputSchema.extend({
  updated_at: instant,
  updated_by: z.string(),
});

export type VisteStatiInput = z.infer<typeof VisteStatiInputSchema>;
export type VisteStati = z.infer<typeof VisteStatiSchema>;
