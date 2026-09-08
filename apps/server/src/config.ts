// Typed, validated environment configuration (CONFIGURATION.md).
// 12-factor: a missing/malformed REQUIRED setting refuses to start with a
// message naming the offending variable. Defaults are safe for development.
import { z } from 'zod';

/** Wraps a setting so that an EMPTY value reads as absent.
 *
 *  `gcloud run deploy --set-env-vars FOO=` sets FOO to the empty string, not
 *  to nothing, so any optional setting that a deploy script writes
 *  unconditionally needs this — otherwise "not configured" arrives as "" and
 *  is rejected as malformed. */
const vuotoComeAssente = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const csv = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const ConfigSchema = z.object({
  // --- Required (CONFIGURATION.md §1) ---
  PVPDASH_FIRESTORE_PROJECT_ID: z.string().min(1),
  // Admin-SDK credentials: local/dev only. When routed at an emulator
  // (FIRESTORE_EMULATOR_HOST set) it is not required.
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  PVPDASH_SESSION_SECRET: z.string().min(32, 'must be at least 32 characters'),
  PVPDASH_BOOTSTRAP_ADMIN_PASSWORD: z.string().min(1).optional(),

  // --- Optional with defaults (CONFIGURATION.md §2) ---
  PVPDASH_PORT: z.coerce.number().int().positive().default(8080),
  PVPDASH_ENV: z.enum(['development', 'production']).default('development'),
  PVPDASH_META_POLL_SECONDS: z.coerce.number().int().positive().default(60),
  PVPDASH_SNAPSHOT_MAX_AGE_HOURS: z.coerce.number().int().positive().default(24),
  PVPDASH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PVPDASH_ATTACH_MAX_MB: z.coerce.number().int().positive().default(10),
  PVPDASH_ATTACH_TYPES: z
    .string()
    .default('image/png,image/jpeg,image/webp,application/pdf')
    .transform(csv),
  PVPDASH_STORAGE_BUCKET: z.string().optional(),
  PVPDASH_SIGNED_URL_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  PVPDASH_MESSAGE_MAX_CHARS: z.coerce.number().int().positive().default(4000),
  PVPDASH_CALENDAR_DAILY_TARGET: z.coerce.number().int().positive().default(18),
  // Slack Incoming Webhook for the pratiche register. Both optional: absent
  // means notifications are simply off, which is what local development and
  // the emulator want. The mention is a Slack MEMBER ID (U01234ABC), not a
  // display name — "@mario" in message text notifies nobody.
  PVPDASH_SLACK_WEBHOOK_URL: z.string().url().optional(),
  PVPDASH_SLACK_MENTION_ID: z.string().min(1).optional(),
  // Public origin of the dashboard, for the deep link in notifications.
  // Absent = the message carries no link, rather than a broken relative one.
  PVPDASH_PUBLIC_BASE_URL: z.string().url().optional(),

  // Email notification for a NEWLY CREATED pratica, sent over plain SMTP.
  //
  // SMTP rather than one provider's HTTP API on purpose: it works with the
  // mailbox the company already has (Aruba, Register.it, Workspace) and
  // equally with Resend or Brevo, so this choice does not become a lock-in
  // that has to be undone later.
  //
  // All optional, and the sender decides: with no host, no recipient or no
  // sender address, the feature is simply off — which is what local
  // development, the emulator and every test want, and what production wants
  // too until the credentials exist.
  //
  // Empty is treated as absent throughout, and that is not cosmetic:
  // `gcloud run deploy --set-env-vars FOO=` sets FOO to the EMPTY STRING, not
  // to nothing. Without this, deploying an installation that has no mailbox
  // would hand the schema "" for a required-if-present field and the server
  // would refuse to start — a mail setting taking the whole service down.
  PVPDASH_SMTP_HOST: vuotoComeAssente(z.string().min(1)),
  PVPDASH_SMTP_PORT: vuotoComeAssente(z.coerce.number().int().positive()).transform(
    (v) => v ?? 587,
  ),
  PVPDASH_SMTP_USER: vuotoComeAssente(z.string().min(1)),
  PVPDASH_SMTP_PASSWORD: vuotoComeAssente(z.string().min(1)),
  /** 465 is implicit TLS; 587 and 25 start plain and upgrade with STARTTLS.
   *  Derived from the port rather than configured, because getting the two
   *  out of step is the classic way an SMTP setup fails with an unhelpful
   *  error — overridable for the rare server that disagrees. */
  PVPDASH_SMTP_SECURE: z
    .enum(['0', '1'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === '1')),
  /** The From: address. Must be one the SMTP account is allowed to send as,
   *  or the server will refuse it. */
  PVPDASH_EMAIL_FROM: vuotoComeAssente(z.string().email()),
  /** Where the notification goes. One fixed address. */
  PVPDASH_EMAIL_TO: vuotoComeAssente(z.string().email()),

  PVPDASH_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Cloud Run injects PORT; honour it over PVPDASH_PORT.
  PORT: z.coerce.number().int().positive().optional(),

  // --- Emulator / test environment (CONFIGURATION.md §3) ---
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),
  // '1' to wipe users/usernames/sessions before bootstrap runs, so every boot
  // starts from a fresh admin — the e2e webServer sets this (see
  // playwright.config.ts). NOT z.coerce.boolean(): that coerces any non-empty
  // string (including "0") to true.
  PVPDASH_RESET_ACCOUNTS_ON_BOOT: z
    .enum(['0', '1'])
    .default('0')
    .transform((v) => v === '1'),
  // '1' to load the listings/OMI/meta/runs/settings fixtures on boot
  // (CONFIGURATION.md §3) — deliberately excludes users/sessions, so it
  // composes safely with PVPDASH_RESET_ACCOUNTS_ON_BOOT either way round.
  PVPDASH_SEED: z
    .enum(['0', '1'])
    .default('0')
    .transform((v) => v === '1'),
});

export type Config = Readonly<z.infer<typeof ConfigSchema>> & {
  readonly listenPort: number;
  readonly isProduction: boolean;
};

/**
 * Parse and validate the environment. On failure, throws an Error whose message
 * names every offending variable — the caller (index.ts) logs it and exits with
 * a non-zero code, so the process refuses to start.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const value = parsed.data;
  return Object.freeze({
    ...value,
    listenPort: value.PORT ?? value.PVPDASH_PORT,
    isProduction: value.PVPDASH_ENV === 'production',
  });
}
