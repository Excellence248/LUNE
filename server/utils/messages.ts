import { sql } from './db';

/** Which optional message features this database has (each arrives with its own migration). */
export interface MessageFeatures { voice: boolean; replies: boolean }

let cached: { at: number; features: MessageFeatures } | null = null;

/** Looked up from the database's own catalogue and remembered for 30 seconds. */
export const messageFeatures = async (): Promise<MessageFeatures> => {
  if (cached && Date.now() - cached.at < 30_000) return cached.features;
  const rows = await sql`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'direct_messages' and column_name in ('kind', 'reply_to_id')`;
  const names = new Set(rows.map(row => row.column_name as string));
  const features = { voice: names.has('kind'), replies: names.has('reply_to_id') };
  cached = { at: Date.now(), features };
  return features;
};

/** Forget what we know, for when a migration has just been applied. */
export const forgetMessageFeatures = () => { cached = null; };

/**
 * The columns and joins for reading messages, with whichever optional parts exist. Only fixed text is
 * ever added here (chosen by the two booleans), never anything from a request.
 */
export const messageParts = (features: MessageFeatures) => ({
  columns: [
    'd.id', 'd.sender_id', 'd.content', 'd.created_at', 'd.read_at',
    features.voice ? 'd.kind, d.voice_id, v.duration_ms, v.peaks' : "'text' as kind",
    features.replies ? `d.reply_to_id, rp.sender_id as reply_sender_id, left(rp.content, 160) as reply_content, ${features.voice ? "(rp.kind = 'voice')" : 'false'} as reply_voice` : '',
  ].filter(Boolean).join(', '),
  joins: [
    features.voice ? 'left join public.voice_notes v on v.id = d.voice_id' : '',
    features.replies ? 'left join public.direct_messages rp on rp.id = d.reply_to_id' : '',
  ].join(' '),
});

/** One message as the app shows it (quote and voice details included). */
export const loadMessage = async (id: string, features: MessageFeatures) => {
  const parts = messageParts(features);
  const rows = await sql.query(`select ${parts.columns} from public.direct_messages d ${parts.joins} where d.id = $1`, [id]);
  return rows[0];
};
