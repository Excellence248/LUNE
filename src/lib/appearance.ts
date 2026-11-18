import { useSyncExternalStore } from 'react';

/*
 * Background pictures. A member can pick a preset or upload their own picture for the whole app and,
 * separately, for the chat. Choices are saved in this browser (localStorage), so they apply instantly,
 * need no account, and are private to the device. Uploaded pictures are shrunk first (longest side
 * 1600 px, JPEG) so they stay small enough to keep.
 */

export type Background = { kind: 'default' } | { kind: 'preset'; id: string } | { kind: 'image'; data: string };

export interface Appearance {
  app: Background;
  chat: Background;
  /** How much the picture is darkened so text stays readable, 0 to 0.8. */
  appDim: number;
  chatDim: number;
}

export interface Preset { id: string; name: string; css: string }

const blob = (size: string, at: string, color: string) => `radial-gradient(${size} at ${at}, ${color}, transparent 62%)`;

export const PRESETS: Preset[] = [
  { id: 'aurora', name: 'Aurora', css: `${blob('60rem 40rem', '15% 10%', 'rgba(168,85,247,.55)')}, ${blob('50rem 35rem', '90% 90%', 'rgba(59,130,246,.45)')}, ${blob('40rem 30rem', '70% 20%', 'rgba(236,72,153,.28)')}, #0b0618` },
  { id: 'sunset', name: 'Sunset', css: `${blob('55rem 40rem', '80% 100%', 'rgba(251,146,60,.6)')}, ${blob('50rem 35rem', '10% 0%', 'rgba(147,51,234,.6)')}, ${blob('40rem 30rem', '60% 40%', 'rgba(244,63,94,.35)')}, #14061f` },
  { id: 'ocean', name: 'Ocean', css: `${blob('60rem 40rem', '20% 90%', 'rgba(20,184,166,.5)')}, ${blob('50rem 35rem', '85% 10%', 'rgba(59,130,246,.55)')}, #04111f` },
  { id: 'forest', name: 'Forest', css: `${blob('55rem 40rem', '80% 90%', 'rgba(34,197,94,.4)')}, ${blob('45rem 35rem', '10% 10%', 'rgba(13,148,136,.45)')}, #04140f` },
  { id: 'rose', name: 'Rosé', css: `${blob('55rem 40rem', '90% 10%', 'rgba(244,114,182,.55)')}, ${blob('50rem 35rem', '10% 100%', 'rgba(168,85,247,.45)')}, #190716` },
  { id: 'ember', name: 'Ember', css: `${blob('55rem 40rem', '20% 100%', 'rgba(239,68,68,.5)')}, ${blob('45rem 35rem', '90% 20%', 'rgba(245,158,11,.4)')}, #170706` },
  { id: 'midnight', name: 'Midnight', css: `${blob('60rem 40rem', '50% -10%', 'rgba(79,70,229,.5)')}, ${blob('40rem 30rem', '90% 100%', 'rgba(30,64,175,.4)')}, #020617` },
  { id: 'graphite', name: 'Graphite', css: `${blob('60rem 40rem', '30% 0%', 'rgba(148,163,184,.25)')}, ${blob('40rem 30rem', '100% 100%', 'rgba(100,116,139,.25)')}, #0b0d12` },
];

export const DEFAULT_CHAT_PRESET = 'aurora';
const KEY = 'lune_appearance_v1';

const DEFAULT: Appearance = { app: { kind: 'default' }, chat: { kind: 'default' }, appDim: 0.45, chatDim: 0.25 };

const isBackground = (value: unknown): value is Background => {
  if (!value || typeof value !== 'object') return false;
  const bg = value as { kind?: unknown; id?: unknown; data?: unknown };
  if (bg.kind === 'default') return true;
  if (bg.kind === 'preset') return typeof bg.id === 'string' && PRESETS.some(preset => preset.id === bg.id);
  // The whole value must be a plain base64 picture, so nothing stored can ever break out of the CSS url("…").
  return bg.kind === 'image' && typeof bg.data === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(bg.data);
};
const clampDim = (value: unknown, fallback: number) => (typeof value === 'number' && value >= 0 && value <= 0.8 ? value : fallback);

const read = (): Appearance => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<Appearance> | null;
    if (!parsed) return DEFAULT;
    return {
      app: isBackground(parsed.app) ? parsed.app : DEFAULT.app,
      chat: isBackground(parsed.chat) ? parsed.chat : DEFAULT.chat,
      appDim: clampDim(parsed.appDim, DEFAULT.appDim),
      chatDim: clampDim(parsed.chatDim, DEFAULT.chatDim),
    };
  } catch {
    return DEFAULT;
  }
};

let state: Appearance = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export const getAppearance = () => state;

/** Saves a change. Throws a readable error if the browser has no room left (large pictures can fill it). */
export const setAppearance = (patch: Partial<Appearance>) => {
  const next = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error('Your browser has no space left to save this picture. Try a smaller one.');
  }
  state = next;
  emit();
};

export const resetAppearance = () => {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  state = DEFAULT;
  emit();
};

// Another tab changed it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) { state = read(); emit(); }
  });
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useAppearance = () => useSyncExternalStore(subscribe, () => state, () => DEFAULT);

/** The CSS `background` for a choice, or null for "default" when the area has its own default look. */
export const backgroundCss = (bg: Background, fallbackPreset?: string): string | null => {
  if (bg.kind === 'image') return `url("${bg.data}") center / cover no-repeat`;
  const id = bg.kind === 'preset' ? bg.id : fallbackPreset;
  return PRESETS.find(preset => preset.id === id)?.css ?? null;
};

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const LONGEST_SIDE = 1600;
const MAX_CHARS = 1_400_000;

/** Reads a picture the member chose and returns a small JPEG data URL ready to keep. */
export const prepareBackground = async (file: File): Promise<string> => {
  if (!TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG, WebP, or GIF picture.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That picture is too large. Choose one under 15 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That picture could not be read. Try another one.');
  }
  const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not process that picture.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let quality = 0.82;
  let data = canvas.toDataURL('image/jpeg', quality);
  while (data.length > MAX_CHARS && quality > 0.4) {
    quality -= 0.1;
    data = canvas.toDataURL('image/jpeg', quality);
  }
  if (data.length > MAX_CHARS) throw new Error('That picture is too detailed to keep. Try a smaller one.');
  return data;
};
