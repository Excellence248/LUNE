"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { useParams } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  Share2, 
  ArrowUpRight, 
  BarChart3,
  PieChart,
  Activity,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import FeedCard from '@/components/lune/FeedCard';
import TradingChart from '@/components/lune/TradingChart';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSingleTokenData } from '@/hooks/useSingleTokenData';
import { useTokenHistory } from '@/hooks/useTokenHistory';
import { Post } from '@/context/SocialContext';

const TokenDetail = () => {
  const { symbol = 'LUNE' } = useParams();
  const { data: tokenData, loading: dataLoading } = useSingleTokenData(symbol);
  
  // Extract numeric price for the history hook
  const numericPrice = tokenData ? parseFloat(tokenData.price.replace(/[^0-9.-]/g, '')) : 0;
  const { history, loading: historyLoading } = useTokenHistory(symbol, numericPrice);

  const relatedPosts: Post[] = [
    {
      id: 'related-1',
      user_id: 'whale-1',
      content: `Just spotted a massive accumulation on $${symbol}. The order book looks incredibly thin on the sell side.`,
      created_at: new Date().toISOString(),
      profiles: { username: 'Solana Whale', avatar_url: '' },
      likes: [],
      reposts: [],
      replies: []
    }
  ];

  if (dataLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="text-gray-500 font-bold">Fetching live market data for {symbol}...</p>
        </div>
      </Layout>
    );
  }

  if (!tokenData) {
    return (
      <Layout>
        <div className="text-center py-32">
          <h2 className="text-2xl font-bold mb-2">Token Not Found</h2>
          <p className="text-gray-500">We couldn't find live data for ${symbol}.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Left Column: Token Info & Chart */}
          <div className="lg:col-span-3 space-y-6 md:space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-10">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-6">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl md:text-3xl font-bold shadow-2xl shrink-0">
                    {symbol[0]}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-4xl font-bold mb-1 truncate">{tokenData.name}</h1>
                    <div className="flex items-center gap-3">
                      <span className="text-xl md:text-2xl font-mono font-bold text-white">{tokenData.price}</span>
                      <span className={cn(
                        "text-sm font-bold",
                        tokenData.change.startsWith('+') ? "text-green-400" : "text-red-400"
                      )}>{tokenData.change}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <Share2 size={20} />
                  </button>
                  <button className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <ShieldCheck className="text-green-400" size={20} />
                  </button>
                </div>
              </div>

              {/* Chart Section */}
              <div className="mb-8 bg-black/40 rounded-[1.5rem] border border-white/5 overflow-hidden min-h-[400px] relative">
                {historyLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                ) : (
                  <TradingChart data={history} symbol={symbol} />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Market Cap', value: tokenData.mcap, icon: BarChart3 },
                  { label: 'Liquidity', value: tokenData.liquidity, icon: Activity },
                  { label: '24h Volume', value: tokenData.volume, icon: Users },
                  { label: 'Sentiment', value: `84%`, icon: Zap },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <stat.icon size={16} className="text-gray-500 mb-2" />
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{stat.label}</p>
                    <p className="text-sm md:text-base font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Sentiment */}
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="text-purple-400" size={20} />
                Social Sentiment
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Bullish Momentum</span>
                    <span className="text-green-400 font-bold">84%</span>
                  </div>
                  <Progress value={84} className="h-3 bg-white/5" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">1.2k</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Mentions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">842</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Alpha Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">12</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Whale Buys</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Alpha */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold px-2">Recent Alpha</h3>
              <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
                {relatedPosts.map((post) => (
                  <FeedCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Trading & Holders */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-[2rem] p-6 md:p-8">
              <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                <Zap className="text-yellow-400" size={20} />
                Quick Trade
              </h3>
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-xs text-gray-500 mb-2">You Pay</p>
                  <div className="flex justify-between items-center">
                    <input type="text" placeholder="0.00" className="bg-transparent border-none text-xl font-bold w-24 focus:ring-0" />
                    <span className="text-sm font-bold text-gray-400">SOL</span>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-xs text-gray-500 mb-2">You Receive</p>
                  <div className="flex justify-between items-center">
                    <input type="text" placeholder="0.00" className="bg-transparent border-none text-xl font-bold w-24 focus:ring-0" readOnly />
                    <span className="text-sm font-bold text-gray-400">{symbol}</span>
                  </div>
                </div>
                <Button className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-lg font-bold rounded-2xl shadow-lg">
                  Swap Now
                </Button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-8">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <PieChart className="text-blue-400" size={18} />
                Holder Distribution
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Top 10 Holders', value: '12.4%', color: 'bg-purple-500' },
                  { label: 'Liquidity Pool', value: '45.2%', color: 'bg-blue-500' },
                  { label: 'Community', value: '42.4%', color: 'bg-green-500' },
                ].map(item => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full", item.color)} style={{ width: item.value }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TokenDetail;