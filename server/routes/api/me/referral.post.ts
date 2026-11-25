import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';
import { requirePoints } from '../../../utils/points';

// Body: { ref: inviter's username }. Called once by the app after someone signs up through an invite link.
// It only counts for an account in its first week that nobody has claimed yet (the database checks).
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  await requirePoints();
  await rateLimit('profile', profile.id);
  const { ref } = ((await readBody<{ ref?: unknown }>(event)) ?? {}) as { ref?: unknown };
  if (typeof ref !== 'string' || !/^[A-Za-z0-9_]{3,64}$/.test(ref)) throw new HTTPError('Invalid invite.', { status: 400 });
  const [row] = await sql`select public.claim_referral(${profile.id}, ${ref}) as counted`;
  return { counted: !!row?.counted };
});
