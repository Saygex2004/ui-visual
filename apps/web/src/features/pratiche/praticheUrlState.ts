// URL search-param contract for /pratiche: which pratica's window is open.
//
// The window used to live in component state alone, which meant it had no
// address — nothing could link to a single pratica, and a Slack notification
// could only ever point at the list. Putting it in the URL also makes the
// browser's back button close the window, which is what people expect.
import { z } from 'zod';

export const praticheSearchSchema = z.object({
  // `.catch` rather than a hard failure: a stale or mangled id in a link
  // should land on the list, never on an error screen.
  pratica: z.string().optional().catch(undefined),
});

export type PraticheSearch = z.infer<typeof praticheSearchSchema>;
