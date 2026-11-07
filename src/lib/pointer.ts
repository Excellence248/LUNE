/**
 * One shared pointer tracker for every interactive effect in the app.
 * A single window listener + a single requestAnimationFrame loop drive all
 * subscribers (mascot eyes, parallax, spotlights), so adding more moons to a
 * page costs almost nothing.
 */

export interface PointerState {
  /** Viewport coordinates of the last known pointer position. */
  x: number;
  y: number;
  /** -1 … 1 relative to the viewport centre. */
  nx: number;
  ny: number;
  /** True once the user has moved a pointer at least once. */
  active: boolean;
  /** performance.now() of the last movement. */
  lastMove: number;
}

/** Return true to keep receiving frames (e.g. while still easing). */
type FrameCallback = (pointer: PointerState, now: number) => boolean | void;

const state: PointerState = { x: 0, y: 0, nx: 0, ny: 0, active: false, lastMove: 0 };
const subscribers = new Set<FrameCallback>();
let frame = 0;
let listening = false;

const tick = (now: number) => {
  frame = 0;
  let keepGoing = false;
  subscribers.forEach(cb => {
    if (cb(state, now)) keepGoing = true;
  });
  if (keepGoing) schedule();
};

const schedule = () => {
  if (!frame && typeof window !== 'undefined') frame = requestAnimationFrame(tick);
};

const onMove = (event: PointerEvent) => {
  state.x = event.clientX;
  state.y = event.clientY;
  state.nx = (event.clientX / window.innerWidth) * 2 - 1;
  state.ny = (event.clientY / window.innerHeight) * 2 - 1;
  state.active = true;
  state.lastMove = performance.now();
  const root = document.documentElement.style;
  root.setProperty('--cursor-x', `${event.clientX}px`);
  root.setProperty('--cursor-y', `${event.clientY}px`);
  root.setProperty('--cursor-nx', state.nx.toFixed(4));
  root.setProperty('--cursor-ny', state.ny.toFixed(4));
  schedule();
};

const ensureListening = () => {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
};

export const subscribePointer = (cb: FrameCallback) => {
  ensureListening();
  subscribers.add(cb);
  schedule();
  return () => {
    subscribers.delete(cb);
  };
};

/** Wake the loop (e.g. after a blink or idle timer). */
export const requestPointerFrame = schedule;

export const getPointer = () => state;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
