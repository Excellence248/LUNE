import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Full-screen viewer for a post's pictures: arrows, swipe-free keyboard support, Esc to close. */
const Lightbox = ({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) => {
  const [index, setIndex] = useState(start);
  const step = useCallback((by: number) => setIndex(current => (current + by + images.length) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = overflow; };
  }, [onClose, step]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Pictures" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <img src={images[index]} alt={`Picture ${index + 1} of ${images.length}`} className="max-h-[88vh] max-w-[94vw] rounded-lg object-contain" onClick={event => event.stopPropagation()} />
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X size={20} /></button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Previous picture" onClick={event => { event.stopPropagation(); step(-1); }} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft size={22} /></button>
          <button type="button" aria-label="Next picture" onClick={event => { event.stopPropagation(); step(1); }} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight size={22} /></button>
          <span className="absolute bottom-5 rounded-full bg-black/60 px-3 py-1 text-xs tabular-nums text-white/80">{index + 1} / {images.length}</span>
        </>
      )}
    </div>
  );
};

/** A post's pictures in a tidy grid (1–10). Tap one to open the viewer. */
const ImageGrid = ({ images }: { images: string[] }) => {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  const layout = images.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
  return (
    <>
      <div className={cn('mt-3 grid max-w-xl gap-0.5 overflow-hidden rounded-2xl border border-white/[0.08]', layout)}>
        {shown.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-label={`Open picture ${index + 1} of ${images.length}`}
            onClick={() => setOpen(index)}
            className={cn('relative block overflow-hidden bg-white/[0.03]', images.length === 1 ? 'max-h-[520px]' : 'aspect-square', images.length === 3 && index === 0 && 'row-span-2 !aspect-auto')}
          >
            <img src={src} alt="" loading="lazy" className={cn('w-full object-cover', images.length === 1 ? 'h-auto max-h-[520px]' : 'h-full')} />
            {extra > 0 && index === shown.length - 1 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">+{extra}</span>
            )}
          </button>
        ))}
      </div>
      {open !== null && <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </>
  );
};

export default ImageGrid;
