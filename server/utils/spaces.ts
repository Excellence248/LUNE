import { HTTPError, getRouterParam, type H3Event } from 'nitro/h3';

export const spaceParam = (event: H3Event) => {
  const id = getRouterParam(event, 'id') ?? '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new HTTPError('Space not found', { status: 404 });
  return id;
};

/** Small JSON payloads only: WebRTC descriptions and ICE candidates are a few KB at most. */
export const boundedJson = (value: unknown, maxBytes = 16000) => {
  const text = JSON.stringify(value ?? null);
  if (text.length > maxBytes) throw new HTTPError('Message too large', { status: 413 });
  return text;
};
