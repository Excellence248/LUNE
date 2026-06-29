"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Trophy, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const Leaderboard = () => {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full">
        <div className="text-center mb-12 md:mb-16">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-600 shadow-[0_0_40px_rgba(234,179,8,0.3)] mb-6"
          >
            <Trophy className="text-white w-8 h-8 md:w-10 md:h-10" />
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Alpha Leaderboard</h1>
          <p className="text-gray-500 text-sm md:text-lg max-w-2xl mx-auto">The top hunters and traders shaping the Solana ecosystem.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.02] gap-4">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-3">
              <Target className="text-purple-500 w-5 h-5 md:w-6 md:h-6" />
              Top Performers
            </h2>
          </div>
          
          <div className="py-20 text-center text-gray-500">
            The leaderboard is currently empty. Start trading to rank up!
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;