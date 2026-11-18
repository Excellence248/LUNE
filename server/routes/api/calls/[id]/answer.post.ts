import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../../../utils/auth';
import { callParam, getCall } from '../../../../utils/calls';
import { sql } from '../../../../utils/db';

// Body: { accept: boolean }. The member being rung accepts (the call becomes active) or declines (it ends).
export default defineHandler(async (event) => {
  const { profile } = await requireAdultViewer(event);
  const id = callParam(event);
  const { accept } = ((await readBody<{ accept?: unknown }>(event)) ?? {}) as { accept?: unknown };
  if (typeof accept !== 'boolean') throw new HTTPError('Invalid request.', { status: 400 });
  await sql`select public.answer_call(${id}, ${profile.id}, ${accept})`;
  const call = await getCall(id, profile.id);
  if (!call) throw new HTTPError('Call not found', { status: 404 });
  return call;
});
