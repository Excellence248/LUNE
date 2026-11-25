import { sql } from './db';

let cached: { at: number; ready: boolean } | null = null;

/** Whether replies can answer replies and be liked (the reply threads migration), remembered for 30 seconds. */
export const replyThreadsReady = async () => {
  if (cached && Date.now() - cached.at < 30_000) return cached.ready;
  const [row] = await sql`select to_regclass('public.reply_likes') is not null as ready`;
  cached = { at: Date.now(), ready: !!row?.ready };
  return cached.ready;
};
