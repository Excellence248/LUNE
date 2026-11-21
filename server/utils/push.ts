import { createCipheriv, createECDH, createPrivateKey, createSign, hkdfSync, randomBytes } from 'node:crypto';
import { sql } from './db';

// Web Push (RFC 8030 + 8291 + VAPID 8292) with Node's own crypto, so it needs no extra package.
// Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (base64url); without them every call is a quiet no-op.

const SUBJECT = process.env.VAPID_SUBJECT || 'https://github.com/Excellence248/LUNE';
const b64 = (data: Buffer) => data.toString('base64url');

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || '';
export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let signingKey: ReturnType<typeof createPrivateKey> | null = null;
const vapidKey = () => {
  if (signingKey) return signingKey;
  const d = Buffer.from(process.env.VAPID_PRIVATE_KEY!, 'base64url');
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(d);
  const point = ecdh.getPublicKey();
  signingKey = createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: b64(point.subarray(1, 33)), y: b64(point.subarray(33, 65)), d: b64(d) }, format: 'jwk' });
  return signingKey;
};

export const vapidHeader = (endpoint: string) => {
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT };
  const unsigned = `${b64(Buffer.from('{"typ":"JWT","alg":"ES256"}'))}.${b64(Buffer.from(JSON.stringify(claims)))}`;
  const signature = createSign('SHA256').update(unsigned).sign({ key: vapidKey(), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${unsigned}.${b64(signature)}, k=${pushPublicKey()}`;
};

/** Encrypts a payload for one subscription (aes128gcm, a single record). */
export const encrypt = (payload: Buffer, p256dh: string, auth: string) => {
  const receiver = Buffer.from(p256dh, 'base64url');
  const authSecret = Buffer.from(auth, 'base64url');
  const ephemeral = createECDH('prime256v1');
  const sender = ephemeral.generateKeys();
  const shared = ephemeral.computeSecret(receiver);
  const salt = randomBytes(16);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), receiver, sender]), 32));
  const key = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = createCipheriv('aes-128-gcm', key, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(sender.length, 20);
  return Buffer.concat([header, sender, body]);
};

export interface PushMessage {
  title: string;
  body: string;
  /** Where tapping the notification goes. */
  url: string;
  /** A newer notification with the same tag replaces the older one. */
  tag?: string;
  /** Keep it on screen until acted on (incoming calls). */
  urgent?: boolean;
  /** Which of the member's notification switches covers this one. */
  category?: PushCategory;
}

export const PUSH_CATEGORIES = ['messages', 'calls', 'replies', 'likes', 'follows', 'mentions'] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

/** Sends a notification to every device a member has enabled. Never throws; dead devices are forgotten. */
export const pushTo = async (userId: string, message: PushMessage) => {
  if (!pushConfigured()) return;
  try {
    const everyDevice = () => sql`select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = ${userId}`;
    let subs;
    if (message.category && (PUSH_CATEGORIES as readonly string[]).includes(message.category)) {
      // The column name comes from the fixed list above, never from a request. A member who never opened the
      // switches has no row, which means everything is on. Before the preferences migration, send as before.
      try {
        const [prefs] = await sql.query(`select ${message.category} as on from public.notification_prefs where user_id = $1`, [userId]);
        if (prefs && prefs.on === false) return;
        subs = await everyDevice();
      } catch {
        subs = await everyDevice();
      }
    } else subs = await everyDevice();
    if (!subs.length) return;
    const payload = Buffer.from(JSON.stringify({ ...message, body: message.body.slice(0, 140) }));
    const gone: string[] = [];
    await Promise.allSettled(subs.map(async (sub) => {
      const res = await fetch(sub.endpoint as string, {
        method: 'POST',
        headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: message.urgent ? '30' : '86400', Urgency: message.urgent ? 'high' : 'normal', Authorization: vapidHeader(sub.endpoint as string) },
        body: encrypt(payload, sub.p256dh as string, sub.auth as string),
        signal: AbortSignal.timeout(4000),
      });
      if (res.status === 404 || res.status === 410) gone.push(sub.id as string);
    }));
    if (gone.length) await sql`delete from public.push_subscriptions where id = any(${gone}::uuid[])`;
  } catch {
    // A failed push must never fail the action that caused it.
  }
};

/** The name to show for a member: their display name, else their username. */
export const nameOf = async (profileId: string) => {
  const [row] = await sql`select coalesce(nullif(display_name, ''), username) as name, username from public.profiles where id = ${profileId}`;
  return { name: (row?.name as string) || 'Someone', username: (row?.username as string) || '' };
};

/** Tells a post's author that someone liked, reposted or replied to it (never for their own activity). */
export const notifyPostOwner = async (actorId: string, postId: string, kind: 'like' | 'repost' | 'reply', text = '') => {
  if (!pushConfigured()) return;
  try {
    const [post] = await sql`select user_id, left(content, 80) as snippet from public.posts where id = ${postId}`;
    if (!post || post.user_id === actorId) return;
    const { name } = await nameOf(actorId);
    const verb = { like: 'liked your post', repost: 'reposted your post', reply: 'replied to your post' }[kind];
    await pushTo(post.user_id as string, { title: `${name} ${verb}`, body: kind === 'reply' ? text : (post.snippet as string) || 'Open Lune to see it', url: `/post/${postId}`, tag: `${kind}:${postId}`, category: kind === 'like' || kind === 'repost' ? 'likes' : 'replies' });
  } catch {
    // never fails the action
  }
};

/** Tells members named with @username in a post or reply, unless they have blocked or been blocked by the author. */
export const notifyMentions = async (actorId: string, text: string, url: string) => {
  if (!pushConfigured()) return;
  try {
    const names = [...new Set([...text.matchAll(/(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,64})/g)].map(match => match[1].toLowerCase()))].slice(0, 5);
    if (!names.length) return;
    const people = await sql`
      select p.id from public.profiles p
      where lower(p.username) = any(${names}::text[]) and p.id <> ${actorId}
        and not exists (select 1 from public.blocks b where (b.blocker_id = ${actorId} and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = ${actorId}))`;
    if (!people.length) return;
    const { name } = await nameOf(actorId);
    await Promise.all(people.map(person => pushTo(person.id as string, { title: `${name} mentioned you`, body: text, url, tag: `mention:${url}`, category: 'mentions' })));
  } catch {
    // never fails the action
  }
};
