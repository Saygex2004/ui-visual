// API — administration bodies (API_CONTRACT.md §8).
import { z } from 'zod';
import { instant } from '../common.js';
import { RoleSchema, VistaSchema } from '../partB/accounts.js';
import { UserPublicSchema } from './auth.js';
import { AdminEventTypeSchema } from '../partB/adminEvents.js';
import { RunSchema } from '../partA/run.js';

export const AdminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: RoleSchema,
  disabled: z.boolean(),
  must_change_password: z.boolean(),
  created_at: z.string(),
  viste: z.array(VistaSchema).default([]),
});

export const UsersResponseSchema = z.object({ users: z.array(AdminUserSchema) });

export const CreateUserRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: RoleSchema,
});
export const CreateUserResponseSchema = z.object({ user: UserPublicSchema });

export const SetPasswordRequestSchema = z.object({ new_password: z.string().min(1) });
export const SetRoleRequestSchema = z.object({ role: RoleSchema });

export const AdminEventViewSchema = z.object({
  type: AdminEventTypeSchema,
  actor_id: z.string(),
  subject: z.string(),
  at: z.string(),
  details: z.record(z.string(), z.unknown()),
});
export const EventsResponseSchema = z.object({ events: z.array(AdminEventViewSchema) });

// Categories (§8 + DOMAIN_RULES.md Appendix A)
export const CategoryCatalogEntrySchema = z.object({
  code: z.string(),
  label: z.string(),
  group: z.string(),
});
export const CategoriesResponseSchema = z.object({
  catalog: z.array(CategoryCatalogEntrySchema),
  selection: z.array(z.string()),
  is_default: z.boolean(), // absent doc → default set, flagged as such
  updated_at: instant.nullable(),
  updated_by: z.string().nullable(),
  // Codes observed on real listings but not in the catalog (DOMAIN_RULES.md
  // Appendix A) — rendered as a checked, non-uncheckable 5th group (UI §8.2)
  // so the fail-open posture is visible rather than silent.
  unrecognized_codes: z.array(z.string()),
});
export const SetCategoriesRequestSchema = z.object({ codes: z.array(z.string()) });
export const SetCategoriesResponseSchema = z.object({ selection: z.array(z.string()) });

export const RunsResponseSchema = z.object({ runs: z.array(RunSchema) });

export const AdminSearchResultSchema = z.object({
  id: z.string(),
  area: z.enum(['immobili', 'corporate']),
  tipo_bene: z.string().nullable(),
  tribunale: z.string().nullable(),
  comune: z.string().nullable(),
  regione: z.string().nullable(),
  valore_richiesto: z.number().nullable(),
  blocco_key: z.string().nullable(),
  completed: z.boolean(),
});
export const AdminSearchResponseSchema = z.object({ results: z.array(AdminSearchResultSchema) });

export type AdminUser = z.infer<typeof AdminUserSchema>;
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>;
export type SetCategoriesRequest = z.infer<typeof SetCategoriesRequestSchema>;
export type AdminSearchResult = z.infer<typeof AdminSearchResultSchema>;
export type AdminEventView = z.infer<typeof AdminEventViewSchema>;
export type EventsResponse = z.infer<typeof EventsResponseSchema>;
export type SetCategoriesResponse = z.infer<typeof SetCategoriesResponseSchema>;
export type RunsResponse = z.infer<typeof RunsResponseSchema>;

export const SetVisteRequestSchema = z.object({ viste: z.array(VistaSchema) });
export const SetVisteResponseSchema = z.object({ user: AdminUserSchema });

export type SetVisteRequest = z.infer<typeof SetVisteRequestSchema>;
export type SetVisteResponse = z.infer<typeof SetVisteResponseSchema>;
