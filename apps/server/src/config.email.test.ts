// The email settings, and the one deployment detail that would take the whole
// service down if it were got wrong.
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const MINIMO = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'demo',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
} satisfies NodeJS.ProcessEnv;

describe('impostazioni della posta', () => {
  it('treats an EMPTY value as absent, not as malformed', () => {
    // `gcloud run deploy --set-env-vars FOO=` sets FOO to the empty string.
    // The deploy script writes these unconditionally, so an installation with
    // no mailbox sends "" for every one of them — and if that were rejected,
    // a mail setting would stop the server from starting at all.
    const c = loadConfig({
      ...MINIMO,
      PVPDASH_SMTP_HOST: '',
      PVPDASH_SMTP_PORT: '',
      PVPDASH_SMTP_USER: '',
      PVPDASH_SMTP_PASSWORD: '',
      PVPDASH_EMAIL_FROM: '',
      PVPDASH_EMAIL_TO: '',
    });
    expect(c.PVPDASH_SMTP_HOST).toBeUndefined();
    expect(c.PVPDASH_EMAIL_TO).toBeUndefined();
    expect(c.PVPDASH_SMTP_PORT).toBe(587); // the documented default survives
  });

  it('reads a full configuration', () => {
    const c = loadConfig({
      ...MINIMO,
      PVPDASH_SMTP_HOST: 'smtps.aruba.it',
      PVPDASH_SMTP_PORT: '465',
      PVPDASH_SMTP_USER: 'dashboard@azienda.it',
      PVPDASH_SMTP_PASSWORD: 'segreta',
      PVPDASH_EMAIL_FROM: 'dashboard@azienda.it',
      PVPDASH_EMAIL_TO: 'archivio@azienda.it',
    });
    expect(c.PVPDASH_SMTP_HOST).toBe('smtps.aruba.it');
    expect(c.PVPDASH_SMTP_PORT).toBe(465);
    expect(c.PVPDASH_EMAIL_TO).toBe('archivio@azienda.it');
  });

  it('still refuses a value that is present but wrong', () => {
    // Empty means "off"; a typo means a typo, and must be said out loud
    // rather than quietly switching the notification off.
    expect(() => loadConfig({ ...MINIMO, PVPDASH_EMAIL_TO: 'non-una-mail' })).toThrow();
    expect(() => loadConfig({ ...MINIMO, PVPDASH_SMTP_PORT: 'abc' })).toThrow();
  });
});
