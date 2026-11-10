import { sql } from './db';

/** Lune is for adults: it carries trading and payments. Change here to change the rule everywhere. */
export const MIN_AGE = 18;

export type AgeStatus = 'required' | 'ok' | 'underage';

/** Whole years between `birth` (YYYY-MM-DD) and `today`, in UTC. */
export const ageOn = (birth: string, today: Date = new Date()) => {
  const [y, m, d] = birth.split('-').map(Number);
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) age -= 1;
  return age;
};

/** A real calendar date in the past, not before 1900. */
export const isValidBirthDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value > '1900-01-01' && parsed <= new Date();
};

export const ageStatus = async (profileId: string): Promise<AgeStatus> => {
  const [row] = (await sql`select birth_date::text as birth_date from public.profile_age where profile_id = ${profileId}`) as { birth_date: string }[];
  if (!row) return 'required';
  return ageOn(row.birth_date) >= MIN_AGE ? 'ok' : 'underage';
};
