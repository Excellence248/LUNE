"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/context/WalletContext';

export interface Post {
  id: string;
  user_id: string;
  content: string;
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
  reposted_by_current_user?: boolean;
}

interface SocialContextType {
  posts: Post[];
  messages: Record<string, any[]>;
  loading: boolean;
  refreshFeed: () => Promise<void>;
  addPost: (content: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => boolean;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  fetchMessages: (otherUserId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useWallet();
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
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

    if (!error && data) {
      setPosts(data);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (!error && data) {
      setFollowingIds(data.map(f => f.following_id));
    }
  };

  useEffect(() => {
    fetchPosts();
    if (user) fetchFollowing();
  }, [user]);

  const addPost = async (content: string) => {
    if (!user) return;
    const { error } = await supabase.from('posts').insert([
      { user_id: user.id, content, post_type: 'post' }
    ]);
    if (!error) fetchPosts();
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes?.some(l => l.user_id === user.id);

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
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
    }
    fetchPosts();
  };

  const addComment = async (postId: string, content: string) => {
    if (!user) return;
    const { error } = await supabase.from('replies').insert([
      { post_id: postId, user_id: user.id, content }
    ]);
    if (!error) fetchPosts();
  };

  const followUser = async (targetUserId: string) => {
    if (!user) return;
    await supabase.from('follows').insert([{ follower_id: user.id, following_id: targetUserId }]);
    fetchFollowing();
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
    fetchFollowing();
  };

  const isFollowing = (targetUserId: string) => followingIds.includes(targetUserId);

  const sendMessage = async (receiverId: string, content: string) => {
    if (!user) return;
    const { error } = await supabase.from('messages').insert([
      { sender_id: user.id, receiver_id: receiverId, content }
    ]);
    if (!error) fetchMessages(receiverId);
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(prev => ({ ...prev, [otherUserId]: data }));
    }
  };

  const searchUsers = async (query: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(10);
    return data || [];
  };

  return (
    <SocialContext.Provider value={{ 
      posts, messages, loading, refreshFeed: fetchPosts, addPost, toggleLike, 
      toggleRepost, addComment, followUser, unfollowUser, isFollowing,
      sendMessage, fetchMessages, searchUsers
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