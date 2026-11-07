import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { showSuccess } from '@/utils/toast';

interface Spark { x: number; y: number; vx: number; vy: number; size: number; life: number; hue: number; spin: number; rot: number; }

const star = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? size : size * 0.32;
    const a = (Math.PI / 4) * i;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
};

/** One-time celebration on first arrival at the feed: a burst of stars and a welcome toast. */
const WelcomeBurst = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useWallet();
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handled = useRef(false);
  const welcome = !!(location.state as { welcome?: boolean } | null)?.welcome;

  useEffect(() => {
    if (!welcome || !user || handled.current) return;
    handled.current = true;
    showSuccess(`Welcome to Lune, @${user.username} 🌙`);
    // consume the flag so a refresh doesn't replay it
    navigate(location.pathname, { replace: true, state: null });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setActive(true);
  }, [welcome, user, navigate, location.pathname]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sparks: Spark[] = Array.from({ length: 90 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 300 + Math.random() * 520;
      return { x: w / 2, y: h * 0.32, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 3 + Math.random() * 6, life: 1, hue: 260 + Math.random() * 70, spin: (Math.random() - 0.5) * 8, rot: Math.random() * 6 };
    });

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const s of sparks) {
        s.vy += 520 * dt; s.vx *= 0.99;
        s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.spin * dt; s.life -= dt * 0.42;
        if (s.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        ctx.fillStyle = `hsla(${s.hue},90%,78%,${Math.max(s.life, 0)})`;
        ctx.shadowColor = `hsla(${s.hue},90%,70%,0.9)`; ctx.shadowBlur = 10;
        star(ctx, s.size);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(frame); else setActive(false);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
};

export default WelcomeBurst;
