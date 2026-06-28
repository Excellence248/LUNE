"use client";

import React, { useState } from 'react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import CreatePost from '@/components/lune/CreatePost';
import TrendingSidebar from '@/components/lune/TrendingSidebar';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { motion } from 'framer-motion';
import { Sparkles, Rocket, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';
import { showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const { posts, refreshFeed } = useSocial();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFeed();
    setIsRefreshing(false);
    showSuccess("Feed updated with latest alpha!");
  };

  return (
    <Layout noPadding className="flex flex-col lg:flex-row">
      <div className="flex-1 border-r border-white/5 w-full lg:max-w-3xl">
        {/* Feed Header with Refresh */}
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <h2 className="text-xl font-bold tracking-tight">Alpha Feed</h2>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-purple-400 disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <RefreshCw size={20} />
            )}
          </button>
        </div>

        <div className="p-4 md:p-6 border-b border-white/5 grid grid-cols-3 gap-2 md:gap-4">
          <button 
            onClick={() => navigate('/launchpad')}
            className="flex flex-col items-center justify-center gap-1.5 p-2 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-600/10 to-transparent border border-purple-500/10 hover:border-purple-500/30 transition-all group text-center"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Rocket size={16} />
            </div>
            <span className="text-[9px] md:text-xs font-bold text-gray-300">Launch</span>
          </button>
          <button 
            onClick={() => navigate('/communities')}
            className="flex flex-col items-center justify-center gap-1.5 p-2 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/10 hover:border-blue-500/30 transition-all group text-center"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Sparkles size={16} />
            </div>
            <span className="text-[9px] md:text-xs font-bold text-gray-300">Alpha</span>
          </button>
          <button 
            onClick={() => navigate('/demo-trade')}
            className="flex flex-col items-center justify-center gap-1.5 p-2 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-green-600/10 to-transparent border border-green-500/10 hover:border-green-500/30 transition-all group text-center"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
              <Zap size={16} />
            </div>
            <span className="text-[9px] md:text-xs font-bold text-gray-300">Trade</span>
          </button>
        </div>

        <CreatePost />

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="divide-y divide-white/5"
        >
          {posts.map((post) => (
            <FeedCard key={post.id} {...post} />
          ))}
        </motion.div>

        <div className="py-8 lg:hidden">
          <MadeWithDyad />
        </div>
      </div>

      <TrendingSidebar />
    </Layout>
  );
};

export default Index;