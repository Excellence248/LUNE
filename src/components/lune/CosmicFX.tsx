import { useEffect, useMemo } from 'react';
import { subscribePointer } from '@/lib/pointer';

/**
 * App-wide ambience mounted once in AppWrapper:
 *  - a deep-space backdrop with three parallax star layers that drift with the cursor
 *  - a soft cursor aura (fine pointers only)
 *  - spotlight borders on `.lune-card` / `.lune-spot` and 3D tilt on `.lune-tilt`
 */

// Deterministic PRNG so the star field is stable between renders.
const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const starShadows = (count: number, seed: number, palette: string[]) => {
  const rand = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * 2000);
    const y = Math.round(rand() * 2000);
    out.push(`${x}px ${y}px ${palette[Math.floor(rand() * palette.length)]}`);
  }
  return out.join(',');
};

const CosmicFX = () => {
  const layers = useMemo(
    () => [
      { size: 1, depth: 6, shadows: starShadows(220, 7, ['rgba(255,255,255,.35)', 'rgba(216,190,255,.3)']) },
      { size: 1.5, depth: 14, shadows: starShadows(90, 42, ['rgba(255,255,255,.55)', 'rgba(196,160,255,.6)']) },
      { size: 2, depth: 26, shadows: starShadows(32, 1337, ['rgba(237,227,255,.85)', 'rgba(169,116,255,.9)']) },
    ],
    [],
  );

  // Spotlight + tilt, delegated so every card on every page gets it for free.
  useEffect(() => {
    let tilted: HTMLElement | null = null;

    const resetTilt = () => {
      if (!tilted) return;
      tilted.style.removeProperty('--rx');
      tilted.style.removeProperty('--ry');
      tilted.classList.remove('is-tilting');
      tilted = null;
    };

    const unsubscribe = subscribePointer(pointer => {
      if (!pointer.active) return false;
      const target = document.elementFromPoint(pointer.x, pointer.y) as HTMLElement | null;

      const spot = target?.closest<HTMLElement>('.lune-card, .lune-spot');
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', `${pointer.x - r.left}px`);
        spot.style.setProperty('--my', `${pointer.y - r.top}px`);
      }

      const tiltEl = target?.closest<HTMLElement>('.lune-tilt') ?? null;
      if (tiltEl !== tilted) resetTilt();
      if (tiltEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const r = tiltEl.getBoundingClientRect();
        const strength = Number(tiltEl.dataset.tilt || 6);
        const nx = (pointer.x - r.left) / r.width - 0.5;
        const ny = (pointer.y - r.top) / r.height - 0.5;
        tiltEl.style.setProperty('--rx', `${(-ny * strength).toFixed(2)}deg`);
        tiltEl.style.setProperty('--ry', `${(nx * strength).toFixed(2)}deg`);
        tiltEl.classList.add('is-tilting');
        tilted = tiltEl;
      }
      return false;
    });

    const onLeave = () => resetTilt();
    document.addEventListener('pointerleave', onLeave);
    return () => {
      unsubscribe();
      document.removeEventListener('pointerleave', onLeave);
      resetTilt();
    };
  }, []);

  return (
    <>
      <div aria-hidden className="lune-space">
        <div className="lune-nebula" />
        {layers.map((l, i) => (
          <div key={i} className="lune-starlayer" style={{ ['--depth' as string]: `${l.depth}px` }}>
            <span
              className="lune-starfield"
              style={{ width: l.size, height: l.size, boxShadow: l.shadows, animationDelay: `${i * -3}s` }}
            />
          </div>
        ))}
        <span className="lune-shooting-star" />
        <span className="lune-shooting-star lune-shooting-star--late" />
        <div className="lune-grain" />
      </div>
      <div aria-hidden className="lune-cursor-aura" />
    </>
  );
};

export default CosmicFX;
