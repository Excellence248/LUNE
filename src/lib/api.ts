/** Client for this site's own /api. Cookies identify the signed-in member; nothing else is sent. */

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

export const api = async <T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError('The server could not be reached. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data?.code);
  return data as T;
};

/** Uploads an image file and returns its URL, for a post's image. */
export const uploadImage = async (file: File) => {
  const res = await fetch('/api/media', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type }, body: file }).catch(() => null);
  const data = await res?.json().catch(() => null);
  if (!res?.ok) throw new ApiError(data?.message || 'Your image could not be uploaded. Check your connection and try again.', res?.status ?? 0);
  return (data as { url: string }).url;
};

/** Runs `request` and returns null instead of throwing when the server answers 404. */
export const orNull = async <T>(request: Promise<T>) => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};
