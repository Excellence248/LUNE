import { HTTPError } from 'nitro/h3';
import { sql } from './db';

let cached: { at: number; ready: boolean } | null = null;

/** Whether the referrals and Moon points migration has been applied (remembered for 30 seconds). */
export const pointsReady = async () => {
  if (cached && Date.now() - cached.at < 30_000) return cached.ready;
  const [row] = await sql`select to_regclass('public.referrals') is not null and to_regproc('public.moon_points') is not null as ready`;
  cached = { at: Date.now(), ready: !!row?.ready };
  return cached.ready;
};

export const requirePoints = async () => {
  if (!(await pointsReady())) throw new HTTPError('This isn’t available yet. Please try again soon.', { status: 503 });
};

export const PERIODS = { week: "now() - interval '7 days'", month: "now() - interval '30 days'", all: "'-infinity'::timestamptz" } as const;
export type Period = keyof typeof PERIODS;
export const periodOf = (value: unknown): Period => (value === 'week' || value === 'month' ? value : 'all');

/** Levels by all-time Moon points. */
export const LEVELS = [
  { name: 'Stardust', at: 0 }, { name: 'Comet', at: 50 }, { name: 'Meteor', at: 150 }, { name: 'Moonlet', at: 300 },
  { name: 'Satellite', at: 500 }, { name: 'Planet', at: 800 }, { name: 'Star', at: 1200 }, { name: 'Nova', at: 1700 },
  { name: 'Galaxy', at: 2300 }, { name: 'Supernova', at: 3000 },
];

export const levelFor = (points: number) => {
  let index = 0;
  LEVELS.forEach((level, i) => { if (points >= level.at) index = i; });
  const next = LEVELS[index + 1] ?? null;
  return { number: index + 1, name: LEVELS[index].name, from: LEVELS[index].at, next: next ? { name: next.name, at: next.at } : null };
};
