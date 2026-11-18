import { HTTPError, getRouterParam, type H3Event } from 'nitro/h3';

export const spaceParam = (event: H3Event) => {
  const id = getRouterParam(event, 'id') ?? '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new HTTPError('Space not found', { status: 404 });
  return id;
};

const REALTIME = 'https://rtc.live.cloudflare.com/v1';

/**
 * Calls the Cloudflare Realtime SFU, which carries all Space audio: each member sends their mic to it
 * once and it forwards to every listener, so nobody's upload grows with the audience.
 * Needs REALTIME_SFU_APP_ID and REALTIME_SFU_BEARER_TOKEN (the app secret, server-only).
 */
export const sfu = async <T>(method: 'POST' | 'PUT', path: string, body?: object): Promise<T> => {
  const app = process.env.REALTIME_SFU_APP_ID, secret = process.env.REALTIME_SFU_BEARER_TOKEN;
  if (!app || !secret) throw new HTTPError('Audio is not set up on this server yet.', { status: 503 });
  const res = await fetch(`${REALTIME}/apps/${app}${path}`, {
    method, headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as (T & { errorCode?: string; errorDescription?: string }) | null;
  if (!res.ok || !data || data.errorCode) {
    console.error('Realtime SFU', method, path, res.status, data?.errorCode, data?.errorDescription);
    throw new HTTPError('The audio service did not respond. Try again.', { status: 502 });
  }
  return data;
};

/**
 * ICE servers for a member's connection: short-lived Cloudflare TURN credentials when
 * REALTIME_TURN_KEY_ID / REALTIME_TURN_KEY_API_TOKEN are set (needed on mobile data and strict Wi-Fi), else STUN only.
 */
export const iceServers = async (): Promise<{ urls: string | string[]; username?: string; credential?: string }[]> => {
  const stun = [{ urls: 'stun:stun.cloudflare.com:3478' }];
  const key = process.env.REALTIME_TURN_KEY_ID, token = process.env.REALTIME_TURN_KEY_API_TOKEN;
  if (!key || !token) return stun;
  try {
    const res = await fetch(`${REALTIME}/turn/keys/${key}/credentials/generate-ice-servers`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { iceServers: servers } = (await res.json()) as { iceServers: { urls: string | string[]; username?: string; credential?: string }[] };
    // Browsers block port 53, and a URL that never answers only slows down connecting.
    return servers.map(s => ({ ...s, urls: ([] as string[]).concat(s.urls).filter(u => !/:53\b/.test(u)) }));
  } catch (error) {
    console.error('Realtime TURN credentials failed', error);
    return stun;
  }
};

/** Small JSON payloads only: WebRTC descriptions and ICE candidates are a few KB at most. */
export const boundedJson = (value: unknown, maxBytes = 16000) => {
  const text = JSON.stringify(value ?? null);
  if (text.length > maxBytes) throw new HTTPError('Message too large', { status: 413 });
  return text;
};
