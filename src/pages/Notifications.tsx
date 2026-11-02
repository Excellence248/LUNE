"use client";

import React, { useEffect } from 'react';
import Layout from '@/components/lune/Layout';
import { Bell, Heart, MessageSquare, Repeat2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocial } from '@/context/SocialContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWallet } from '@/context/WalletContext';
import { PageHeader, EmptyState } from '@/components/lune/Brand';

const Notifications = () => {
  const { notifications, notificationsLoading, notificationsError, markNotificationsAsRead } = useSocial();
  const { user } = useWallet();

  useEffect(() => {
    markNotificationsAsRead();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="text-pink-400 fill-pink-400" size={12} />;
      case 'repost': return <Repeat2 className="text-emerald-400" size={12} />;
      case 'reply': return <MessageSquare className="text-sky-400" size={12} />;
      case 'follow': return <UserPlus className="text-lune-300" size={12} />;
      default: return <Bell className="text-white/50" size={12} />;
    }
  };

  const getMessage = (type: string) => {
    switch (type) {
      case 'like': return 'liked your post';
      case 'repost': return 'reposted your post';
      case 'reply': return 'replied to your post';
      case 'follow': return 'started following you';
      default: return 'interacted with you';
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full">
        <PageHeader eyebrow="Your network" icon={Bell} title="Activity" description="Likes, reposts, replies and new followers." />

        {notifications.length > 0 ? (
          <div className="lune-card overflow-hidden divide-y divide-white/[0.06]">
            {notifications.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                className={cn(
                  'relative px-4 md:px-5 py-4 flex items-start gap-3.5 transition-colors hover:bg-white/[0.02]',
                  !notif.read && 'bg-lune-500/[0.06]'
                )}
              >
                {!notif.read && <span className="absolute left-0 inset-y-3 w-[3px] rounded-r-full bg-lune-400" />}
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11 ring-1 ring-white/10">
                    <AvatarImage src={notif.actor_profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-lune-600/70 to-lune-900 text-lune-100 text-sm font-semibold">
                      {notif.actor_profile?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-popover ring-2 ring-background flex items-center justify-center">
                    {getIcon(notif.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[15px] text-white/70 leading-snug">
                    <span className="font-semibold text-white">@{notif.actor_profile?.username || 'Someone'}</span>{' '}
                    {getMessage(notif.type)}
                  </p>
                  <p className="text-xs text-white/35 mt-1">{formatDistanceToNow(new Date(notif.created_at))} ago</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="lune-card">
            <EmptyState icon={Bell} title={!user ? 'Sign in to see activity' : notificationsLoading ? 'Loading…' : 'All quiet'}>
              {!user
                ? 'Account notifications are unavailable to guests.'
                : notificationsLoading
                  ? 'Fetching your notifications.'
                  : notificationsError || 'No notifications yet. Interactions with your posts will show up here.'}
            </EmptyState>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
