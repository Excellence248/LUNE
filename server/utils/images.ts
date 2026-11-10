export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** Checks the file's leading bytes, so a renamed HTML or script file cannot be served as an image. */
export const sniffImage = (bytes: Uint8Array): ImageType | null => {
  const starts = (...sig: number[]) => sig.every((value, i) => bytes[i] === value);
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (starts(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
};

/** Headers for serving user images: cache forever (URLs never change) and never run anything. */
export const imageHeaders = (contentType: string) => ({
  'Content-Type': contentType,
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
});
