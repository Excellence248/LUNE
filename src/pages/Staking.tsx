"use client";

import React, { useState } from 'react';
import Layout from '@/components/lune/Layout';
import { Zap, TrendingUp, ShieldCheck, Lock, ArrowRight, Info, Timer, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';

const Staking = () => {
  const { balance, updateBalance } = useWallet();
  const [stakedAmount, setStakedAmount] = useState(25000);
  const [loading, setLoading] = useState(false);

  const handleStake = () => {
    if (balance < 100) {
      showError("Minimum stake for this tier is 100 SOL.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      updateBalance(-100);
      setStakedAmount(prev => prev + 1000);
      showSuccess("Successfully staked 100 SOL for 1,000 LUNE!");
      setLoading(false);
    }, 1500);
  };

  const handleUnstake = () => {
    if (stakedAmount <= 0) return;
    setLoading(true);
    setTimeout(() => {
      updateBalance(50);
      setStakedAmount(prev => prev - 500);
      showSuccess("Successfully unstaked 500 LUNE!");
      setLoading(false);
    }, 1500);
  };

  const tiers = [
    { name: 'Bronze', apr: '4.2%', min: '0', color: 'bg-orange-700/20 border-orange-700/30' },
    { name: 'Silver', apr: '8.5%', min: '10k', color: 'bg-gray-400/20 border-gray-400/30' },
    { name: 'Gold', apr: '12.4%', min: '25k', color: 'bg-yellow-500/20 border-yellow-500/30', active: true },
    { name: 'Diamond', apr: '18.2%', min: '100k', color: 'bg-blue-400/20 border-blue-400/30' },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Staking <Lock className="text-purple-500" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Stake your LUNE tokens to earn yield and unlock platform benefits.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3 w-fit">
            <Zap className="text-yellow-400" size={18} />
            <span className="text-sm font-bold">Current APR: 12.4%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-600 to-blue-700 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
              <div className="relative z-10">
                <p className="text-white/70 font-medium mb-2">Your Staked Balance</p>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-10">{stakedAmount.toLocaleString()} LUNE</h2>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={handleStake}
                    disabled={loading}
                    className="flex-1 bg-white text-black h-14 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Stake 100 SOL"}
                  </Button>
                  <Button 
                    onClick={handleUnstake}
                    disabled={loading || stakedAmount <= 0}
                    className="flex-1 bg-black/20 backdrop-blur-md text-white border border-white/20 h-14 rounded-2xl font-bold hover:bg-white/10 transition-all"
                  >
                    Unstake 500 LUNE
                  </Button>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {tiers.map((tier) => (
                <div key={tier.name} className={cn(
                  "p-4 rounded-2xl border transition-all",
                  tier.color,
                  tier.active ? "ring-2 ring-purple-500/50" : "opacity-60"
                )}>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{tier.name}</p>
                  <p className="text-lg font-bold text-white">{tier.apr}</p>
                  <p className="text-[8px] text-gray-500 mt-1">Min: {tier.min} LUNE</p>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
              <h3 className="text-xl font-bold mb-6">Yield Earned</h3>
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Rewards</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-400">1,245.50 LUNE</p>
                  </div>
                  <Button onClick={() => showSuccess("Rewards claimed!")} className="h-12 bg-green-600 hover:bg-green-500 rounded-xl font-bold px-8">Claim Rewards</Button>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[65%] bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                </div>
                <p className="text-xs text-gray-500">Next reward distribution in <span className="text-white font-bold">02:14:55</span></p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="text-green-400" size={18} />
                Staking Benefits
              </h3>
              <ul className="space-y-4">
                {[
                  'Governance Voting Power',
                  'Early Access to Launchpad',
                  'Reduced Trading Fees',
                  'Exclusive Alpha Channels',
                  'Priority Support'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Timer className="text-blue-400" size={18} />
                Lock Period
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Staked tokens are subject to a 7-day unbonding period. During this time, you will not earn rewards.
              </p>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
                <Info className="text-blue-400 shrink-0" size={16} />
                <p className="text-[10px] text-blue-200/80">Instant unstaking is available for a 5% fee.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Staking;