"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Trophy, Target, Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const Leaderboard = () => {
  const leaders: any[] = [];

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {leaders.length > 0 ? leaders.slice(0, 3).map((leader, i) => (
            <motion.div
              key={leader.handle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 bg-gradient-to-br ${
                i === 0 ? 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30' : 
                i === 1 ? 'from-gray-400/10 to-gray-600/10 border-gray-400/30' : 
                'from-orange-700/10 to-orange-900/10 border-orange-700/30'
              } text-center group hover:scale-105 transition-all`}
            >
              <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2">
                {i === 0 && <Crown className="text-yellow-500 w-6 h-6 md:w-8 md:h-8" />}
              </div>
              <Avatar className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 border-4 border-[#050505] shadow-2xl">
                <AvatarFallback className="bg-purple-900 text-xl md:text-2xl font-bold">{leader.name[0]}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg md:text-xl font-bold mb-1">{leader.name}</h3>
              <p className="text-gray-500 text-xs md:text-sm mb-6">{leader.handle}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                <div>
                  <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold mb-1">Accuracy</p>
                  <p className="text-base md:text-lg font-bold text-green-400">{leader.accuracy}</p>
                </div>
                <div>
                  <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold mb-1">Profit</p>
                  <p className="text-base md:text-lg font-bold text-white">{leader.profit}</p>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-12 text-center text-gray-500">
              No rankings available yet.
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.02] gap-4">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-3">
              <Target className="text-purple-500 w-5 h-5 md:w-6 md:h-6" />
              Top Performers
            </h2>
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
              {['Daily', 'Weekly', 'Monthly', 'All Time'].map(t => (
                <button key={t} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${t === 'Weekly' ? 'bg-white text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="divide-y divide-white/5 overflow-x-auto">
            <div className="min-w-[600px]">
              {leaders.length > 0 ? leaders.map((leader, i) => (
                <div key={leader.handle} className="p-4 md:p-6 flex items-center gap-4 md:gap-6 hover:bg-white/[0.02] transition-colors group">
                  <span className="w-6 md:w-8 text-xl md:text-2xl font-bold text-gray-700 group-hover:text-purple-500 transition-colors">#{leader.rank}</span>
                  <Avatar className="w-10 h-10 md:w-12 md:h-12 border border-white/10 shrink-0">
                    <AvatarFallback className="bg-purple-900 text-xs md:text-sm">{leader.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm md:text-base truncate">{leader.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 truncate">{leader.handle}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold mb-1">Reputation</p>
                    <p className="font-bold text-purple-400 text-xs md:text-sm">{leader.reputation}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold mb-1">Accuracy</p>
                    <p className="font-bold text-green-400 text-xs md:text-sm">{leader.accuracy}</p>
                  </div>
                  <div className="text-right min-w-[80px] md:min-w-[100px]">
                    <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold mb-1">Profit</p>
                    <p className="font-bold text-white text-xs md:text-sm">{leader.profit}</p>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center text-gray-500">
                  The leaderboard is currently empty.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;