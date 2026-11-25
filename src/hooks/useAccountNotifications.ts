import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Notification } from '@/context/SocialContext';

const SOUND_ENABLED_KEY = 'lune_notification_sound';

const playNotificationSound = () => {
  try {
    const enabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
    if (!enabled) return;
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio not supported or blocked
  }
};

export const useAccountNotifications = (userId: string | undefined) => {
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const requestNumber = useRef(0);
  const visibleCount = useRef(50);
  const loadedCount = useRef(50);
  const loadingMoreRef = useRef(false);
  const markingUsers = useRef(new Set<string>());
  const previousIds = useRef<Set<string>>(new Set());
  const [ownerId, setOwnerId] = useState<string>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingOwner, setMarkingOwner] = useState<string | null>(null);

  const refresh = useCallback(async () => {
      if (!userId || currentUser.current !== userId) return;
      const request = ++requestNumber.current;
      const limit = visibleCount.current;
      setLoading(true);
      try {
        const data = await api<{ items: Notification[]; hasMore: boolean; unread: number }>(`/api/notifications?limit=${limit}`);
        if (currentUser.current !== userId || request !== requestNumber.current) return;
        loadedCount.current = limit;
        const newIds = new Set(data.items.map(n => n.id));
        const hadPrevious = previousIds.current.size > 0;
        const newNotifications = data.items.filter(n => !previousIds.current.has(n.id));
        previousIds.current = newIds;
        setNotifications(data.items);
        setUnreadCount(data.unread);
        setOwnerId(userId);
        setHasMore(data.hasMore);
        setError(null);
        if (hadPrevious && newNotifications.length > 0) {
          playNotificationSound();
        }
      } catch (error) {
            if (currentUser.current === userId && request === requestNumber.current) {
              setError(error instanceof ApiError ? error.message : 'Notifications could not be refreshed. Please retry.');
            }
      } finally {
        if (currentUser.current === userId && request === requestNumber.current) setLoading(false);
      }
    }, [userId]);

  useEffect(() => {
      requestNumber.current += 1;
      visibleCount.current = 50;
      loadedCount.current = 50;
      loadingMoreRef.current = false;
      previousIds.current.clear();
      setOwnerId(undefined);
      setNotifications([]);
      setUnreadCount(0);
      setHasMore(false);
      setLoadingMore(false);
      setMarkingOwner(null);
      setError(null);
      setLoading(false);
      if (!userId) return;
      void refresh();
      const interval = setInterval(refresh, 20000);
      const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        requestNumber.current += 1;
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }, [userId, refresh]);

  const loadMore = async () => {
    if (!userId || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    visibleCount.current = loadedCount.current + 50;
    try { await refresh(); } finally {
      if (currentUser.current === userId) { loadingMoreRef.current = false; setLoadingMore(false); }
    }
  };

  const markAsRead = useCallback(async (ids?: string[]) => {
      if (!userId || currentUser.current !== userId) throw new Error('Sign in to mark notifications read.');
      if (ids?.length === 0 || markingUsers.current.has(userId)) return;
      markingUsers.current.add(userId);
      setMarkingOwner(userId);
      try {
        const data = await api<string[]>('/api/notifications/read', { method: 'POST', body: ids ? { ids } : {} });
        if (currentUser.current !== userId) return;
        requestNumber.current += 1;
        const updated = new Set(data);
        setNotifications(previous => previous.map(row => updated.has(row.id) ? { ...row, read: true } : row));
        setUnreadCount(previous => Math.max(0, previous - updated.size));
      } catch (error) {
        if (currentUser.current === userId) throw error;
      } finally {
        markingUsers.current.delete(userId);
        if (currentUser.current === userId) setMarkingOwner(null);
      }
    }, [userId]);

  const ready = !!userId && ownerId === userId;
  return {
    notifications: ready ? notifications : [],
    unreadCount: ready ? unreadCount : 0,
    notificationsReady: ready,
    notificationsLoading: !!userId && (loading || (!ready && !error)),
    notificationsError: userId ? error : null,
    notificationsHasMore: ready && hasMore,
    notificationsLoadingMore: !!userId && loadingMore,
    markingNotificationsRead: !!userId && markingOwner === userId,
    refreshNotifications: refresh,
    loadMoreNotifications: loadMore,
    markNotificationsAsRead: markAsRead,
  };
};
