import { defineHandler } from 'nitro';
import { requireViewer } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';
import { spaceParam } from '../../../../utils/spaces';

// Leaves the space right away instead of timing out; a leaving host takes it off the live list.
export default defineHandler(async (event) => {
  const space = spaceParam(event);
  const { profile } = await requireViewer(event);
  await sql`delete from public.space_members where space_id = ${space} and member_id = ${profile.id}`;
  await sql`delete from public.spaces_live where space_id = ${space} and host_id = ${profile.id}`;
  return { ok: true };
});
