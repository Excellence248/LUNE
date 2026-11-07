import { useEffect, useRef } from 'react';

interface Star { x: number; y: number; z: number; }
interface Shooter { x: number; y: number; vx: number; vy: number; life: number; }

const STAR_COUNT = 420;

/** Full-screen canvas: warp-speed starfield, drifting nebula, occasional shooting stars. */
const SpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, raf = 0, last = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const spawn = (): Star => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() });
    const stars: Star[] = Array.from({ length: STAR_COUNT }, spawn);
    const shooters: Shooter[] = [];
    let mx = 0, my = 0, px = 0, py = 0;

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onMove = (e: PointerEvent) => { mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5; };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;
      px += (mx - px) * 0.04; py += (my - py) * 0.04;

      ctx.fillStyle = '#07040f';
      ctx.fillRect(0, 0, w, h);

      // drifting nebula blobs
      const blobs = [
        { cx: 0.2 + Math.sin(t * 0.07) * 0.08, cy: 0.25 + Math.cos(t * 0.05) * 0.08, r: 0.55, c: '124,58,237' },
        { cx: 0.8 + Math.cos(t * 0.06) * 0.08, cy: 0.75 + Math.sin(t * 0.08) * 0.08, r: 0.6, c: '56,80,230' },
        { cx: 0.6 + Math.sin(t * 0.04) * 0.1, cy: 0.1 + Math.cos(t * 0.07) * 0.05, r: 0.4, c: '217,70,239' },
      ];
      for (const b of blobs) {
        const R = b.r * Math.max(w, h);
        const g = ctx.createRadialGradient(b.cx * w - px * 40, b.cy * h - py * 40, 0, b.cx * w - px * 40, b.cy * h - py * 40, R);
        g.addColorStop(0, `rgba(${b.c},0.22)`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // stars flying toward the viewer
      const speed = reduceMotion ? 0 : 0.12;
      const cx = w / 2 - px * 60, cy = h / 2 - py * 60, scale = Math.max(w, h) * 0.6;
      for (const s of stars) {
        const pz = s.z;
        s.z -= speed * dt;
        if (s.z <= 0.02) { Object.assign(s, spawn(), { z: 1 }); continue; }
        const x = cx + (s.x / s.z) * scale * 0.25, y = cy + (s.y / s.z) * scale * 0.25;
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) { Object.assign(s, spawn(), { z: 1 }); continue; }
        const ox = cx + (s.x / pz) * scale * 0.25, oy = cy + (s.y / pz) * scale * 0.25;
        const depth = 1 - s.z;
        ctx.strokeStyle = `rgba(${230 - depth * 40},${220 - depth * 50},255,${0.15 + depth * 0.85})`;
        ctx.lineWidth = 0.5 + depth * 1.8;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, y); ctx.stroke();
        if (reduceMotion) { ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(x, y, ctx.lineWidth, ctx.lineWidth); }
      }

      // shooting stars
      if (!reduceMotion && Math.random() < dt * 0.35) {
        shooters.push({ x: Math.random() * w, y: Math.random() * h * 0.5, vx: 500 + Math.random() * 300, vy: 250 + Math.random() * 150, life: 1 });
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.1;
        if (s.life <= 0) { shooters.splice(i, 1); continue; }
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
        g.addColorStop(0, `rgba(255,255,255,${s.life})`);
        g.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove); };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0 h-full w-full" />;
};

export default SpaceBackground;
