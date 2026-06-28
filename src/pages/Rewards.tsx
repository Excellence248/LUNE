"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Gift, Sparkles, Zap, ArrowRight, Lock, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const Rewards = () => {
  const rewards = [
    {
      title: "Genesis Airdrop",
      description: "Early adopter reward for participating in the Lune beta phase.",
      amount: "5,000 LUNE",
      status: "Claimable",
      type: "Airdrop",
      color: "from-purple-600 to-blue-600"
    },
    {
      title: "Staking Yield",
      description: "Accumulated rewards from your staked LUNE tokens.",
      amount: "124.50 LUNE",
      status: "Claimable",
      type: "Yield",
      color: "from-green-600 to-emerald-600"
    },
    {
      title: "Alpha Hunter Bonus",
      description: "Reward for maintaining a 90%+ accuracy score this month.",
      amount: "1,000 LUNE",
      status: "Locked",
      type: "Bonus",
      color: "from-orange-600 to-red-600"
    }
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Rewards <Gift className="text-purple-500" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Claim your airdrops, track yield, and unlock exclusive benefits.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-3 flex items-center gap-3 w-fit">
            <Sparkles className="text-yellow-400 w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-bold">Total Earned: 12,450 LUNE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {rewards.map((reward, i) => (
              <motion.div
                key={reward.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 group hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start gap-4 md:gap-6">
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br ${reward.color} flex items-center justify-center shadow-lg shrink-0`}>
                    {reward.status === 'Locked' ? <Lock className="w-5 h-5 md:w-6 md:h-6" /> : <Zap className="w-5 h-5 md:w-6 md:h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                      <h3 className="text-lg md:text-xl font-bold truncate">{reward.title}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${
                        reward.status === 'Claimable' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-500 border border-white/10'
                      }`}>
                        {reward.status}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed max-w-md">{reward.description}</p>
                  </div>
                </div>
                
                <div className="text-left md:text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4">
                  <div>
                    <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold mb-1">Reward Amount</p>
                    <p className="text-xl md:text-2xl font-bold text-white">{reward.amount}</p>
                  </div>
                  <button 
                    disabled={reward.status === 'Locked'}
                    className={`px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold transition-all flex items-center gap-2 text-xs md:text-sm ${
                      reward.status === 'Claimable' 
                        ? 'bg-white text-black hover:bg-gray-200' 
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {reward.status === 'Claimable' ? 'Claim Now' : 'Locked'}
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-600 to-blue-700 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
              <div className="relative z-10">
                <h3 className="font-bold text-lg md:text-xl mb-6">Staking Dashboard</h3>
                <div className="space-y-4 md:space-y-6 mb-8">
                  <div>
                    <p className="text-white/70 text-[10px] md:text-xs font-medium mb-1">Staked Balance</p>
                    <p className="text-2xl md:text-3xl font-bold">25,000 LUNE</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-[10px] md:text-xs font-medium mb-1">Current APR</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-400">12.4%</p>
                  </div>
                </div>
                <button className="w-full bg-white text-black h-12 md:h-14 rounded-xl md:rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm">
                  Manage Stake
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8">
              <h3 className="font-bold mb-6 flex items-center gap-2 text-sm md:text-base">
                <Timer className="text-purple-400 w-4 h-4 md:w-5 md:h-5" />
                Next Milestone
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-xs md:text-sm mb-2">
                  <span className="text-gray-400">Reputation Goal</span>
                  <span className="text-white font-bold">2,450 / 3,000</span>
                </div>
                <Progress value={82} className="h-1.5 md:h-2 bg-white/5" />
                <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed mt-4">
                  Reach 3,000 reputation to unlock the <span className="text-purple-400 font-bold">Elite Alpha Hunter</span> badge and a 5% yield boost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Rewards;