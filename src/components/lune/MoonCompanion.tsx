import { useState } from 'react';
import LuneMoon from './LuneMoon';
import { useWallet } from '@/context/WalletContext';

const QUIPS = [
  'Boop! Hi there.',
  'I see you.',
  'Still orbiting.',
  'Craters are just dimples.',
  'Stay curious.',
  'Hehe, that tickles.',
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

/** Sidebar companion: the moon watches your cursor and reacts when booped. */
const MoonCompanion = () => {
  const { user } = useWallet();
  const [quip, setQuip] = useState<string | null>(null);
  const name = user && !user.username.startsWith('user_') && user.username !== user.walletAddress ? user.username : null;

  return (
    <div className="lune-spot lune-tilt mx-3 mb-3 flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-lune-500/[0.12] via-white/[0.02] to-transparent p-3" data-tilt="10">
      <LuneMoon
        className="h-14 w-14"
        boop
        label="Lune, the moon. Click to say hi."
        onBoop={() => setQuip(QUIPS[Math.floor(Math.random() * QUIPS.length)])}
      />
      <div className="min-w-0" aria-live="polite">
        <p className="truncate font-display text-sm font-semibold text-white">
          {quip ?? `${greeting()}${name ? `, ${name}` : ''}`}
        </p>
        <p className="mt-0.5 text-[11px] text-white/40">{quip ? 'Lune is happy' : 'Lune is watching'}</p>
      </div>
    </div>
  );
};

export default MoonCompanion;
