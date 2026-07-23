// Test-only fixture loader. Reads the canonical dataset at `seed/fixtures/`
// (repo root) via fs — used by unit tests and the seed script, NEVER by the
// package's runtime (the package performs no I/O; this file is excluded from
// the build and never re-exported from index).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = new URL('../../../../seed/fixtures/', import.meta.url);

export function loadFixture<T = unknown>(name: string): T {
  const path = fileURLToPath(new URL(name, FIXTURES_DIR));
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}
