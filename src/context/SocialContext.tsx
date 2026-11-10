import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { api, orNull, uploadImage } from '@/lib/api';
import { useWallet } from '@/context/WalletContext';
import { useAccountNotifications } from '@/hooks/useAccountNotifications';

export interface ProfileStats {
  followers: number;
  following: number;
  posts: number;
  replies: number;
  reposts: number;
  likes_given: number;
  likes_received: number;
  reposts_received: number;
}

export interface PublicProfile {
  id: string;
  username: string;
  wallet_address: string | null;
  avatar_url: string;
  bio: string;
  /** Present when the profile is loaded by username. */
  stats?: ProfileStats;
  suspended?: boolean;
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

/** Something a member can report: a post, a reply or a profile. `label` describes it in the dialog. */
export interface ReportTarget {
  type: 'post' | 'reply' | 'profile';
  id: string;
  label?: string;
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
  followingCount: number;
  followingLoading: boolean;
  followingError: string | null;
  refreshFollowing: () => Promise<void>;
  markNotificationsAsRead: (ids?: string[]) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  deleteReply: (postId: string, replyId: string) => Promise<void>;
  report: (target: ReportTarget, reason: string, details: string) => Promise<void>;
  isBlocked: (profileId: string) => boolean;
  blockUser: (profileId: string) => Promise<void>;
  unblockUser: (profileId: string) => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  // Neon has no change stream: the feed polls, so the status reads "Auto-refresh".
  const liveStatus = 'offline' as const;
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
      const data = await api<{ items: Post[]; hasMore: boolean }>(`/api/posts?limit=${limit}`);
      if (request !== requestNumber.current) return;
      loadedCount.current = limit;
      setHasMore(data.hasMore);
      setPosts(data.items);
      setFeedError(null);
    } catch {
      if (request === requestNumber.current) setFeedError('The public feed could not be refreshed. Your loaded posts are still available. Please retry.');
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchPosts(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchPosts, userId]);

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;
    const request = ++followingRequest.current;
    setFollowingLoading(true);
    try {
      const data = await api<string[]>('/api/me/follows');
      if (currentUserId.current !== userId || request !== followingRequest.current) return;
      setFollowingIds(data);
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
    const interval = setInterval(fetchFollowing, 30000);
    return () => { followingRequest.current += 1; clearInterval(interval); };
  }, [userId, fetchFollowing]);

  useEffect(() => {
    setBlockedIds([]);
    if (!userId) return;
    let active = true;
    api<string[]>('/api/me/blocks').then(ids => { if (active && currentUserId.current === userId) setBlockedIds(ids); }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);

  const loadMore = async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    visibleCount.current = loadedCount.current + 50;
    try { await fetchPosts(); } finally { loadingMoreRef.current = false; setLoadingMore(false); }
  };

  const requireAccount = () => {
    if (!userId || currentUserId.current !== userId) throw new Error('Log in to join the conversation.');
    return userId;
  };

  const addPost = async (content: string, image?: File) => {
    const author = requireAccount();
    const text = content.trim();
    if (text.length > 2000) throw new Error('Posts must be 2,000 characters or fewer.');
    if (!text && !image) throw new Error('Write something or attach an image.');
    if (postingUsers.current.has(author)) throw new Error('Your post is already being saved.');
    postingUsers.current.add(author);
    try {
      let imageUrl: string | undefined;
      if (image) {
        if (!IMAGE_TYPES.includes(image.type) || image.size > 4 * 1024 * 1024) throw new Error('Choose a JPG, PNG, WebP, or GIF image up to 4MB.');
        imageUrl = await uploadImage(image);
      }
      if (currentUserId.current !== author) throw new Error('Your account changed while posting. Log in and try again.');
      const post = await api<Post>('/api/posts', { method: 'POST', body: { content: text, image_url: imageUrl } });
      requestNumber.current += 1;
      setPosts(previous => [post, ...previous.filter(row => row.id !== post.id)].slice(0, visibleCount.current));
      setLoading(false);
      await fetchPosts();
    } finally {
      postingUsers.current.delete(author);
    }
  };

  const toggleRelation = async (table: 'likes' | 'reposts', postId: string): Promise<boolean> => {
    const author = requireAccount();
    const key = `${table}:${author}:${postId}`;
    if (busyRelations.current.has(key)) throw new Error('This action is already being saved.');
    busyRelations.current.add(key);
    try {
      // The server toggles and reports the new state, so posts outside the feed work too.
      const { active } = await api<{ active: boolean }>(`/api/posts/${postId}/${table === 'likes' ? 'like' : 'repost'}`, { method: 'POST', body: {} });
      if (currentUserId.current !== author) throw new Error('Your account changed. Log in and try again.');
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
    const author = requireAccount();
    const text = content.trim();
    if (!text || text.length > 1000) throw new Error('Replies must contain 1–1,000 characters.');
    const key = `reply:${author}:${postId}`;
    if (busyRelations.current.has(key)) throw new Error('Your reply is already being saved.');
    busyRelations.current.add(key);
    try {
      const reply = await api<Reply>(`/api/posts/${postId}/replies`, { method: 'POST', body: { content: text } });
      requestNumber.current += 1;
      setPosts(previous => previous.map(post => post.id === postId ? { ...post, replies: [...(post.replies || []).filter(row => row.id !== reply.id), reply] } : post));
      await fetchPosts();
      return reply;
    } finally { busyRelations.current.delete(key); }
  };

  const followUser = async (targetUserId: string) => {
    const author = requireAccount();
    if (author === targetUserId) return;
    const key = `follow:${author}:${targetUserId}`;
    if (busyRelations.current.has(key)) return;
    busyRelations.current.add(key);
    try {
      await api(`/api/follows/${targetUserId}`, { method: 'POST', body: { active: true } });
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
    const author = requireAccount();
    const key = `follow:${author}:${targetUserId}`;
    if (busyRelations.current.has(key)) return;
    busyRelations.current.add(key);
    try {
      await api(`/api/follows/${targetUserId}`, { method: 'POST', body: { active: false } });
      if (currentUserId.current !== author) return;
      followingRequest.current += 1;
      setFollowingLoading(false);
      setFollowingError(null);
      setFollowingIds(previous => previous.filter(id => id !== targetUserId));
    } finally {
      busyRelations.current.delete(key);
    }
  };

  const deletePost = async (postId: string) => {
    requireAccount();
    await api(`/api/posts/${postId}`, { method: 'DELETE' });
    requestNumber.current += 1;
    setPosts(previous => previous.filter(post => post.id !== postId));
    await fetchPosts();
  };

  const deleteReply = async (postId: string, replyId: string) => {
    requireAccount();
    await api(`/api/replies/${replyId}`, { method: 'DELETE' });
    requestNumber.current += 1;
    setPosts(previous => previous.map(post => post.id === postId ? { ...post, replies: (post.replies || []).filter(reply => reply.id !== replyId) } : post));
    await fetchPosts();
  };

  const report = async (target: ReportTarget, reason: string, details: string) => {
    requireAccount();
    await api('/api/reports', { method: 'POST', body: { target_type: target.type, target_id: target.id, reason, details } });
  };

  const setBlocked = async (profileId: string, active: boolean) => {
    const author = requireAccount();
    await api(`/api/blocks/${profileId}`, { method: 'POST', body: { active } });
    if (currentUserId.current !== author) return;
    setBlockedIds(previous => active ? [...previous.filter(id => id !== profileId), profileId] : previous.filter(id => id !== profileId));
    // Blocking ends follows both ways.
    if (active) setFollowingIds(previous => previous.filter(id => id !== profileId));
  };

  const searchUsers = useCallback(async (query: string): Promise<PublicProfile[]> => {
    const term = query.trim().replace(/^@/, '');
    if (!/^[A-Za-z0-9_]{1,64}$/.test(term)) return [];
    return api<PublicProfile[]>(`/api/profiles?q=${encodeURIComponent(term)}`);
  }, []);

  const getProfileByUsername = useCallback(async (username: string): Promise<PublicProfile | null> => {
    return orNull(api<PublicProfile>(`/api/profiles/${encodeURIComponent(username)}`));
  }, []);

  return (
    <SocialContext.Provider value={{
      // Posts from members you blocked are hidden everywhere the feed is shown.
      posts: blockedIds.length ? posts.filter(post => !blockedIds.includes(post.user_id)) : posts, notifications, unreadCount,
      loading, feedError, liveStatus, hasMore, loadingMore, loadMore,
      notificationsLoading, notificationsError, notificationsReady,
      notificationsHasMore, notificationsLoadingMore, markingNotificationsRead,
      refreshNotifications, loadMoreNotifications, refreshFeed: fetchPosts, addPost,
      toggleLike: postId => toggleRelation('likes', postId), toggleRepost: postId => toggleRelation('reposts', postId),
      addComment, followUser, unfollowUser, isFollowing: targetUserId => followingIds.includes(targetUserId),
      followingCount: followingIds.length, followingLoading, followingError, refreshFollowing: fetchFollowing,
      searchUsers, getProfileByUsername, markNotificationsAsRead,
      deletePost, deleteReply, report,
      isBlocked: profileId => blockedIds.includes(profileId),
      blockUser: profileId => setBlocked(profileId, true), unblockUser: profileId => setBlocked(profileId, false),
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
