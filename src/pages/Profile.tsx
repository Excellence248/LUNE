"use client";

import React, { useState, useRef } from 'react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import { Edit3, Camera, UserRound } from 'lucide-react';
import ProfileHero from '@/components/lune/ProfileHero';
import { EmptyState } from '@/components/lune/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/context/WalletContext';
import { useSocial } from '@/context/SocialContext';
import { showSuccess, showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Profile = () => {
  const { user, updateProfile } = useWallet();
  const { posts } = useSocial();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editData, setEditData] = useState({ 
    username: user?.username || '', 
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

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

  const userPosts = posts.filter(p =>
    p.user_id === user?.id || p.reposts?.some(r => r.user_id === user?.id)
  );

  if (!user) {
    return (
      <Layout>
        <div className="lune-card max-w-lg mx-auto mt-10">
          <EmptyState icon={UserRound} title="Profile unavailable">
            You're browsing as a guest. No personal profile or account statistics are available.
          </EmptyState>
        </div>
      </Layout>
    );
  }

  const displayName = user.username || user.email?.split('@')[0] || 'Account profile';

  return (
    <Layout noPadding>
      <ProfileHero
        name={displayName}
        handle={user.username}
        subtitle={user.email}
        avatarUrl={user.avatar}
        bio={user.bio ?? ''}
        footnote="Reputation and follower totals are unavailable."
        actions={
          <Dialog
            onOpenChange={open => {
              if (open) setEditData({ username: user.username || '', bio: user.bio || '', avatar: user.avatar || '' });
            }}
          >
            <DialogTrigger asChild>
              <button className="h-10 px-5 rounded-full border border-white/15 bg-white/[0.03] text-sm font-semibold hover:bg-white/[0.08] transition-colors flex items-center gap-2">
                <Edit3 size={15} /> Edit profile
              </button>
            </DialogTrigger>
            <DialogContent className="bg-popover/95 backdrop-blur-2xl border-white/10 text-white rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Edit profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    className="relative group rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change avatar"
                  >
                    <Avatar className="w-24 h-24 ring-2 ring-lune-400/40">
                      <AvatarImage src={editData.avatar} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-lune-400 to-lune-800 text-2xl font-bold">
                        {editData.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={22} />
                    </span>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  <p className="text-xs text-white/40">Tap to change avatar · max 2MB</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-username" className="text-white/60 text-xs">Username</Label>
                  <input
                    id="edit-username"
                    value={editData.username}
                    onChange={e => setEditData({ ...editData, username: e.target.value })}
                    className="lune-input px-4 py-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bio" className="text-white/60 text-xs">Bio</Label>
                  <textarea
                    id="edit-bio"
                    value={editData.bio}
                    onChange={e => setEditData({ ...editData, bio: e.target.value })}
                    className="lune-input px-4 py-3 h-28 resize-none"
                  />
                </div>
                <button onClick={handleSave} disabled={loading} className="lune-btn w-full h-11">
                  {loading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="max-w-4xl px-4 md:px-10 mt-8">
        <div className="border-b border-white/[0.06] flex">
          <span className="relative px-1 pb-3 text-sm font-semibold">
            Your posts
            <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-lune-400" />
          </span>
        </div>
        <div className="divide-y divide-white/[0.06] -mx-4 md:-mx-6">
          {userPosts.length > 0 ? (
            userPosts.map(post => (
              <FeedCard
                key={post.id}
                post={{
                  ...post,
                  repostedBy: post.user_id !== user?.id ? user?.username : undefined,
                }}
              />
            ))
          ) : (
            <EmptyState title="No posts yet">Share your first bit of alpha from the feed.</EmptyState>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
