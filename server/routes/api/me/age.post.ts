import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { ageStatus, isValidBirthDate } from '../../../utils/age';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';

// Body: { birth_date: 'YYYY-MM-DD' }. The date is recorded once and can never be changed through the
// API, so trying a different date after being turned away does nothing. Returns { ageStatus }.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  await rateLimit('age', profile.id);
  const { birth_date } = ((await readBody<{ birth_date?: unknown }>(event)) ?? {}) as { birth_date?: unknown };
  if (!isValidBirthDate(birth_date)) throw new HTTPError('Enter a real date of birth.', { status: 400 });
  await sql`insert into public.profile_age (profile_id, birth_date) values (${profile.id}, ${birth_date}) on conflict (profile_id) do nothing`;
  return { ageStatus: await ageStatus(profile.id) };
});
