// Part B — accounts & sessions (DATA_MODEL.md §9).
import { z } from 'zod';
import { instant } from '../common.js';

export const RoleSchema = z.enum(['user', 'admin']);

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  password_hash: z.string(),
  role: RoleSchema,
  disabled: z.boolean(),
  must_change_password: z.boolean(),
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
