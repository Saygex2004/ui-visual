// API — auth bodies (API_CONTRACT.md §2).
import { z } from 'zod';
import { RoleSchema } from '../partB/accounts.js';

/** The account shape returned to the client — never the password hash. */
export const UserPublicSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: RoleSchema,
  must_change_password: z.boolean(),
});

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const LoginResponseSchema = z.object({ user: UserPublicSchema });

export const MeResponseSchema = z.object({ user: UserPublicSchema });

export const PasswordChangeRequestSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(1),
});

export type UserPublic = z.infer<typeof UserPublicSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type PasswordChangeRequest = z.infer<typeof PasswordChangeRequestSchema>;
