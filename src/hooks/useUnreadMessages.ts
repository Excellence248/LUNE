import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWallet } from '@/context/WalletContext';

/** Fired by the Messages page after it reads or sends, so the sidebar badge updates straight away. */
export const MESSAGES_CHANGED = 'lune:messages-changed';
export const announceMessagesChanged = () => window.dispatchEvent(new Event(MESSAGES_CHANGED));

/** Unread direct-message count for the signed-in member. Polls quietly; shows 0 if it can't load. */
export const useUnreadMessages = () => {
  const { user } = useWallet();
  const userId = user?.id;
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) { setUnread(0); return; }
    const data = await api<{ unread: number }>('/api/messages').catch(() => null);
    if (data) setUnread(data.unread);
  }, [userId]);

  useEffect(() => {
    void refresh();
    if (!userId) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    window.addEventListener(MESSAGES_CHANGED, refresh);
    return () => { clearInterval(timer); window.removeEventListener(MESSAGES_CHANGED, refresh); };
  }, [userId, refresh]);

  return unread;
};
