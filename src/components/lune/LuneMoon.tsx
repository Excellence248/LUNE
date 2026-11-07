import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion, requestPointerFrame, subscribePointer } from '@/lib/pointer';

/*
 * The Lune mascot as a live 3D character.
 *
 * The artwork (/lune-mascot.jpg, 640×640) has the moon centred at (318, 323)
 * with a radius of ~172px. Its painted eyes are covered by vector eyes drawn
 * in the same coordinate space, so the pupils/glints can follow the cursor,
 * blink, and squint happily when the moon is booped.
 */

const MOON = { left: 146, top: 152, size: 344 };
const pct = (n: number) => `${(n / MOON.size) * 100}%`;
const FACE_STYLE = {
  left: pct(-MOON.left),
  top: pct(-MOON.top),
  width: pct(640),
  height: pct(640),
} as const;

const EYES = [
  { cx: 295, cy: 319 },
  { cx: 360, cy: 323.5 },
];
const SOCKET = { rx: 18, ry: 35 };
const LOOK = { x: 6.5, y: 11 };

export interface LuneMoonProps {
  className?: string;
  /** Soft violet halo behind the moon. */
  glow?: boolean;
  /** Tilt degrees toward the cursor (0 disables the 3D tilt). */
  tilt?: number;
  /** Squish + happy eyes when clicked. */
  boop?: boolean;
  /** Gentle floating motion. */
  float?: boolean;
  /** Accessible label; decorative when omitted. */
  label?: string;
  onBoop?: () => void;
}

const LuneMoon = ({ className, glow = true, tilt = 12, boop = false, float = false, label, onBoop }: LuneMoonProps) => {
  const uid = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLSpanElement>(null);
  const tiltRef = useRef<HTMLSpanElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const pupilRefs = useRef<(SVGGElement | null)[]>([]);
  const [blinking, setBlinking] = useState(false);
  const [happy, setHappy] = useState(false);

  // Cursor tracking: eased look direction written straight to the DOM.
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const cur = { x: 0, y: 0 };
    const glance = { x: 0, y: 0 };
    let glanceTimer = 0;

    const scheduleGlance = () => {
      glanceTimer = window.setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() < 0.35 ? 0 : 0.35 + Math.random() * 0.5;
        glance.x = Math.cos(angle) * r;
        glance.y = Math.sin(angle) * r * 0.7;
        requestPointerFrame();
        scheduleGlance();
      }, 1800 + Math.random() * 2600);
    };
    if (!reduced) scheduleGlance();

    const unsubscribe = subscribePointer((pointer, now) => {
      const root = rootRef.current;
      if (!root) return false;
      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return false;

      let tx = glance.x;
      let ty = glance.y;
      const idle = !pointer.active || now - pointer.lastMove > 7000;
      if (!idle) {
        const dx = pointer.x - (rect.left + rect.width / 2);
        const dy = pointer.y - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.max(rect.width * 2.2, 220);
        const k = Math.min(1, dist / reach);
        tx = (dx / dist) * k;
        ty = (dy / dist) * k;
      }

      const ease = reduced ? 1 : 0.16;
      cur.x += (tx - cur.x) * ease;
      cur.y += (ty - cur.y) * ease;

      const px = cur.x * LOOK.x;
      const py = cur.y * LOOK.y;
      pupilRefs.current.forEach(g => g?.setAttribute('transform', `translate(${px.toFixed(2)} ${py.toFixed(2)})`));

      if (!reduced) {
        const shift = rect.width * 0.03;
        if (faceRef.current) {
          faceRef.current.style.transform = `translate3d(${(cur.x * shift).toFixed(2)}px, ${(cur.y * shift).toFixed(2)}px, 0) scale(1.07)`;
        }
        if (tiltRef.current && tilt) {
          tiltRef.current.style.transform = `perspective(600px) rotateX(${(-cur.y * tilt).toFixed(2)}deg) rotateY(${(cur.x * tilt).toFixed(2)}deg)`;
        }
        root.style.setProperty('--lx', `${(50 + cur.x * 30).toFixed(1)}%`);
        root.style.setProperty('--ly', `${(45 + cur.y * 30).toFixed(1)}%`);
      }

      return Math.abs(tx - cur.x) > 0.002 || Math.abs(ty - cur.y) > 0.002;
    });

    return () => {
      unsubscribe();
      window.clearTimeout(glanceTimer);
    };
  }, [tilt]);

  // Natural, irregular blinking (sometimes a double blink).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer = 0;
    const blink = (again: boolean) => {
      setBlinking(true);
      timer = window.setTimeout(() => {
        setBlinking(false);
        timer = window.setTimeout(
          () => blink(!again && Math.random() < 0.2),
          again ? 180 : 2400 + Math.random() * 4200,
        );
      }, 130);
    };
    timer = window.setTimeout(() => blink(false), 1200 + Math.random() * 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!happy) return;
    const t = window.setTimeout(() => setHappy(false), 1100);
    return () => window.clearTimeout(t);
  }, [happy]);

  const handleBoop = () => {
    if (!boop) return;
    setHappy(true);
    onBoop?.();
  };

  return (
    <span
      ref={rootRef}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      onClick={boop ? handleBoop : undefined}
      className={cn(
        'lune-moon relative inline-block shrink-0 select-none',
        boop && 'cursor-pointer',
        blinking && 'is-blinking',
        happy && 'is-happy',
        className,
      )}
    >
      <span className={cn('lune-moon-bob absolute inset-0', float && 'animate-float')}>
        {glow && <span aria-hidden className="lune-moon-halo" />}
        <span ref={tiltRef} className="lune-moon-tilt absolute inset-0">
          <span className="lune-moon-sphere absolute inset-0 overflow-hidden rounded-full">
            <span ref={faceRef} className="lune-moon-face absolute" style={FACE_STYLE}>
              <img src="/lune-mascot.jpg" alt="" draggable={false} className="absolute inset-0 h-full w-full" />
              <svg viewBox="0 0 640 640" className="absolute inset-0 h-full w-full overflow-visible">
                <defs>
                  <radialGradient id={`${uid}-socket`} cx="50%" cy="92%" r="78%">
                    <stop offset="0" stopColor="#b77dff" />
                    <stop offset="0.28" stopColor="#6d28d9" />
                    <stop offset="0.6" stopColor="#1a0638" />
                    <stop offset="1" stopColor="#06010d" />
                  </radialGradient>
                  <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#c47ae6" />
                    <stop offset="1" stopColor="#9d55ca" />
                  </linearGradient>
                  <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3.2" />
                  </filter>
                  <filter id={`${uid}-iris`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4.5" />
                  </filter>
                  {EYES.map((e, i) => (
                    <clipPath key={i} id={`${uid}-clip-${i}`}>
                      <ellipse cx={e.cx} cy={e.cy} rx={SOCKET.rx} ry={SOCKET.ry} />
                    </clipPath>
                  ))}
                </defs>

                {EYES.map((e, i) => (
                  <g key={i}>
                    {/* Skin patch hides the painted eye while blinking / squinting. */}
                    <ellipse cx={e.cx} cy={e.cy} rx={SOCKET.rx + 4} ry={SOCKET.ry + 4} fill={`url(#${uid}-skin)`} filter={`url(#${uid}-soft)`} />
                    <g className="lune-eye">
                      <ellipse cx={e.cx} cy={e.cy} rx={SOCKET.rx + 2.5} ry={SOCKET.ry + 2.5} fill="#3a1166" opacity="0.55" filter={`url(#${uid}-soft)`} />
                      <ellipse cx={e.cx} cy={e.cy} rx={SOCKET.rx} ry={SOCKET.ry} fill={`url(#${uid}-socket)`} stroke="#22073f" strokeWidth="1.5" />
                      <g clipPath={`url(#${uid}-clip-${i})`}>
                        <g ref={el => (pupilRefs.current[i] = el)}>
                          <ellipse cx={e.cx} cy={e.cy + 22} rx="15" ry="12" fill="#a855f7" opacity="0.65" filter={`url(#${uid}-iris)`} />
                          <ellipse className="lune-glint" cx={e.cx + 4} cy={e.cy - 13} rx="7.6" ry="13.5" fill="#fff" />
                          <circle cx={e.cx - 8} cy={e.cy + 24} r="2.3" fill="#f3e8ff" opacity="0.9" />
                        </g>
                      </g>
                    </g>
                    {/* Happy "^" eye shown on boop. */}
                    <path
                      className="lune-happy-eye"
                      d={`M ${e.cx - 15} ${e.cy + 6} Q ${e.cx} ${e.cy - 22} ${e.cx + 15} ${e.cy + 6}`}
                      fill="none"
                      stroke="#14032a"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                  </g>
                ))}
              </svg>
            </span>
            <span aria-hidden className="lune-moon-light absolute inset-0 rounded-full" />
          </span>
        </span>
      </span>
    </span>
  );
};

export default LuneMoon;
