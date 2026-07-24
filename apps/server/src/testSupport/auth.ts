// Integration-test support: log in via a real HTTP injection and return the
// cookie header value for subsequent authenticated requests. Test-only.
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { SESSION_COOKIE_NAME } from '../plugins/auth.js';

export function extractSessionCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
  if (!cookie) {
    throw new Error(`no ${SESSION_COOKIE_NAME} cookie in response (status ${res.statusCode})`);
  }
  return `${cookie.name}=${cookie.value}`;
}

export async function loginAs(
  app: FastifyInstance,
  username: string,
  password: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login as ${username} failed: ${res.statusCode} ${res.body}`);
  }
  return extractSessionCookie(res);
}
