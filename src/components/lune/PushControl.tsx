import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePush } from '@/hooks/usePush';
import { useWallet } from '@/context/WalletContext';
import { showError, showSuccess } from '@/utils/toast';

const DISMISSED = 'lune_push_banner_dismissed';
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const installed = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** The on/off switch for notifications on this device, with the reason when it can't be turned on. */
export const PushSetting = () => {
  const { user } = useWallet();
  const { state, busy, enable, disable } = usePush();
  const toggle = async () => {
    if (state === 'on') { await disable(); showSuccess('Notifications are off on this device.'); return; }
    if (await enable()) showSuccess('You’ll be notified here, even when Lune is closed.');
    else showError('Notifications could not be turned on. Check your browser’s permission for this site.');
  };
  const note = {
    unsupported: isIos() && !installed() ? 'On iPhone and iPad, add Lune to your Home Screen first (Share, then Add to Home Screen), then open it from there to turn this on.' : 'This browser can’t show notifications.',
    unavailable: 'Notifications are not set up on the server yet.',
    blocked: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.',
    off: 'Get a notification for new messages, calls, replies, likes and followers, even when Lune is closed.',
    on: 'On for this device. You’ll be notified about messages, calls, replies, likes and followers.',
  }[state];
  return (
    <div className="flex items-start gap-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lune-500/15 text-lune-300">{state === 'on' ? <Bell size={18} /> : <BellOff size={18} />}</span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-white">Notifications on this device</p>
        <p className="mt-0.5 text-sm text-white/50">{note}</p>
        {!user && <p className="mt-1 text-xs text-white/35">Log in to turn them on.</p>}
      </div>
      {user && (state === 'on' || state === 'off') && (
        <button onClick={() => void toggle()} disabled={busy} className={state === 'on' ? 'h-9 shrink-0 rounded-full border border-white/15 px-4 text-sm text-white/70 hover:text-white' : 'lune-btn h-9 shrink-0 px-5 text-sm'}>{busy ? '…' : state === 'on' ? 'Turn off' : 'Turn on'}</button>
      )}
    </div>
  );
};

/** A one-time nudge for signed-in members who haven't decided yet. */
export const PushBanner = () => {
  const { user } = useWallet();
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(DISMISSED) === '1'; } catch { return false; } });
  if (!user || hidden || state !== 'off') return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(DISMISSED, '1'); } catch { /* private mode */ } };
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-lune-400/25 bg-lune-500/10 px-4 py-3">
      <Bell size={18} className="shrink-0 text-lune-300" />
      <p className="min-w-0 flex-1 text-sm text-white/80">Get notified about messages and calls, even when Lune is closed.</p>
      <button disabled={busy} onClick={() => void enable().then(ok => { if (ok) showSuccess('Notifications are on.'); })} className="lune-btn h-8 shrink-0 px-4 text-xs">Turn on</button>
      <button onClick={dismiss} aria-label="Not now" className="shrink-0 text-white/40 hover:text-white"><X size={16} /></button>
    </div>
  );
};
