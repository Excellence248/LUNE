import { uploadImage } from '@/lib/api';

export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_PICTURES = 10;
const MAX_EDGE = 1920;
const MAX_BYTES = 4 * 1024 * 1024;

/** Shrinks a photo to a sensible size before upload so ten of them go up quickly. GIFs and small files are kept as they are. */
export const prepareImage = async (file: File): Promise<File> => {
  if (!PICTURE_TYPES.includes(file.type)) throw new Error('Choose JPG, PNG, WebP or GIF pictures.');
  if (file.type === 'image/gif') {
    if (file.size > MAX_BYTES) throw new Error('GIFs must be 4 MB or smaller.');
    return file;
  }
  if (file.size <= 600 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return fits(file);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.84));
    if (!blob || blob.size >= file.size) return fits(file);
    return fits(new File([blob], file.name.replace(/\.\w+$/, type === 'image/webp' ? '.webp' : '.jpg'), { type }));
  } catch {
    return fits(file);
  }
};

const fits = (file: File) => {
  if (file.size > MAX_BYTES) throw new Error('That picture is too large. Choose one under 4 MB.');
  return file;
};

/** Uploads pictures three at a time, keeping their order, and reports how many have finished. */
export const uploadPictures = async (files: File[], onProgress?: (done: number) => void): Promise<string[]> => {
  const urls: string[] = new Array(files.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < files.length) {
      const index = next++;
      urls[index] = await uploadImage(files[index]);
      onProgress?.(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
  return urls;
};
