import { useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import { useWallet } from '@/context/WalletContext';

const KEY = 'lune_ref';
const FORTNIGHT = 14 * 24 * 60 * 60 * 1000;

/** Reads ?ref=username from the address bar on any page and remembers it until the visitor has an account. */
export const rememberReferral = () => {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[A-Za-z0-9_]{3,64}$/.test(ref)) localStorage.setItem(KEY, JSON.stringify({ ref, at: Date.now() }));
  } catch { /* private mode: invites just are not counted */ }
};

/**
 * Once someone who arrived through an invite link is signed in, tell the server who invited them. The
 * server only counts brand-new accounts, so an existing member opening a link changes nothing. Tried once.
 */
export const useReferralClaim = () => {
  const { user } = useWallet();
  useEffect(() => {
    if (!user) return;
    let saved: { ref: string; at: number } | null = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { saved = null; }
    if (!saved?.ref) return;
    const forget = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };
    if (Date.now() - saved.at > FORTNIGHT || saved.ref.toLowerCase() === user.username.toLowerCase()) { forget(); return; }
    api('/api/me/referral', { method: 'POST', body: { ref: saved.ref } })
      .then(forget)
      .catch(error => { if (error instanceof ApiError && error.status !== 0 && error.status !== 503) forget(); });
  }, [user?.id]);
};
