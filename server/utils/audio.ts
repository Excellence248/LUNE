export const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4'] as const;
export type AudioType = (typeof AUDIO_TYPES)[number];

/** Voice notes: up to 3 MB and 2 minutes. Vercel caps request bodies at 4.5 MB. */
export const MAX_VOICE_BYTES = 3 * 1024 * 1024;
export const MIN_VOICE_MS = 500;
export const MAX_VOICE_MS = 120_000;

/**
 * Checks the file's leading bytes, so something that is not audio (a renamed HTML or script file) can
 * never be stored and later served. Browsers record WebM (Chrome, Edge), Ogg (Firefox) or MP4 (Safari).
 */
export const sniffAudio = (bytes: Uint8Array): AudioType | null => {
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'audio/webm';
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'audio/ogg';
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'audio/mp4';
  return null;
};

/** "0,12,80,…": up to 64 loudness values from 0 to 100, for drawing the waveform. Anything else is dropped. */
export const parsePeaks = (header: string | null): number[] => {
  if (!header) return [];
  const values = header.split(',').slice(0, 64).map(part => Number(part.trim()));
  return values.every(value => Number.isInteger(value) && value >= 0 && value <= 100) ? values : [];
};

/**
 * Reads an HTTP Range header ("bytes=0-99", "bytes=500-", "bytes=-100") for a file of `total` bytes.
 * Returns the inclusive byte range, 'unsatisfiable' when it lies outside the file, or null when there
 * is no usable range (the whole file is sent).
 */
export const parseRange = (header: string | null, total: number): { start: number; end: number } | 'unsatisfiable' | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
  return start >= total || start > end ? 'unsatisfiable' : { start, end };
};
