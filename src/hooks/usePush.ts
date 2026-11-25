import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWallet } from '@/context/WalletContext';

export type PushState = 'unsupported' | 'unavailable' | 'blocked' | 'off' | 'on';

const toKey = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
};

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Registers the service worker that shows notifications while the app is closed. */
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
};

/** Notifications for this device: whether they work here, whether they are on, and how to switch them. */
export const usePush = () => {
  const { user } = useWallet();
  const userId = user?.id;
  const [state, setState] = useState<PushState>(supported() ? 'off' : 'unsupported');
  const [busy, setBusy] = useState(false);

  const current = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    return { registration, subscription: await registration.pushManager.getSubscription() };
  }, []);

  // Work out the state, and tie a device that is already subscribed to whoever is signed in now.
  useEffect(() => {
    if (!supported()) return;
    let active = true;
    (async () => {
      const info = await api<{ enabled: boolean }>('/api/push/key').catch(() => null);
      if (!active) return;
      if (!info?.enabled) { setState('unavailable'); return; }
      if (Notification.permission === 'denied') { setState('blocked'); return; }
      const { subscription } = await current().catch(() => ({ subscription: null }));
      if (!active) return;
      if (subscription && Notification.permission === 'granted') {
        setState('on');
        if (userId) void api('/api/push/subscribe', { method: 'POST', body: subscription.toJSON() }).catch(() => undefined);
      } else setState('off');
    })();
    return () => { active = false; };
  }, [userId, current]);

  const enable = useCallback(async () => {
    if (!supported() || busy) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState(permission === 'denied' ? 'blocked' : 'off'); return false; }
      const { key } = await api<{ key: string }>('/api/push/key');
      const { registration, subscription } = await current();
      const created = subscription ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
      await api('/api/push/subscribe', { method: 'POST', body: created.toJSON() });
      setState('on');
      return true;
    } catch {
      setState('off');
      return false;
    } finally { setBusy(false); }
  }, [busy, current]);

  const disable = useCallback(async () => {
    if (!supported() || busy) return;
    setBusy(true);
    try {
      const { subscription } = await current();
      if (subscription) {
        await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setState('off');
    } finally { setBusy(false); }
  }, [busy, current]);

  return { state, busy, enable, disable };
};
