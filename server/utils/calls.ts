import { HTTPError, getRouterParam, type H3Event } from 'nitro/h3';
import { sql } from './db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

export const callParam = (event: H3Event) => {
  const id = getRouterParam(event, 'id');
  if (!isUuid(id)) throw new HTTPError('Call not found', { status: 404 });
  return id;
};

/** A call as `me` should see it: status, who is on the other end, and nothing private. Null if `me` is not part of it. */
export const getCall = async (id: string, me: string) => {
  const [call] = await sql`
    select c.id, c.kind, c.status, c.end_reason, c.caller_id, c.callee_id, c.created_at, c.answered_at, c.ended_at,
      jsonb_build_object('id', o.id, 'username', o.username, 'display_name', o.display_name, 'avatar_url', public.avatar_src(o)) as peer
    from public.calls c
    join public.profiles o on o.id = case when c.caller_id = ${me} then c.callee_id else c.caller_id end
    where c.id = ${id} and (c.caller_id = ${me} or c.callee_id = ${me})`;
  return call ?? null;
};

/** Maps the database's call errors to HTTP errors a member can act on. */
export const callError = (error: unknown): never => {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;
  if (code === '42501') throw new HTTPError(message, { status: 403 });
  if (code === 'P0002') throw new HTTPError('That member no longer exists.', { status: 404 });
  if (code === '55P03') throw new HTTPError(message, { status: 409 });
  if (code === '23514') throw new HTTPError(message, { status: 400 });
  throw error;
};
