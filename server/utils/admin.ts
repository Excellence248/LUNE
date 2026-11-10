import { HTTPError, getQuery, readBody, type H3Event } from 'nitro/h3';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PAGE_SIZE = 50;

/** `?page=` and `?q=` for admin lists. The search is escaped for use inside ILIKE '%…%'. */
export const listParams = (event: H3Event) => {
  const query = getQuery(event) as Record<string, string | undefined>;
  const page = Math.min(Math.max(Number.parseInt(query.page ?? '0', 10) || 0, 0), 1000);
  const q = (query.q ?? '').trim().slice(0, 100);
  return { offset: page * PAGE_SIZE, q, like: `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`, kind: query.kind };
};

/** Fetches PAGE_SIZE + 1 rows, then reports whether another page exists. */
export const paged = <T>(rows: T[]) => ({ items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE });

export const uuidParam = (value: string | undefined) => {
  if (!value || !UUID.test(value)) throw new HTTPError('Not found', { status: 404 });
  return value;
};

export interface ActionBody {
  reason?: unknown;
  until?: unknown;
  tier?: unknown;
  outcome?: unknown;
}

/** Every admin action needs a reason for the audit log; `until` is an optional future ISO date. */
export const readAction = async (event: H3Event) => {
  const body = ((await readBody<ActionBody>(event)) ?? {}) as ActionBody;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > 500) throw new HTTPError('Give a reason of 1–500 characters', { status: 400 });
  let until: string | null = null;
  if (body.until != null && body.until !== '') {
    const date = new Date(String(body.until));
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) throw new HTTPError('The end date must be in the future', { status: 400 });
    until = date.toISOString();
  }
  return { reason, until, tier: body.tier, body };
};

/** Turns the errors raised by the admin_* SQL functions into HTTP responses. */
export const runAction = async <T>(action: () => Promise<T>) => {
  try {
    return await action();
  } catch (error) {
    const { code, message } = error as { code?: string; message?: string };
    const status = ({ '42501': 403, P0002: 404, '23505': 409, '23514': 400 } as Record<string, number>)[code ?? ''];
    if (status) throw new HTTPError(status === 409 ? 'Already done' : message ?? 'Not allowed', { status });
    throw error;
  }
};
