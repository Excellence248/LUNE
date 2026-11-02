import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/context/SocialContext';

export const useAccountNotifications = (userId: string | undefined) => {
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const requestNumber = useRef(0);
  const visibleCount = useRef(50);
  const loadedCount = useRef(50);
  const loadingMoreRef = useRef(false);
  const markingUsers = useRef(new Set<string>());
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
      const [rows, count] = await Promise.all([
        supabase.from('notifications').select('*, actor_profile:actor_id(username, avatar_url)').eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false),
      ]);
      if (rows.error || count.error) throw rows.error || count.error;
      if (currentUser.current !== userId || request !== requestNumber.current) return;
      loadedCount.current = limit;
      setNotifications((rows.data || []).slice(0, limit) as unknown as Notification[]);
      setUnreadCount(count.count || 0);
      setOwnerId(userId);
      setHasMore((rows.data?.length || 0) > limit);
      setError(null);
    } catch {
      if (currentUser.current === userId && request === requestNumber.current) setError('Notifications could not be refreshed. Please retry.');
    } finally {
      if (currentUser.current === userId && request === requestNumber.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    requestNumber.current += 1;
    visibleCount.current = 50;
    loadedCount.current = 50;
    loadingMoreRef.current = false;
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
    let debounce: ReturnType<typeof setTimeout>;
    const refetch = () => { clearTimeout(debounce); debounce = setTimeout(refresh, 150); };
    const channel = supabase.channel(`notifications:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, refetch).subscribe(status => { if (status === 'SUBSCRIBED') refetch(); });
    const interval = setInterval(refresh, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      requestNumber.current += 1;
      clearTimeout(debounce);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
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
      let query = supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
      if (ids) query = query.in('id', ids);
      const { data, error: updateError } = await query.select('id');
      if (updateError) throw new Error('Notifications could not be marked read. Check your connection and retry.');
      if (currentUser.current !== userId) return;
      requestNumber.current += 1;
      const updated = new Set((data || []).map(row => row.id));
      setNotifications(previous => previous.map(row => updated.has(row.id) ? { ...row, read: true } : row));
      setUnreadCount(previous => Math.max(0, previous - updated.size));
      await refresh();
    } finally {
      markingUsers.current.delete(userId);
      if (currentUser.current === userId) setMarkingOwner(null);
    }
  }, [userId, refresh]);

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
