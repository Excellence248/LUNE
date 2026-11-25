import { HTTPError } from 'nitro/h3';
import { sql } from './db';
import { isMissingSchema } from './calls';

/** Which optional post features this database has (they all arrive with one migration). */
export interface FeedFeatures { images: boolean; threads: boolean; communities: boolean }

let cached: { at: number; features: FeedFeatures } | null = null;

/** Looked up from the database's own catalogue and remembered for 30 seconds. */
export const feedFeatures = async (): Promise<FeedFeatures> => {
  if (cached && Date.now() - cached.at < 30_000) return cached.features;
  const [columns, tables] = await Promise.all([
    sql`select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'posts' and column_name in ('image_urls', 'thread_root_id', 'community_id')`,
    sql`select to_regclass('public.communities') is not null as present`,
  ]);
  const names = new Set(columns.map(row => row.column_name as string));
  const features = {
    images: names.has('image_urls'),
    threads: names.has('thread_root_id'),
    communities: names.has('community_id') && !!tables[0]?.present,
  };
  cached = { at: Date.now(), features };
  return features;
};

export const forgetFeedFeatures = () => { cached = null; };

/** Runs a query built for the current features; if a migration landed since we last looked, learn it and retry once. */
export const withFeedFeatures = async <T>(run: (features: FeedFeatures) => Promise<T>): Promise<T> => {
  try {
    return await run(await feedFeatures());
  } catch (error) {
    if (!isMissingSchema(error)) throw error;
    forgetFeedFeatures();
    return await run(await feedFeatures());
  }
};

/** A feature that is not set up yet answers 503 with a clear message instead of an error. */
export const requireCommunities = async () => {
  const features = await feedFeatures();
  if (!features.communities) throw new HTTPError('Communities aren’t available yet. Please try again soon.', { status: 503 });
};
