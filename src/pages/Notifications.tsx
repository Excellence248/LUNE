"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Bell, Heart, MessageSquare, DollarSign, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const Notifications = () => {
  const activities: any[] = [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            Activity <Bell className="text-purple-500" />
          </h1>
          <button className="text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors text-left">
            Mark all as read
          </button>
        </div>

        <div className="space-y-4">
          {activities.length > 0 ? activities.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl hover:bg-white/[0.08] transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${activity.bgColor} flex items-center justify-center ${activity.iconColor} shrink-0`}>
                  <activity.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                    <span className="font-bold text-white">@{activity.user}</span> {activity.content}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
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