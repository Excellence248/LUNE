import { HTTPError } from 'nitro/h3';
import { sql } from './db';

/**
 * Refuses text that uses racial or ethnic slurs or hate slogans. This is a keyword filter, not a
 * judgement of intent: it will not catch coded or purely contextual racism, and it also blocks
 * someone quoting a slur to condemn it. Members can still report anything it misses (POST /api/reports).
 *
 * The list is stored ROT13-encoded so the slurs are not sitting in plain text in the repository.
 */
const rot13 = (text: string) => text.replace(/[a-z]/g, c => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));

const SLURS = ['avttre', 'avttn', 'avttnu', 'xvxr', 'tbbx', 'jrgonpx', 'ornare', 'qnexvr', 'gbjryurnq', 'xnssve', 'wvtnobb', 'cbepu zbaxrl'];
const PHRASES = ['tb onpx gb nsevpn', 'juvgr cbjre', 'tnf gur wrjf', 'urvy uvgyre'];

// Look-alike characters people use to dodge filters.
const DIGITS: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" };
const SYMBOLS: Record<string, string> = { "!": "i", "|": "i", "@": "a", "$": "s", "+": "t" };

const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\p{M}\p{Cf}]/gu, '') // accents and zero-width characters
    .toLowerCase()
    .replace(/ı/g, 'i') // dotless i
    .replace(/[013457]/g, c => DIGITS[c])
    // Symbols only stand in for a letter in the middle of a word, so "nigga!" keeps its "!".
    .replace(/(?<=[a-z])[!|@$+](?=[a-z])/g, c => SYMBOLS[c]);

/**
 * One regex per term. Letters may be stretched ("niggggger") and separated ("n.i.g.g.e.r"), and a
 * doubled letter in the term must stay doubled, so "Niger" does not match. The term must stand alone
 * (not inside "snigger"), optionally with a plural "s".
 */
const compile = (term: string, allowPlural: boolean) => {
  const body = term
    .split(' ')
    .map(word => (word.match(/(.)\1*/g) ?? []).map(run => `(?:${run[0]}[^a-z]*){${run.length - 1}}${run[0]}+`).join('[^a-z]*'))
    .join('[^a-z]+');
  return new RegExp(`(?<![a-z])${body}${allowPlural ? 's?' : ''}(?![a-z])`);
};

const PATTERNS = [
  ...SLURS.map(term => ({ category: 'slur' as const, regex: compile(rot13(term), true) })),
  ...PHRASES.map(term => ({ category: 'hate_phrase' as const, regex: compile(rot13(term), false) })),
];

export type ModerationCategory = 'slur' | 'hate_phrase';

/** The category of the first hateful term found, or null when the text is fine. */
export const screenText = (text: string): ModerationCategory | null => {
  const clean = normalize(text);
  return PATTERNS.find(({ regex }) => regex.test(clean))?.category ?? null;
};

const STRIKE_LIMIT = 5;

/**
 * Throws 422 when `text` is hateful, and records the attempt (not the text). After STRIKE_LIMIT
 * refusals in 24 hours the member is paused from posting until the oldest one ages out.
 */
export const enforceCivility = async (profileId: string, surface: 'post' | 'reply' | 'bio' | 'username', text: string) => {
  const [{ strikes }] = (await sql`
    select count(*)::int as strikes from public.moderation_events
    where profile_id = ${profileId} and created_at > now() - interval '24 hours'`) as { strikes: number }[];
  if (strikes >= STRIKE_LIMIT) {
    throw new HTTPError('Your posting is paused for 24 hours after repeated messages that targeted people for their race or ethnicity.', { status: 429 });
  }
  const category = screenText(text);
  if (!category) return;
  await sql`insert into public.moderation_events (profile_id, surface, category) values (${profileId}, ${surface}, ${category})`;
  throw new HTTPError('That uses language that targets people for their race or ethnicity, which isn’t allowed on Lune. Please rephrase it.', { status: 422 });
};
