"use client";

import React, { useEffect } from 'react';
import Layout from '@/components/lune/Layout';
import { Bell, Heart, MessageSquare, Repeat2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocial } from '@/context/SocialContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const Notifications = () => {
  const { notifications, markNotificationsAsRead } = useSocial();

  useEffect(() => {
    markNotificationsAsRead();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="text-pink-500 fill-pink-500" size={16} />;
      case 'repost': return <Repeat2 className="text-green-500" size={16} />;
      case 'reply': return <MessageSquare className="text-blue-500" size={16} />;
      case 'follow': return <UserPlus className="text-purple-500" size={16} />;
      default: return <Bell className="text-gray-500" size={16} />;
    }
  };

  const getMessage = (type: string) => {
    switch (type) {
      case 'like': return 'liked your alpha';
      case 'repost': return 'reposted your alpha';
      case 'reply': return 'replied to your alpha';
      case 'follow': return 'started following you';
      default: return 'interacted with you';
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            Activity <Bell className="text-purple-500" />
          </h1>
        </div>

        <div className="space-y-4">
          {notifications.length > 0 ? notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl hover:bg-white/[0.08] transition-all cursor-pointer group relative",
                !notif.read && "border-purple-500/30 bg-purple-500/5"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="w-10 h-10 md:w-12 md:h-12 border border-white/10">
                    <AvatarImage src={notif.actor_profile?.avatar_url} />
                    <AvatarFallback className="bg-purple-900 text-purple-200 text-xs">
                      {notif.actor_profile?.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-[#050505] p-1 rounded-full border border-white/10">
                    {getIcon(notif.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                    <span className="font-bold text-white">@{notif.actor_profile?.username || 'Someone'}</span> {getMessage(notif.type)}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notif.created_at))} ago
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                )}
              </div>
            </motion.div>
          )) : (
            <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/10">
              <Bell className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 font-bold">No new notifications.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;