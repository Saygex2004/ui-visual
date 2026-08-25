// Part B — accounts & sessions (DATA_MODEL.md §9).
import { z } from 'zod';
import { instant } from '../common.js';

export const RoleSchema = z.enum(['user', 'admin']);

/** The views an administrator can hand out, one per landing card. Stored as
 *  these codes and never as the Italian labels: a label is presentation and
 *  may be reworded, a stored permission must not change meaning when it is.
 *
 *  An admin is not constrained by them — the check is `admin OR granted` —
 *  because a permission list that could lock the last administrator out of
 *  the screen that edits permission lists is a trap, not a safeguard. */
export const VISTE = ['immobili', 'crediti', 'pratiche'] as const;
export type Vista = (typeof VISTE)[number];
export const VistaSchema = z.enum(VISTE);

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  password_hash: z.string(),
  role: RoleSchema,
  disabled: z.boolean(),
  must_change_password: z.boolean(),
  /** Granted views. Defaults to none: an account that has never been
   *  configured sees nothing rather than silently inheriting access. */
  viste: z.array(VistaSchema).default([]),
  created_at: instant,
  updated_at: instant,
});

export const SessionSchema = z.object({
  user_id: z.string(),
  created_at: instant,
  last_used_at: instant,
  expires_at: instant,
});

export type Role = z.infer<typeof RoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
