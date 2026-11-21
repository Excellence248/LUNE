import { defineHandler } from 'nitro';
import { sql } from '../utils/db';

// Link previews. When a Lune link (a post, profile or community) is pasted into WhatsApp, Telegram, X,
// Discord, Slack and the like, their crawler asks for the page and reads its title, description and
// picture. The app itself is a single page that fills in after loading, which crawlers do not run, so for
// these crawlers only we answer with a small page that has the right tags. Everyone else, and any
// failure, simply carries on to the normal app: this never changes what a member sees.
const CRAWLER = /facebookexternalhit|whatsapp|twitterbot|telegrambot|discordbot|slackbot|slack-imgproxy|linkedinbot|pinterest|skypeuripreview|applebot|googlebot|bingbot|embedly|vkshare|redditbot/i;
const ROUTE = /^\/(post|profile|communities)\/([^/?#]+)$/;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const escape = (text: string) => text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
const clip = (text: string, length: number) => (text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text);

interface Card { title: string; description: string; image: string }

const load = async (kind: string, key: string): Promise<Card | null> => {
  if (kind === 'post') {
    if (!UUID.test(key)) return null;
    const [row] = await sql`select public.post_json(po) as post from public.posts po where po.id = ${key}`;
    const post = row?.post as { content?: string; image_url?: string; images?: string[]; profiles?: { username?: string; display_name?: string; avatar_url?: string } } | undefined;
    if (!post) return null;
    const who = post.profiles?.display_name || post.profiles?.username || 'Someone';
    return { title: `${who} on Lune`, description: post.content || 'Shared a picture on Lune.', image: post.images?.[0] || post.image_url || post.profiles?.avatar_url || '' };
  }
  if (kind === 'profile') {
    const name = decodeURIComponent(key);
    if (!/^[A-Za-z0-9_]{3,64}$/.test(name)) return null;
    const [row] = await sql`select p.username, p.display_name, p.bio, public.avatar_src(p) as avatar_url from public.profiles p where lower(p.username) = lower(${name})`;
    if (!row) return null;
    return { title: `${row.display_name || row.username} (@${row.username}) on Lune`, description: (row.bio as string) || `See ${row.display_name || row.username}'s posts on Lune.`, image: (row.avatar_url as string) || '' };
  }
  const slug = decodeURIComponent(key).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) return null;
  const [row] = await sql`
    select c.name, c.description, c.avatar_url, c.cover_url, (select count(*)::int from public.community_members m where m.community_id = c.id) as members
    from public.communities c where lower(c.slug) = ${slug}`;
  if (!row) return null;
  return { title: `${row.name} on Lune`, description: `${row.members} ${row.members === 1 ? 'member' : 'members'}${row.description ? ` · ${row.description}` : ''}`, image: (row.cover_url as string) || (row.avatar_url as string) || '' };
};

export default defineHandler(async (event) => {
  try {
    if (event.req.method !== 'GET') return;
    if (!CRAWLER.test(event.req.headers.get('user-agent') ?? '')) return;
    const url = new URL(event.req.url);
    const match = ROUTE.exec(url.pathname);
    if (!match) return;
    const card = await load(match[1], match[2]);
    if (!card) return;
    const host = event.req.headers.get('x-forwarded-host') || event.req.headers.get('host') || url.host;
    const proto = event.req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
    const origin = `${proto}://${host}`;
    const image = card.image ? (card.image.startsWith('http') ? card.image : `${origin}${card.image}`) : `${origin}/lune-mascot.jpg`;
    const title = escape(clip(card.title, 90));
    const description = escape(clip(card.description.replace(/\s+/g, ' ').trim(), 200));
    const page = `${origin}${url.pathname}`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:site_name" content="Lune"><meta property="og:type" content="article">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<meta property="og:image" content="${escape(image)}"><meta property="og:url" content="${escape(page)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${escape(image)}">
</head><body><p><a href="${escape(page)}">${title}</a></p></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  } catch {
    // Anything wrong: fall through to the normal app.
    return;
  }
});
