import { defineHandler } from 'nitro';
import { HTTPError, readBody, setCookie } from 'nitro/h3';
import { sql } from '../../../utils/db';
import { SESSION_DAYS, WALLET_COOKIE, checkSignature, createWalletSession, isWalletAddress } from '../../../utils/wallet';

interface Body { address?: unknown; nonce?: unknown; signature?: unknown }

// Body: { address, nonce, signature (base64) }. Signs the wallet in and returns its profile.
export default defineHandler(async (event) => {
  const { address, nonce, signature } = ((await readBody<Body>(event)) ?? {}) as Body;
  if (!isWalletAddress(address) || typeof nonce !== 'string' || typeof signature !== 'string') throw new HTTPError('Invalid sign-in request.', { status: 400 });
  const result = checkSignature(address, nonce, signature, event.req.headers.get('host') ?? 'lune');
  if (!result.nonceId) throw new HTTPError(result.error ?? 'Sign-in failed. Try again.', { status: 401 });
  const [used] = await sql`insert into public.wallet_nonces (nonce) values (${result.nonceId}) on conflict do nothing returning nonce`;
  if (!used) throw new HTTPError('This sign-in request was already used. Try again.', { status: 401 });
  await sql`delete from public.wallet_nonces where used_at < now() - interval '1 day'`;
  const [profile] = await sql`
    select p.id, p.username, p.bio, public.avatar_src(p) as avatar_url, p.wallet_address
    from public.ensure_wallet_profile(${address}) p`;
  setCookie(event, WALLET_COOKIE, createWalletSession(profile.id, address), {
    httpOnly: true,
    sameSite: 'lax',
    secure: event.url.protocol === 'https:',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
  return profile;
});
