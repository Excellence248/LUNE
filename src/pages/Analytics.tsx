"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { 
  Activity, 
  Zap, 
  DollarSign, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2,
  Globe,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Waves
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { cn } from '@/lib/utils';
import MarketCapChart from '@/components/lune/MarketCapChart';
import EcosystemDominanceChart from '@/components/lune/EcosystemDominanceChart';

const Analytics = () => {
  const { totalMarketCap, totalVolume, btcDominance, activeCryptos, marketCapChange, loading } = useGlobalStats();

  const stats = [
    { 
      label: 'Global Market Cap', 
      value: totalMarketCap || '---', 
      change: marketCapChange || '0%', 
      isPositive: marketCapChange ? !marketCapChange.startsWith('-') : true, 
      icon: DollarSign, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: '24h Global Volume', 
      value: totalVolume || '---', 
      change: '+4.2%', 
      isPositive: true, 
      icon: Activity, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    { 
      label: 'BTC Dominance', 
      value: btcDominance || '---', 
      change: '-0.4%', 
      isPositive: false, 
      icon: PieChart, 
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    { 
      label: 'Active Assets', 
      value: activeCryptos?.toLocaleString() || '---', 
      change: '+12', 
      isPositive: true, 
      icon: Zap, 
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
  ];

  const networkStats = [
    { label: 'Current TPS', value: '2,842', status: 'Optimal', icon: Zap },
    { label: 'Network Ping', value: '420ms', status: 'Stable', icon: Globe },
    { label: 'Active Validators', value: '1,842', status: 'Secure', icon: ShieldCheck },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
              <BarChart3 size={14} />
              Market Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Ecosystem Analytics
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl">
              Deep-dive into real-time network health, capital flows, and sector performance across the Solana ecosystem.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold">Live Network Feed</span>
          </div>
        </div>

        {/* Global Stats Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            <p className="text-gray-500 font-medium">Aggregating global market data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-white/20 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon size={80} />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", stat.bgColor, stat.color)}>
                    <stat.icon size={24} />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
                    stat.isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {stat.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.change}
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Network Health & Market Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Solana Network Pulse */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <Waves className="text-blue-400" />
                Solana Network Pulse
              </h3>
              <span className="text-xs font-mono text-gray-500">Epoch 642</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {networkStats.map((n) => (
                <div key={n.label} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <n.icon size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{n.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{n.value}</p>
                  <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={10} /> {n.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase tracking-widest">Network Load</span>
                <span className="text-blue-400">42% Capacity</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '42%' }}
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                />
              </div>
            </div>
          </div>

          {/* Market Cap Trend */}
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <TrendingUp className="text-purple-400" />
              Market Cap Trend
            </h3>
            <MarketCapChart />
            <div className="pt-4">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Real-time tracking of the total cryptocurrency market capitalization. Data aggregated from multiple global exchanges.
              </p>
            </div>
          </div>
        </div>

        {/* Ecosystem Dominance */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <PieChart className="text-purple-400" />
            Ecosystem Dominance
          </h3>
          <EcosystemDominanceChart />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Top Gainer</p>
              <p className="text-sm font-bold text-green-400">LUNE (+24.8%)</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Top Volume</p>
              <p className="text-sm font-bold text-blue-400">SOL ($1.2B)</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const CheckCircle2 = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default Analytics;