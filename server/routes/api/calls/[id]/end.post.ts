import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireViewer } from '../../../../utils/auth';
import { callParam, getCall } from '../../../../utils/calls';
import { sql } from '../../../../utils/db';

// Body: { reason?: 'failed' }. Either member hangs up (or the caller cancels while it rings).
// Allowed for any signed-in member, even a suspended one: ending a call must always work.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  const id = callParam(event);
  const { reason } = ((await readBody<{ reason?: unknown }>(event)) ?? {}) as { reason?: unknown };
  await sql`select public.end_call(${id}, ${profile.id}, ${reason === 'failed' ? 'failed' : null})`;
  const call = await getCall(id, profile.id);
  if (!call) throw new HTTPError('Call not found', { status: 404 });
  return call;
});
