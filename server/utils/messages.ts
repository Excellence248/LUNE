import { sql } from './db';

/** Which optional message features this database has (each arrives with its own migration). */
export interface MessageFeatures { voice: boolean; replies: boolean; images: boolean; deletes: boolean; reactions: boolean }

let cached: { at: number; features: MessageFeatures } | null = null;

/** Looked up from the database's own catalogue and remembered for 30 seconds. */
export const messageFeatures = async (): Promise<MessageFeatures> => {
  if (cached && Date.now() - cached.at < 30_000) return cached.features;
  const [rows, [reactions]] = await Promise.all([
    sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'direct_messages' and column_name in ('kind', 'reply_to_id', 'image_id', 'deleted_at')`,
    sql`select to_regclass('public.message_reactions') is not null as present`,
  ]);
  const names = new Set(rows.map(row => row.column_name as string));
  const features = { voice: names.has('kind'), replies: names.has('reply_to_id'), images: names.has('image_id'), deletes: names.has('deleted_at'), reactions: !!reactions?.present };
  cached = { at: Date.now(), features };
  return features;
};

/** Forget what we know, for when a migration has just been applied. */
export const forgetMessageFeatures = () => { cached = null; };

/**
 * The columns and joins for reading messages, with whichever optional parts exist. Only fixed text is
 * ever added here (chosen by the booleans), never anything from a request. A deleted message keeps its
 * place in the conversation but its text and attachment are blanked.
 */
export const messageParts = (features: MessageFeatures) => {
  const alive = features.deletes ? ' and rp.deleted_at is null' : '';
  const replyText = features.deletes ? "case when rp.deleted_at is null then left(rp.content, 160) else '' end" : 'left(rp.content, 160)';
  return {
  columns: [
    'd.id', 'd.sender_id', features.deletes ? "case when d.deleted_at is null then d.content else '' end as content" : 'd.content', 'd.created_at', 'd.read_at',
    features.voice ? 'd.kind, d.voice_id, v.duration_ms, v.peaks' : "'text' as kind",
    features.deletes ? '(d.deleted_at is not null) as deleted' : '',
    features.images ? `${features.deletes ? 'case when d.deleted_at is null then d.image_id end' : 'd.image_id'} as image_id` : '',
    features.replies ? `d.reply_to_id, rp.sender_id as reply_sender_id, ${replyText} as reply_content, ${features.voice ? `(rp.kind = 'voice'${alive})` : 'false'} as reply_voice` : '',
    features.replies && features.images ? `(rp.kind = 'image'${alive}) as reply_image` : '',
    features.replies && features.deletes ? '(rp.deleted_at is not null) as reply_deleted' : '',
    features.reactions
      ? "coalesce((select jsonb_agg(jsonb_build_object('emoji', r.emoji, 'user_id', r.user_id) order by r.created_at) from public.message_reactions r where r.message_id = d.id), '[]'::jsonb) as reactions"
      : '',
  ].filter(Boolean).join(', '),
  joins: [
    features.voice ? 'left join public.voice_notes v on v.id = d.voice_id' : '',
    features.replies ? 'left join public.direct_messages rp on rp.id = d.reply_to_id' : '',
  ].join(' '),
  };
};

/** One message as the app shows it (quote, voice, picture and reaction details included). */
export const loadMessage = async (id: string, features: MessageFeatures) => {
  const parts = messageParts(features);
  const rows = await sql.query(`select ${parts.columns} from public.direct_messages d ${parts.joins} where d.id = $1`, [id]);
  return rows[0];
};
