import { HTTPError, getRouterParam, type H3Event } from 'nitro/h3';
import { sql } from './db';

export const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const MEDIA_PATH = /^\/api\/media\/([0-9a-f-]{36})$/;

export const slugParam = (event: H3Event) => {
  const slug = (getRouterParam(event, 'slug') ?? '').toLowerCase();
  if (!SLUG.test(slug)) throw new HTTPError('Community not found', { status: 404 });
  return slug;
};

/** A community as the app shows it: the owner, how many members, and the viewer's own role in it. */
export const loadCommunity = async (slug: string, viewerId: string | null) => {
  const [community] = await sql`
    select c.id, c.slug, c.name, c.description, c.rules, c.avatar_url, c.cover_url, c.owner_id, c.created_at,
      (select count(*)::int from public.community_members m where m.community_id = c.id) as member_count,
      (select m.role from public.community_members m where m.community_id = c.id and m.profile_id = ${viewerId}::uuid) as viewer_role,
      jsonb_build_object('id', o.id, 'username', o.username, 'display_name', o.display_name, 'avatar_url', public.avatar_src(o)) as owner
    from public.communities c join public.profiles o on o.id = c.owner_id
    where lower(c.slug) = ${slug}`;
  return community ?? null;
};

export const requireCommunity = async (slug: string, viewerId: string | null) => {
  const community = await loadCommunity(slug, viewerId);
  if (!community) throw new HTTPError('Community not found', { status: 404 });
  return community;
};

/** A community picture must be an upload the caller owns (or empty to remove it). */
export const checkCommunityPicture = async (value: unknown, ownerId: string, label: string) => {
  if (value === '' || value == null) return '';
  const match = typeof value === 'string' ? MEDIA_PATH.exec(value) : null;
  if (!match) throw new HTTPError(`Upload the ${label} again, then retry.`, { status: 400 });
  const [owned] = await sql`select 1 from public.media where id = ${match[1]} and owner_id = ${ownerId}`;
  if (!owned) throw new HTTPError(`Upload the ${label} again, then retry.`, { status: 400 });
  return value as string;
};

/** Maps the database's community errors to HTTP errors a member can act on. */
export const communityError = (error: unknown): never => {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;
  if (code === '23505') throw new HTTPError('That name or address is already taken. Try another.', { status: 409 });
  if (code === '23514') throw new HTTPError(message.includes('violates check constraint') ? 'Check the name, address and description, then try again.' : message, { status: 400 });
  if (code === '42501') throw new HTTPError(message, { status: 403 });
  throw error;
};
