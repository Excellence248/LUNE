import { useEffect, useState } from 'react';
import LuneMoon from './LuneMoon';

const SEEN = 'lune_splash_seen';

/** Show it once per visit (per browser tab session), never in the admin panel, and not for reduced motion. */
const shouldShow = () => {
  try {
    if (window.location.pathname.startsWith('/admin')) return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (sessionStorage.getItem(SEEN)) return false;
    sessionStorage.setItem(SEEN, '1');
    return true;
  } catch {
    return false;
  }
};

/**
 * When Lune opens, the moon pops in, winks at you, and the screen fades away to the app (about two
 * seconds). Tap anywhere to skip it.
 */
const OpeningSplash = () => {
  const [show, setShow] = useState(shouldShow);
  const [wink, setWink] = useState(false);

  useEffect(() => {
    if (!show) return;
    const timers = [
      window.setTimeout(() => setWink(true), 750),
      window.setTimeout(() => setWink(false), 1350),
      window.setTimeout(() => setShow(false), 2250),
    ];
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [show]);

  if (!show) return null;
  return (
    <div
      role="presentation"
      aria-hidden
      onClick={() => setShow(false)}
      className="lune-splash fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#05030f]"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 42%, rgba(124, 58, 237, 0.28), transparent 55%)' }}
    >
      <div className="lune-splash-moon">
        <LuneMoon className="h-36 w-36 sm:h-44 sm:w-44" tilt={0} wink={wink} />
      </div>
      <p className="lune-splash-word mt-6 font-display text-2xl font-bold uppercase text-white/90">lune</p>
    </div>
  );
};

export default OpeningSplash;
