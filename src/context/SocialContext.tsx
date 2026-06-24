"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from './WalletContext';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

export interface Reply {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { username: string; avatar_url: string };
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { username: string; avatar_url: string };
  likes: { user_id: string }[];
  reposts: { user_id: string }[];
  replies: Reply[];
  token_alpha?: any;
}

interface SocialContextType {
  posts: Post[];
  loading: boolean;
  addPost: (content: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  refreshFeed: () => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  searchUsers: (query: string) => Promise<any[]>;
  messages: Record<string, any[]>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  fetchMessages: (receiverId: string) => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useWallet();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<string[]>([]);
  const [messages, setMessages] = useState<Record<string, any[]>>({});

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

      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!error) {
        setFollowing(data.map(f => f.following_id));
      }
    } catch (err) {
      console.error("Error fetching following list:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
    if (user) fetchFollowing();

    const postsChannel = supabase
      .channel('public:social_updates')
      .on('postgres_changes', { event: '*', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', table: 'likes' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', table: 'reposts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', table: 'replies' }, () => fetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [user]);

  const addPost = async (content: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('posts')
      .insert([{ user_id: user.id, content }]);

    if (error) {
      showError("Failed to post alpha.");
    } else {
      showSuccess("Alpha posted to the global feed!");
      fetchPosts();
    }
  };

  const refreshFeed = async () => {
    await fetchPosts();
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      showError("Please connect your wallet to like posts.");
      return;
    }
    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes.some(l => l.user_id === user.id);

    try {
      if (isLiked) {
        const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
        if (error) throw error;
      }
      fetchPosts();
    } catch (err) {
      console.error("Error toggling like:", err);
      showError("Failed to update like.");
    }
  };

  const toggleRepost = async (postId: string) => {
    if (!user) {
      showError("Please connect your wallet to repost.");
      return;
    }
    const post = posts.find(p => p.id === postId);
    const isReposted = post?.reposts.some(r => r.user_id === user.id);

    try {
      if (isReposted) {
        const { error } = await supabase.from('reposts').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reposts').insert([{ post_id: postId, user_id: user.id }]);
        if (error) throw error;
      }
      fetchPosts();
    } catch (err) {
      console.error("Error toggling repost:", err);
      showError("Failed to update repost.");
    }
  };

  const addComment = async (postId: string, content: string) => {
    if (!user) {
      showError("Please connect your wallet to reply.");
      return;
    }
    try {
      const { error } = await supabase
        .from('replies')
        .insert([{ post_id: postId, user_id: user.id, content }]);

      if (error) throw error;
      showSuccess("Reply posted!");
      fetchPosts();
    } catch (err) {
      console.error("Error adding comment:", err);
      showError("Failed to reply.");
    }
  };

  const followUser = async (userId: string) => {
    if (!user) {
      showError("Please connect your wallet to follow users.");
      return;
    }
    if (userId === user.id) return;
    try {
      const { error } = await supabase
        .from('follows')
        .insert([{ follower_id: user.id, following_id: userId }]);

      if (error) throw error;
      setFollowing(prev => [...prev, userId]);
      showSuccess("Following user!");
    } catch (err) {
      console.error("Error following user:", err);
      showError("Failed to follow user.");
    }
  };

  const unfollowUser = async (userId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;
      setFollowing(prev => prev.filter(id => id !== userId));
      showSuccess("Unfollowed user.");
    } catch (err) {
      console.error("Error unfollowing user:", err);
      showError("Failed to unfollow user.");
    }
  };

  const isFollowing = (userId: string) => following.includes(userId);

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(10);
      
      return error ? [] : data;
    } catch (err) {
      console.error("Error searching users:", err);
      return [];
    }
  };

  const sendMessage = async (receiverId: string, content: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: receiverId, content }]);

    if (error) showError("Failed to send message.");
    else fetchMessages(receiverId);
  };

  const fetchMessages = async (receiverId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (!error) {
        setMessages(prev => ({ ...prev, [receiverId]: data }));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  return (
    <SocialContext.Provider value={{ 
      posts, loading, addPost, toggleLike, toggleRepost, addComment, refreshFeed,
      followUser, unfollowUser, isFollowing, searchUsers,
      messages, sendMessage, fetchMessages 
    }}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used within SocialProvider');
  return context;
};