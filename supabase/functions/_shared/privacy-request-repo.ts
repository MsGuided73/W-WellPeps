/**
 * The database side of privacy-request, written against the small slice of the
 * supabase-js query builder it uses so the mapping (a unique violation becomes a
 * retryable conflict, a missing count becomes a failure) is tested with a fake.
 * index.ts passes the real service-role client.
 */
import type { InsertResult, PrivacyRequestRepo, PrivacyRequestRow } from './privacy-request-store.ts';

export interface DbError {
  code?: unknown;
}

/** The part of the supabase-js client this repo calls. */
export interface PrivacyRequestsClient {
  from(table: 'privacy_requests'): {
    select(
      columns: string,
      options: { count: 'exact'; head: true },
    ): { gte(column: string, value: string): PromiseLike<{ count: number | null; error: DbError | null }> };
    insert(row: PrivacyRequestRow): {
      select(columns: string): {
        single(): PromiseLike<{ data: { request_no?: unknown } | null; error: DbError | null }>;
      };
    };
  };
}

/** Postgres unique_violation. The only unique constraint besides the key is request_no. */
export const UNIQUE_VIOLATION = '23505';

const codeOf = (error: DbError | null): string | undefined => (error && typeof error.code === 'string' ? error.code : undefined);

export function createPrivacyRequestRepo(client: PrivacyRequestsClient | null): PrivacyRequestRepo {
  return {
    async countSince(sinceIso) {
      if (!client) return { ok: false, code: 'NOCLIENT' };
      const { count, error } = await client.from('privacy_requests').select('id', { count: 'exact', head: true }).gte('received_at', sinceIso);
      if (error || count === null) return { ok: false, code: codeOf(error) };
      return { ok: true, count };
    },
    async insert(row): Promise<InsertResult> {
      if (!client) return { ok: false, code: 'NOCLIENT' };
      const { data, error } = await client.from('privacy_requests').insert(row).select('request_no').single();
      if (error) return codeOf(error) === UNIQUE_VIOLATION ? { ok: false, conflict: true } : { ok: false, code: codeOf(error) };
      if (!data || typeof data.request_no !== 'string') return { ok: false, code: 'NOROW' };
      return { ok: true, requestNo: data.request_no };
    },
  };
}
