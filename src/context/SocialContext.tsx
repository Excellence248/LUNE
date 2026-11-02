import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/context/WalletContext';
import { useAccountNotifications } from '@/hooks/useAccountNotifications';

export interface PublicProfile {
  id: string;
  username: string;
  wallet_address: string;
  avatar_url: string;
  bio: string;
}

export interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Pick<PublicProfile, 'username' | 'avatar_url' | 'wallet_address'>;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  post_type?: 'post' | 'repost';
  repost_content?: string;
  repost_username?: string;
  original_post_id?: string;
  profiles?: Pick<PublicProfile, 'username' | 'avatar_url' | 'wallet_address'>;
  likes?: { user_id: string }[];
  reposts?: { user_id: string }[];
  replies?: Reply[];
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'repost' | 'reply' | 'follow';
  post_id?: string;
  read: boolean;
  created_at: string;
  actor_profile?: { username: string; avatar_url: string };
}

interface SocialContextType {
  posts: Post[];
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  feedError: string | null;
  liveStatus: 'connecting' | 'live' | 'offline';
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  notificationsLoading: boolean;
  notificationsError: string | null;
  notificationsReady: boolean;
  notificationsHasMore: boolean;
  notificationsLoadingMore: boolean;
  markingNotificationsRead: boolean;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  addPost: (content: string, image?: File) => Promise<void>;
  toggleLike: (postId: string) => Promise<boolean>;
  toggleRepost: (postId: string) => Promise<boolean>;
  addComment: (postId: string, content: string) => Promise<Reply>;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => boolean;
  searchUsers: (query: string) => Promise<PublicProfile[]>;
  getProfileByUsername: (username: string) => Promise<PublicProfile | null>;
  followingLoading: boolean;
  followingError: string | null;
  refreshFollowing: () => Promise<void>;
  markNotificationsAsRead: (ids?: string[]) => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);
export const postSelect = '*, profiles(username, avatar_url, wallet_address), likes(user_id), reposts(user_id), replies(*, profiles(username, avatar_url, wallet_address))';
const imageExtensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export const SocialProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useWallet();
  const userId = user?.id;
  const currentUserId = useRef(userId);
  currentUserId.current = userId;
  const {
    notifications, unreadCount, notificationsLoading, notificationsError, notificationsReady,
    notificationsHasMore, notificationsLoadingMore, markingNotificationsRead,
    refreshNotifications, loadMoreNotifications, markNotificationsAsRead,
  } = useAccountNotifications(userId);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingError, setFollowingError] = useState<string | null>(null);
  const followingRequest = useRef(0);
  const visibleCount = useRef(50);
  const loadedCount = useRef(50);
  const loadingMoreRef = useRef(false);
  const postingUsers = useRef(new Set<string>());
  const requestNumber = useRef(0);
  const busyRelations = useRef(new Set<string>());

  const fetchPosts = useCallback(async () => {
    const request = ++requestNumber.current;
    const limit = visibleCount.current;
    try {
      const { data, error } = await supabase.from('posts').select(postSelect)
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .order('created_at', { referencedTable: 'replies', ascending: true })
        .limit(limit + 1);
      if (error) throw error;
      if (request !== requestNumber.current) return;
      loadedCount.current = limit;
      setHasMore((data?.length || 0) > limit);
      setPosts((data || []).slice(0, limit) as unknown as Post[]);
      setFeedError(null);
    } catch {
      if (request === requestNumber.current) setFeedError('The public feed could not be refreshed. Your loaded posts are still available. Please retry.');
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    let debounce: ReturnType<typeof setTimeout>;
    const refresh = () => { clearTimeout(debounce); debounce = setTimeout(fetchPosts, 150); };
    const channel = supabase.channel('live-public-feed');
    for (const table of ['posts', 'likes', 'reposts', 'replies', 'profiles']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe(status => {
      setLiveStatus(status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' ? 'offline' : 'connecting');
      if (status === 'SUBSCRIBED') refresh();
    });
    // A real refetch keeps the feed current if the change-stream connection is interrupted.
    const interval = setInterval(fetchPosts, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchPosts(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [fetchPosts, userId]);

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;
    const request = ++followingRequest.current;
    setFollowingLoading(true);
    try {
      const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      if (error) throw error;
      if (currentUserId.current !== userId || request !== followingRequest.current) return;
      setFollowingIds((data || []).map(row => row.following_id));
      setFollowingError(null);
    } catch {
      if (currentUserId.current === userId && request === followingRequest.current) setFollowingError('Your following status could not be loaded. Please retry.');
    } finally {
      if (currentUserId.current === userId && request === followingRequest.current) setFollowingLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    followingRequest.current += 1;
    setFollowingIds([]);
    setFollowingError(null);
    setFollowingLoading(false);
    if (!userId) return;
    void fetchFollowing();
    const channel = supabase.channel(`following:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${userId}` }, fetchFollowing)
      .subscribe();
    const interval = setInterval(fetchFollowing, 30000);
    return () => { followingRequest.current += 1; clearInterval(interval); void supabase.removeChannel(channel); };
  }, [userId, fetchFollowing]);

  const loadMore = async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    visibleCount.current = loadedCount.current + 50;
    try { await fetchPosts(); } finally { loadingMoreRef.current = false; setLoadingMore(false); }
  };

  const requireWallet = () => {
    if (!userId || currentUserId.current !== userId) throw new Error('Connect and sign in with a wallet first.');
    return userId;
  };

  const addPost = async (content: string, image?: File) => {
    const author = requireWallet();
    const text = content.trim();
    if (text.length > 2000) throw new Error('Posts must be 2,000 characters or fewer.');
    if (!text && !image) throw new Error('Write something or attach an image.');
    if (postingUsers.current.has(author)) throw new Error('Your post is already being saved.');
    postingUsers.current.add(author);
    let path: string | undefined;
    let saved = false;
    try {
      let imageUrl: string | undefined;
      if (image) {
        const extension = imageExtensions[image.type];
        if (!extension || image.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG, WebP, or GIF image up to 5MB.');
        path = `${author}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from('feed-media').upload(path, image, { contentType: image.type });
        if (error) throw new Error('Your image could not be uploaded. Check your connection and wallet session, then retry.');
        imageUrl = supabase.storage.from('feed-media').getPublicUrl(path).data.publicUrl;
      }
      if (currentUserId.current !== author) throw new Error('Your wallet changed while posting. Reconnect and try again.');
      const { data, error } = await supabase.from('posts').insert({ user_id: author, content: text, image_url: imageUrl }).select(postSelect).single();
      if (error) throw new Error('Your post could not be saved. Check your wallet session and connection, then retry.');
      saved = true;
      requestNumber.current += 1;
      setPosts(previous => [data as unknown as Post, ...previous.filter(post => post.id !== data.id)].slice(0, visibleCount.current));
      setLoading(false);
      await fetchPosts();
    } finally {
      if (path && !saved) await supabase.storage.from('feed-media').remove([path]).catch(() => undefined);
      postingUsers.current.delete(author);
    }
  };

  const toggleRelation = async (table: 'likes' | 'reposts', postId: string): Promise<boolean> => {
    const author = requireWallet();
    const key = `${table}:${author}:${postId}`;
    if (busyRelations.current.has(key)) throw new Error('This action is already being saved.');
    busyRelations.current.add(key);
    try {
      const { data: existing, error: readError } = await supabase.from(table).select('user_id').eq('post_id', postId).eq('user_id', author).maybeSingle();
      if (readError) throw new Error('Your reaction could not be checked. Please retry.');
      if (currentUserId.current !== author) throw new Error('Your wallet changed. Reconnect and try again.');
      if (existing) {
        const { data: deleted, error } = await supabase.from(table).delete().eq('post_id', postId).eq('user_id', author).select('user_id');
        if (error || !deleted?.length) throw new Error('Your reaction could not be removed. Check your wallet session and try again.');
      } else {
        const { error } = await supabase.from(table).insert({ post_id: postId, user_id: author });
        if (error && error.code !== '23505') throw new Error('Your reaction could not be saved. Check your wallet session and try again.');
      }
      const active = !existing;
      requestNumber.current += 1;
      setPosts(previous => previous.map(post => post.id === postId ? {
        ...post,
        [table]: [...(post[table] || []).filter(row => row.user_id !== author), ...(active ? [{ user_id: author }] : [])],
      } : post));
      await fetchPosts();
      return active;
    } finally { busyRelations.current.delete(key); }
  };

  const addComment = async (postId: string, content: string): Promise<Reply> => {
    const author = requireWallet();
    const text = content.trim();
    if (!text || text.length > 1000) throw new Error('Replies must contain 1–1,000 characters.');
    const key = `reply:${author}:${postId}`;
    if (busyRelations.current.has(key)) throw new Error('Your reply is already being saved.');
    busyRelations.current.add(key);
    try {
      const { data, error } = await supabase.from('replies').insert({ post_id: postId, user_id: author, content: text }).select('*, profiles(username, avatar_url, wallet_address)').single();
      if (error) throw new Error('Your reply could not be saved. Check your wallet session and connection, then retry.');
      const reply = data as unknown as Reply;
      requestNumber.current += 1;
      setPosts(previous => previous.map(post => post.id === postId ? { ...post, replies: [...(post.replies || []).filter(row => row.id !== reply.id), reply] } : post));
      await fetchPosts();
      return reply;
    } finally { busyRelations.current.delete(key); }
  };

  const followUser = async (targetUserId: string) => {
    const author = requireWallet();
    if (author === targetUserId) return;
    const key = `follow:${author}:${targetUserId}`;
    if (busyRelations.current.has(key)) return;
    busyRelations.current.add(key);
    try {
      const { error } = await supabase.from('follows').insert({ follower_id: author, following_id: targetUserId });
      if (error && error.code !== '23505') throw error;
      if (currentUserId.current !== author) return;
      followingRequest.current += 1;
      setFollowingLoading(false);
      setFollowingError(null);
      setFollowingIds(previous => previous.includes(targetUserId) ? previous : [...previous, targetUserId]);
    } finally {
      busyRelations.current.delete(key);
    }
  };
  const unfollowUser = async (targetUserId: string) => {
    const author = requireWallet();
    const key = `follow:${author}:${targetUserId}`;
    if (busyRelations.current.has(key)) return;
    busyRelations.current.add(key);
    try {
      const { error } = await supabase.from('follows').delete().eq('follower_id', author).eq('following_id', targetUserId);
      if (error) throw error;
      if (currentUserId.current !== author) return;
      followingRequest.current += 1;
      setFollowingLoading(false);
      setFollowingError(null);
      setFollowingIds(previous => previous.filter(id => id !== targetUserId));
    } finally {
      busyRelations.current.delete(key);
    }
  };

  const searchUsers = useCallback(async (query: string): Promise<PublicProfile[]> => {
    const term = query.trim().replace(/^@/, '');
    if (!/^[A-Za-z0-9_]{1,64}$/.test(term)) return [];
    const escaped = term.replace(/_/g, '\\_');
    const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, bio, wallet_address').ilike('username', `%${escaped}%`).order('username', { ascending: true }).limit(10);
    if (error) throw error;
    return data || [];
  }, []);

  const getProfileByUsername = useCallback(async (username: string): Promise<PublicProfile | null> => {
    const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, bio, wallet_address').eq('username', username).maybeSingle();
    if (error) throw error;
    return data;
  }, []);

  return (
    <SocialContext.Provider value={{
      posts, notifications, unreadCount,
      loading, feedError, liveStatus, hasMore, loadingMore, loadMore,
      notificationsLoading, notificationsError, notificationsReady,
      notificationsHasMore, notificationsLoadingMore, markingNotificationsRead,
      refreshNotifications, loadMoreNotifications, refreshFeed: fetchPosts, addPost,
      toggleLike: postId => toggleRelation('likes', postId), toggleRepost: postId => toggleRelation('reposts', postId),
      addComment, followUser, unfollowUser, isFollowing: targetUserId => followingIds.includes(targetUserId),
      followingLoading, followingError, refreshFollowing: fetchFollowing,
      searchUsers, getProfileByUsername, markNotificationsAsRead,
    }}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used within a SocialProvider');
  return context;
};
