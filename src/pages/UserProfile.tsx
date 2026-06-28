"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import { Shield, MessageSquare, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useSocial, Post } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useWallet();
  const { isFollowing, followUser, unfollowUser } = useSocial();
  
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;
      setLoading(true);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
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
  }, [username]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-purple-500" size={40} />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">User not found</h2>
          <Button onClick={() => navigate('/')} className="mt-4">Back to Feed</Button>
        </div>
      </Layout>
    );
  }

  const following = isFollowing(profile.id);
  const isMe = currentUser?.id === profile.id;

  return (
    <Layout noPadding>
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-purple-900 to-blue-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
      </div>

      <div className="px-4 md:px-8 -mt-16 md:-mt-20 relative z-10 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <Avatar className="w-32 h-32 md:w-40 md:h-40 border-8 border-[#050505] rounded-[2.5rem] shadow-2xl">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-purple-600 text-4xl font-bold">{profile.username?.[0]}</AvatarFallback>
          </Avatar>
          
          <div className="flex gap-3 pb-4">
            {!isMe && (
              <>
                <Button 
                  onClick={() => navigate('/messages')}
                  className="bg-white/10 text-white border border-white/10 px-6 py-3 rounded-2xl font-bold hover:bg-white/20 flex items-center gap-2"
                >
                  <MessageSquare size={18} /> Message
                </Button>
                <Button 
                  onClick={() => following ? unfollowUser(profile.id) : followUser(profile.id)}
                  className={following ? "bg-white/5 text-gray-400 border border-white/10" : "bg-purple-600 text-white"}
                >
                  {following ? <><UserMinus size={18} className="mr-2" /> Unfollow</> : <><UserPlus size={18} className="mr-2" /> Follow</>}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{profile.username}</h1>
              <Shield className="text-blue-400" size={20} />
            </div>
            <p className="text-gray-500 font-mono text-sm">@{profile.username}</p>
          </div>

          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl">
            {profile.bio}
          </p>

          <div className="pt-8">
            <h3 className="text-xl font-bold mb-6">Alpha Posts</h3>
            <div className="divide-y divide-white/5">
              {userPosts.length > 0 ? (
                userPosts.map((post) => <FeedCard key={post.id} {...post} />)
              ) : (
                <p className="text-gray-500 py-8 text-center">No posts yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;