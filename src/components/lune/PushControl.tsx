import { useEffect, useState } from 'react';
import { Bell, BellOff, X, Volume2, VolumeX } from 'lucide-react';
import { usePush } from '@/hooks/usePush';
import { useWallet } from '@/context/WalletContext';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { showError, showSuccess } from '@/utils/toast';

const DISMISSED = 'lune_push_banner_dismissed';
const SOUND_KEY = 'lune_notification_sound';
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const installed = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const KINDS = [
  ['messages', 'Messages', 'New messages, voice notes, pictures and reactions'],
  ['calls', 'Calls', 'Someone is calling you'],
  ['replies', 'Replies', 'Replies to your posts'],
  ['likes', 'Likes and reposts', 'Someone likes or reposts your post'],
  ['follows', 'New followers', 'Someone starts following you'],
  ['mentions', 'Mentions', 'Someone mentions you with @'],
] as const;
type Kind = (typeof KINDS)[number][0];

/** Which kinds of notification you want. These follow your account, so they apply on every device. */
const PushKinds = () => {
  const [prefs, setPrefs] = useState<Record<Kind, boolean> | null>(null);
  const [available, setAvailable] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) !== 'false');
  useEffect(() => {
    let active = true;
    api<Record<Kind, boolean> & { available: boolean }>('/api/push/prefs').then(data => { if (active) { setPrefs(data); setAvailable(data.available); } }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!prefs || !available) return null;
  const change = async (kind: Kind, value: boolean) => {
    setPrefs(previous => (previous ? { ...previous, [kind]: value } : previous));
    try { await api('/api/push/prefs', { method: 'POST', body: { [kind]: value } }); }
    catch (cause) {
      setPrefs(previous => (previous ? { ...previous, [kind]: !value } : previous));
      showError(cause instanceof Error ? cause.message : 'That setting could not be saved.');
    }
  };
  const toggleSound = (value: boolean) => {
    setSoundEnabled(value);
    localStorage.setItem(SOUND_KEY, value ? 'true' : 'false');
  };
  return (
    <div className="mt-5 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      {KINDS.map(([kind, label, hint]) => (
        <div key={kind} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{label}</p><p className="text-xs text-white/45">{hint}</p></div>
          <Switch checked={prefs[kind]} onCheckedChange={value => void change(kind, value)} aria-label={label} />
        </div>
      ))}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">Notification sound</p><p className="text-xs text-white/45">Play a sound when new notifications arrive while Lune is open</p></div>
        <Switch checked={soundEnabled} onCheckedChange={value => void toggleSound(value)} aria-label="Notification sound" />
      </div>
    </div>
  );
};

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
    <div>
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
    {user && state !== 'unsupported' && state !== 'unavailable' && <PushKinds />}
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
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-lune-400/25 bg-lune-500/10 px-4 py-3 md:mx-10 xl:mx-auto xl:w-full xl:max-w-3xl">
      <Bell size={18} className="shrink-0 text-lune-300" />
      <p className="min-w-0 flex-1 text-sm text-white/80">Get notified about messages and calls, even when Lune is closed.</p>
      <button disabled={busy} onClick={() => void enable().then(ok => { if (ok) showSuccess('Notifications are on.'); })} className="lune-btn h-8 shrink-0 px-4 text-xs">Turn on</button>
      <button onClick={dismiss} aria-label="Not now" className="shrink-0 text-white/40 hover:text-white"><X size={16} /></button>
    </div>
  );
};
