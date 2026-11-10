import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from 'node:crypto';

/*
 * Solana wallet sign-in. The server hands out a signed one-time nonce, the wallet signs a plain-text
 * message containing it (no transaction, no funds), and the server checks the ed25519 signature.
 * A successful sign-in gets an HMAC-signed session cookie; nothing is stored server-side except
 * used nonces (wallet_nonces), which stop a signed message from being replayed.
 */

export const WALLET_COOKIE = 'lune_wallet';
export const SESSION_DAYS = 30;
const NONCE_TTL_MS = 5 * 60 * 1000;
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

// SESSION_SECRET if set; otherwise derived from DATABASE_URL, which is already a server-only secret.
const secret = () => {
  const explicit = process.env.SESSION_SECRET;
  if (explicit) return explicit;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return createHash('sha256').update(`lune-wallet-session:${process.env.DATABASE_URL}`).digest('hex');
};

const sign = (payload: object) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
};

const unsign = <T>(token: string | undefined): T | null => {
  const [body, mac] = token?.split('.') ?? [];
  if (!body || !mac) return null;
  const expected = createHmac('sha256', secret()).update(body).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as T;
  } catch {
    return null;
  }
};

export const base58Decode = (value: string) => {
  const bytes = [0];
  for (const char of value) {
    let carry = ALPHABET.indexOf(char);
    if (carry < 0) throw new Error('Invalid base58');
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    for (; carry; carry >>= 8) bytes.push(carry & 0xff);
  }
  for (const char of value) {
    if (char !== '1') break;
    bytes.push(0);
  }
  return Buffer.from(bytes.reverse());
};

export const isWalletAddress = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  try {
    return base58Decode(value).length === 32;
  } catch {
    return false;
  }
};

interface NoncePayload { a: string; n: string; t: number; h: string }

const messageFor = ({ a, n, t, h }: NoncePayload) => [
  `${h} wants you to sign in to Lune with your Solana account:`,
  a,
  '',
  'Sign in to Lune. This proves wallet ownership only; it does not authorize a transaction or transfer funds.',
  '',
  `URI: https://${h}`,
  `Nonce: ${n}`,
  `Issued At: ${new Date(t).toISOString()}`,
].join('\n');

export const createNonce = (address: string, host: string) => {
  const payload: NoncePayload = { a: address, n: randomBytes(16).toString('hex'), t: Date.now(), h: host };
  return { nonce: sign(payload), message: messageFor(payload) };
};

/** Checks the nonce and signature. Returns the nonce id to mark as used, or an error message. */
export const checkSignature = (address: string, nonce: string, signatureBase64: string, host: string) => {
  const payload = unsign<NoncePayload>(nonce);
  if (!payload || payload.a !== address || payload.h !== host) return { error: 'This sign-in request is invalid. Try again.' } as const;
  if (Date.now() - payload.t > NONCE_TTL_MS) return { error: 'This sign-in request expired. Try again.' } as const;
  const signature = Buffer.from(signatureBase64, 'base64');
  if (signature.length !== 64) return { error: 'The wallet signature is invalid.' } as const;
  const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, base58Decode(address)]), format: 'der', type: 'spki' });
  if (!verify(null, Buffer.from(messageFor(payload)), key, signature)) return { error: 'The wallet signature does not match.' } as const;
  return { nonceId: payload.n } as const;
};

interface SessionPayload { p: string; w: string; e: number }

export const createWalletSession = (profileId: string, wallet: string) =>
  sign({ p: profileId, w: wallet, e: Date.now() + SESSION_DAYS * 86400000 } satisfies SessionPayload);

export const readWalletSession = (token: string | undefined) => {
  const payload = unsign<SessionPayload>(token);
  return payload && payload.e > Date.now() ? { profileId: payload.p, wallet: payload.w } : null;
};
