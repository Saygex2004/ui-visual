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

  // Richiesta del fascicolo all'archivio, alla creazione di una pratica.
  // Il server non parla SMTP: accoda un documento nella collezione `mail` e
  // l'estensione firestore-send-email lo consegna. Qui restano quindi solo i
  // destinatari — host, porta e credenziali sono configurazione
  // dell'estensione, non nostra.
  //
  // Vuoto significa assente, e non e' cosmetica: `--set-env-vars FOO=` scrive
  // la stringa VUOTA, non il nulla. Lo script di deploy le passa sempre, e
  // senza questo un'installazione senza destinatario passerebbe "" a un campo
  // valido-se-presente e il server rifiuterebbe di avviarsi.
  PVPDASH_EMAIL_TO: vuotoComeAssente(z.string().email()),
  PVPDASH_EMAIL_CC: vuotoComeAssente(z.string().email()),
  /** Dove tornano le risposte. Necessario perche' il mittente non e' un
   *  indirizzo utile finche' il dominio non e' autenticato su Brevo. */
  PVPDASH_EMAIL_REPLY_TO: vuotoComeAssente(z.string().email()),
  /** Segreto condiviso con lo script che raccoglie le risposte dalla casella.
   *  Assente = l'endpoint di ricezione non esiste (404): una rotta pubblica
   *  che accetta scritture non deve stare in piedi senza protezione. */
  PVPDASH_INBOUND_SECRET: vuotoComeAssente(z.string().min(24)),

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
