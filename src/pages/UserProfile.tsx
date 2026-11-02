"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import { MessageSquare, UserPlus, UserMinus, Loader2, UserX } from 'lucide-react';
import ProfileHero from '@/components/lune/ProfileHero';
import { EmptyState } from '@/components/lune/Brand';
import { supabase } from '@/lib/supabase';
import { useSocial, Post } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useWallet();
  const { isFollowing, followUser, unfollowUser, getProfileByUsername } = useSocial();
  
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;
      setLoading(true);
      
      const profileData = await getProfileByUsername(username);

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: postsData } = await supabase
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
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      setUserPosts(postsData || []);
      setLoading(false);
    };

    fetchUserData();
  }, [username, getProfileByUsername]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-lune-400" size={36} />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="lune-card max-w-lg mx-auto mt-10">
          <EmptyState icon={UserX} title="Profile unavailable">
            No profile was returned, or the database request could not be completed.
          </EmptyState>
          <div className="pb-10 flex justify-center">
            <button onClick={() => navigate('/')} className="lune-btn h-10">Back to feed</button>
          </div>
        </div>
      </Layout>
    );
  }

  const following = isFollowing(profile.id);
  const isMe = currentUser?.id === profile.id;

  return (
    <Layout noPadding>
      <ProfileHero
        name={profile.username}
        handle={profile.username}
        avatarUrl={profile.avatar_url}
        bio={profile.bio ?? ''}
        actions={
          isMe ? (
            <button
              onClick={() => navigate('/profile')}
              className="h-10 px-5 rounded-full border border-white/15 text-sm font-semibold hover:bg-white/[0.06] transition-colors"
            >
              Edit profile
            </button>
          ) : (
            <>
              <button
                disabled
                title="Messaging unavailable"
                aria-label="Messaging unavailable"
                className="h-10 w-10 rounded-full border border-white/10 text-white/30 flex items-center justify-center cursor-not-allowed"
              >
                <MessageSquare size={17} />
              </button>
              {following ? (
                <button
                  disabled={!currentUser}
                  onClick={() => unfollowUser(profile.id)}
                  className="group h-10 px-5 rounded-full border border-white/15 text-sm font-semibold hover:border-red-400/40 hover:text-red-300 transition-colors flex items-center gap-2"
                >
                  <UserMinus size={16} className="hidden group-hover:block" />
                  <span className="group-hover:hidden">Following</span>
                  <span className="hidden group-hover:inline">Unfollow</span>
                </button>
              ) : (
                <button
                  disabled={!currentUser}
                  title={!currentUser ? 'Following requires an account session' : undefined}
                  onClick={() => followUser(profile.id)}
                  className="lune-btn h-10"
                >
                  <UserPlus size={16} /> Follow
                </button>
              )}
            </>
          )
        }
      />

      <div className="max-w-4xl px-4 md:px-10 mt-8">
        <div className="border-b border-white/[0.06] flex">
          <span className="relative px-1 pb-3 text-sm font-semibold">
            Posts
            <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-lune-400" />
          </span>
        </div>
        <div className="divide-y divide-white/[0.06] -mx-4 md:-mx-6">
          {userPosts.length > 0 ? (
            userPosts.map(post => <FeedCard key={post.id} post={post} />)
          ) : (
            <EmptyState title="No posts yet">@{profile.username} hasn't posted anything.</EmptyState>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
