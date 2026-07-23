// react-i18next setup. Default and only initial locale: `it` (FRONTEND.md §6).
// One namespace per feature; missing keys fall back to a generic message and
// warn in development. All user-facing copy is externalized — no literal
// strings in components (ESLint-enforced).
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonIt from './locales/it/common.json';
import authIt from './locales/it/auth.json';
import dashboardIt from './locales/it/dashboard.json';
import workspaceIt from './locales/it/workspace.json';
import chatIt from './locales/it/chat.json';
import calendarIt from './locales/it/calendar.json';
import adminIt from './locales/it/admin.json';
import archiveIt from './locales/it/archive.json';
import errorsIt from './locales/it/errors.json';

export const DEFAULT_LOCALE = 'it' as const;

export const NAMESPACES = [
  'common',
  'auth',
  'dashboard',
  'workspace',
  'chat',
  'calendar',
  'admin',
  'archive',
  'errors',
] as const;

export const resources = {
  it: {
    common: commonIt,
    auth: authIt,
    dashboard: dashboardIt,
    workspace: workspaceIt,
    chat: chatIt,
    calendar: calendarIt,
    admin: adminIt,
    archive: archiveIt,
    errors: errorsIt,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  ns: NAMESPACES as unknown as string[],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  debug: import.meta.env.DEV,
});

export default i18n;
