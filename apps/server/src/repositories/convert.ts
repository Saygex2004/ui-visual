// Firestore → plain JSON normalization. Firestore returns instant fields as
// `Timestamp` instances; the shared schemas (and the API) speak ISO-8601
// strings. This deep-converts any Timestamp to an ISO string before schema
// parse, so the repository layer hands `@pvp/shared` exactly what it expects.
import { Timestamp } from 'firebase-admin/firestore';

export function firestoreToPlain<T = unknown>(value: unknown): T {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString() as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => firestoreToPlain(v)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = firestoreToPlain(v);
    }
    return out as T;
  }
  return value as T;
}
