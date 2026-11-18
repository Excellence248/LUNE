import { useEffect, useState } from 'react';

const read = () => {
  const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
  return viewport ? { height: viewport.height, top: viewport.offsetTop } : { height: typeof window !== 'undefined' ? window.innerHeight : 0, top: 0 };
};

/**
 * The part of the screen you can actually see: it shrinks when a phone keyboard opens. iPhones keep the
 * page the same size and slide the keyboard over it, so a full-screen box sized to the page ends up
 * hidden behind the keyboard; sizing it to this keeps it exactly above the keyboard.
 */
export const useVisualViewport = () => {
  const [box, setBox] = useState(read);
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setBox(read())); };
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return box;
};
