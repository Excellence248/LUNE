import { useId } from 'react';
import { useBadge } from '@/context/BadgesContext';
import type { BadgeTier } from '@/lib/badges';
import { cn } from '@/lib/utils';

const STYLE: Record<BadgeTier, { from: string; to: string; check: string; label: string }> = {
  blue: { from: '#4cb8ff', to: '#1d7bf0', check: '#ffffff', label: 'Verified account' },
  gold: { from: '#ffe27a', to: '#e0a100', check: '#5a3b00', label: 'Verified gold account' },
};

// 12-lobed scalloped seal on a 24x24 grid
const SEAL = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const r = 10 + 1.5 * Math.cos(a * 8);
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

export const BadgeSeal = ({ tier, className }: { tier: BadgeTier; className?: string }) => {
  const id = useId();
  const s = STYLE[tier];
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={s.label} className={cn('inline-block h-[1.1em] w-[1.1em] shrink-0 align-[-0.15em]', className)}>
      <title>{s.label}</title>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={s.from} /><stop offset="1" stopColor={s.to} /></linearGradient></defs>
      <path d={SEAL} fill={`url(#${id})`} />
      <path d="m7.700 12.300 3 3 5.600-6" fill="none" stroke={s.check} strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** Renders nothing unless the given username is verified. */
const VerifiedBadge = ({ username, className }: { username?: string | null; className?: string }) => {
  const tier = useBadge(username);
  return tier ? <BadgeSeal tier={tier} className={className} /> : null;
};

export default VerifiedBadge;
