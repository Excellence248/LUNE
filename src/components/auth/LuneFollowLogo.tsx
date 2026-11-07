import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Interactive Lune moon, in the spirit of MetaMask's head-tracking fox:
 * the whole moon tilts in 3D toward the pointer, the craters and face slide
 * at different depths (parallax), the pupils look at the cursor, and the
 * light shifts across the surface. Idle, it drifts gently and blinks.
 */

const CRATERS = [
  // cx, cy, rx, ry, depth (parallax strength)
  { cx: 62, cy: 62, rx: 17, ry: 20, d: 0.7 },
  { cx: 128, cy: 52, rx: 20, ry: 14, d: 0.9 },
  { cx: 52, cy: 112, rx: 11, ry: 14, d: 1.1 },
  { cx: 78, cy: 142, rx: 22, ry: 15, d: 0.8 },
  { cx: 152, cy: 96, rx: 11, ry: 17, d: 1.2 },
  { cx: 140, cy: 140, rx: 9, ry: 8, d: 1.0 },
  { cx: 100, cy: 36, rx: 6, ry: 5, d: 0.6 },
  { cx: 112, cy: 162, rx: 6, ry: 5, d: 0.9 },
  { cx: 166, cy: 128, rx: 5, ry: 5, d: 1.3 },
  { cx: 38, cy: 84, rx: 5, ry: 5, d: 0.7 },
];

const LuneFollowLogo = ({ className }: { className?: string }) => {
  const uid = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let tx = 0, ty = 0;       // target, -1..1
    let x = 0, y = 0;         // eased current value
    let raf = 0;
    let lastMove = 0;
    const start = performance.now();

    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const range = Math.max(window.innerWidth, window.innerHeight) * 0.45;
      tx = Math.max(-1, Math.min(1, (e.clientX - cx) / range));
      ty = Math.max(-1, Math.min(1, (e.clientY - cy) / range));
      lastMove = performance.now();
    };

    const frame = (now: number) => {
      // when the pointer has been idle, let the moon wander slowly
      if (now - lastMove > 3500) {
        const t = (now - start) / 1000;
        tx = Math.sin(t * 0.6) * 0.45;
        ty = Math.cos(t * 0.45) * 0.3;
      }
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      root.style.setProperty('--px', x.toFixed(4));
      root.style.setProperty('--py', y.toFixed(4));
      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
    } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      raf = requestAnimationFrame(frame);
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn('lune-follow relative aspect-square select-none', className)}
      style={{ ['--px' as string]: 0, ['--py' as string]: 0, perspective: '900px' }}
    >
      {/* ambient glow, drifts opposite the tilt */}
      <div
        className="absolute -inset-[12%] rounded-full bg-lune-500/40 blur-3xl animate-glow-pulse"
        style={{ transform: 'translate(calc(var(--px) * -6%), calc(var(--py) * -6%))' }}
      />

      <div
        className="relative h-full w-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateY(calc(var(--px) * 24deg)) rotateX(calc(var(--py) * -24deg))',
          willChange: 'transform',
        }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id={`${uid}-body`} cx="38%" cy="32%" r="80%">
              <stop offset="0" stopColor="#c9a2f5" />
              <stop offset="0.5" stopColor="#9a5fd8" />
              <stop offset="1" stopColor="#4a1f86" />
            </radialGradient>
            <radialGradient id={`${uid}-crater`} cx="50%" cy="60%" r="60%">
              <stop offset="0" stopColor="#1c0a38" />
              <stop offset="1" stopColor="#3a1670" />
            </radialGradient>
            <radialGradient id={`${uid}-rim`} cx="50%" cy="50%" r="50%">
              <stop offset="0.82" stopColor="#c9a2f5" stopOpacity="0" />
              <stop offset="1" stopColor="#e7d3ff" stopOpacity="0.9" />
            </radialGradient>
            <radialGradient id={`${uid}-shade`} cx="50%" cy="50%" r="50%">
              <stop offset="0.55" stopColor="#12062a" stopOpacity="0" />
              <stop offset="1" stopColor="#12062a" stopOpacity="0.65" />
            </radialGradient>
            <clipPath id={`${uid}-clip`}><circle cx="100" cy="100" r="82" /></clipPath>
          </defs>

          {/* base sphere */}
          <circle cx="100" cy="100" r="82" fill={`url(#${uid}-body)`} />

          <g clipPath={`url(#${uid}-clip)`}>
            {/* craters slide at their own depth */}
            {CRATERS.map((c, i) => (
              <g
                key={i}
                style={{ transform: `translate(calc(var(--px) * ${(c.d * 9).toFixed(1)}px), calc(var(--py) * ${(c.d * 9).toFixed(1)}px))` }}
              >
                <ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill="#b98af0" fillOpacity="0.35" stroke="#e2caff" strokeOpacity="0.55" strokeWidth="2.2" />
                <ellipse cx={c.cx} cy={c.cy + c.ry * 0.12} rx={c.rx * 0.82} ry={c.ry * 0.8} fill={`url(#${uid}-crater)`} />
              </g>
            ))}

            {/* moving highlight: light follows the cursor */}
            <ellipse
              cx="78" cy="68" rx="40" ry="30" fill="#fff" fillOpacity="0.16"
              style={{ transform: 'translate(calc(var(--px) * 26px), calc(var(--py) * 22px)) rotate(-25deg)', transformOrigin: '78px 68px', filter: 'blur(8px)' }}
            />
            <circle cx="100" cy="100" r="82" fill={`url(#${uid}-shade)`} />
          </g>

          {/* glowing rim */}
          <circle cx="100" cy="100" r="82" fill={`url(#${uid}-rim)`} />
          <circle cx="100" cy="100" r="82" fill="none" stroke="#d8b8ff" strokeOpacity="0.7" strokeWidth="2" />

          {/* face: travels furthest, so the moon appears to turn its head */}
          <g style={{ transform: 'translate(calc(var(--px) * 22px), calc(var(--py) * 16px))' }}>
            <g className="lune-blink" style={{ transformOrigin: '100px 102px', transformBox: 'view-box' }}>
              {[84, 116].map(ex => (
                <g key={ex}>
                  <ellipse cx={ex} cy="102" rx="8" ry="12" fill="#0b0414" />
                  <ellipse cx={ex} cy="102" rx="8" ry="12" fill="none" stroke="#6d35c4" strokeWidth="1.2" />
                  {/* pupil glint tracks the pointer inside the eye */}
                  <g style={{ transform: 'translate(calc(var(--px) * 2.6px), calc(var(--py) * 4px))' }}>
                    <ellipse cx={ex - 1} cy="97" rx="3.2" ry="4.6" fill="#fff" />
                    <circle cx={ex + 2} cy="107" r="1.6" fill="#fff" fillOpacity="0.75" />
                  </g>
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default LuneFollowLogo;
