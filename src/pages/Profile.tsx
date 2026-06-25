"use client";

import React, { useState } from 'react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import { Shield, Edit3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/context/WalletContext';
import { useSocial } from '@/context/SocialContext';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Profile = () => {
  const { user, updateProfile } = useWallet();
  const { posts } = useSocial();
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({ 
    username: user?.username || '', 
    bio: user?.bio || '' 
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(editData);
      showSuccess("Profile updated!");
    } catch (error) {
      showError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Corrected filtering logic to use user_id
  const userPosts = posts.filter(p => p.user_id === user?.id);

  return (
    <Layout noPadding>
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-purple-900 to-blue-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
      </div>

      <div className="px-4 md:px-8 -mt-16 md:-mt-20 relative z-10 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <Avatar className="w-32 h-32 md:w-40 md:h-40 border-8 border-[#050505] rounded-[2.5rem] shadow-2xl">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-purple-600 text-4xl font-bold">
              {user?.username?.[0] || user?.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex gap-3 pb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 flex items-center gap-2">
                  <Edit3 size={18} /> Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#050505] border-white/10 text-white rounded-[2.5rem]">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                      value={editData.username} 
                      onChange={e => setEditData({...editData, username: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <textarea 
                      value={editData.bio} 
                      onChange={e => setEditData({...editData, bio: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 h-24 focus:outline-none text-white"
                    />
                  </div>
                  <Button 
                    onClick={handleSave} 
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-500"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{user?.username || 'User'}</h1>
              <Shield className="text-blue-400" size={20} />
            </div>
            <p className="text-gray-500 font-mono text-sm">{user?.email}</p>
          </div>

          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl">
            {user?.bio || "No bio set yet."}
          </p>

          <div className="grid grid-cols-3 gap-8 py-6 border-y border-white/5">
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-500 font-bold uppercase">Reputation</p>
              <p className="text-xl font-bold">2,450</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-500 font-bold uppercase">Followers</p>
              <p className="text-xl font-bold">0</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-500 font-bold uppercase">Posts</p>
              <p className="text-xl font-bold">{userPosts.length}</p>
            </div>
          </div>

          <div className="pt-8">
            <h3 className="text-xl font-bold mb-6">Your Alpha</h3>
            <div className="divide-y divide-white/5">
              {userPosts.length > 0 ? (
                userPosts.map((post) => <FeedCard key={post.id} post={post} />)
              ) : (
                <p className="text-gray-500 py-8 text-center">No posts yet. Share some alpha!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;