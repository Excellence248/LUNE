"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/context/WalletContext';
import { showError } from '@/utils/toast';

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
  profiles?: {
    username: string;
    avatar_url: string;
  };
  likes?: { user_id: string }[];
  reposts?: { user_id: string }[];
  replies?: any[];
  token_alpha?: any;
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
  notificationsLoading: boolean;
  notificationsError: string | null;
  refreshFeed: () => Promise<void>;
  addPost: (content: string, imageUrl?: string, tokenAlpha?: any) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => boolean;
  searchUsers: (query: string) => Promise<any[]>;
  getProfileByUsername: (username: string) => Promise<any>;
  markNotificationsAsRead: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useWallet();
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(username, avatar_url),
          likes (user_id),
          reposts (user_id),
          replies (
            *,
            profiles(username, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (!error) {
        setPosts(data || []);
        setFeedError(null);
      } else {
        setPosts([]);
        setFeedError('Posts could not be loaded from the database.');
        console.error("Error fetching posts:", error);
      }
    } catch (err) {
      setPosts([]);
      setFeedError('Posts could not be loaded from the database.');
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor_profile:actor_id(username, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setNotificationsError(null);
    } catch (err) {
      setNotifications([]);
      setNotificationsError('Notifications could not be loaded from the database.');
      console.error("Error fetching notifications:", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!error && data) {
        setFollowingIds(data.map(f => f.following_id));
      }
    } catch (err) {
      console.error("Error fetching following:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
    if (user) {
      fetchFollowing();
      fetchNotifications();
    } else {
      setFollowingIds([]);
      setNotifications([]);
      setNotificationsError(null);
      setNotificationsLoading(false);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchPosts();

    const postChannel = supabase
      .channel('public:posts')
      .on('postgres_changes' as any, { event: '*', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes' as any, { event: '*', table: 'likes' }, () => fetchPosts())
      .on('postgres_changes' as any, { event: '*', table: 'reposts' }, () => fetchPosts())
      .on('postgres_changes' as any, { event: '*', table: 'replies' }, () => fetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
    };
  }, []);

  const addPost = async (content: string, imageUrl?: string, tokenAlpha?: any) => {
    if (!user) throw new Error('Posting is unavailable to guests.');
    const { error } = await supabase.from('posts').insert([
      {
        user_id: user.id,
        content,
        image_url: imageUrl,
        post_type: 'post',
        token_alpha: tokenAlpha
      }
    ]);
    if (error) throw error;
    await fetchPosts();
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes?.some(l => l.user_id === user.id);

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: post.user_id,
          actor_id: user.id,
          type: 'like',
          post_id: postId
        }]);
      }
    }
    fetchPosts();
  };

  const toggleRepost = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isReposted = post.reposts?.some(r => r.user_id === user.id);

    if (isReposted) {
      await supabase.from('reposts').delete().eq('post_id', postId).eq('user_id', user.id);
      showError("Repost removed");
    } else {
      await supabase.from('posts').insert([{
        user_id: user.id,
        content: '',
        post_type: 'repost',
        repost_content: post.content,
        repost_username: post.profiles?.username || 'Anonymous',
        original_post_id: post.id,
      }]);
      await supabase.from('reposts').insert([{ post_id: postId, user_id: user.id }]);
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: post.user_id,
          actor_id: user.id,
          type: 'repost',
          post_id: postId
        }]);
      }
    }
    fetchPosts();
  };

  const addComment = async (postId: string, content: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    const { error } = await supabase.from('replies').insert([
      { post_id: postId, user_id: user.id, content }
    ]);
    
    if (error) {
      showError("Failed to reply.");
      console.error("Error adding comment:", error);
    } else {
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: post.user_id,
          actor_id: user.id,
          type: 'reply',
          post_id: postId
        }]);
      }
      fetchPosts();
    }
  };

  const followUser = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return;
    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: user.id, following_id: targetUserId }]);

    if (!error) {
      setFollowingIds(prev => [...prev, targetUserId]);
      await supabase.from('notifications').insert([{
        user_id: targetUserId,
        actor_id: user.id,
        type: 'follow'
      }]);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);
    
    if (!error) {
      setFollowingIds(prev => prev.filter(id => id !== targetUserId));
    }
  };

  const isFollowing = (targetUserId: string) => followingIds.includes(targetUserId);

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .ilike('username', `%${query}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error searching users:", err);
      return [];
    }
  };

  const getProfileByUsername = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      return data;
    } catch (err) {
      console.error("Error getting profile:", err);
      return null;
    }
  };

  const markNotificationsAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    
    if (!error) fetchNotifications();
  };

  return (
    <SocialContext.Provider value={{
      posts, notifications, unreadCount, loading, feedError, notificationsLoading, notificationsError,
      refreshFeed: fetchPosts, addPost, toggleLike,
      toggleRepost, addComment, followUser, unfollowUser, isFollowing,
      searchUsers, getProfileByUsername, markNotificationsAsRead
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