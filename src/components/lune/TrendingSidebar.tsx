"use client";

import React from 'react';
import { TrendingUp, Radio, ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTokenData } from '@/hooks/useTokenData';
import { useNavigate } from 'react-router-dom';

const TrendingSidebar = () => {
  const { tokens, loading } = useTokenData();
  const navigate = useNavigate();
  
  // Get top 4 trending tokens from the real data feed
  const trendingTokens = tokens.slice(0, 4);

  return (
    <aside className="w-80 hidden xl:block p-6 space-y-6 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-purple-400" size={20} />
          <h3 className="font-bold text-white">Trending Alpha</h3>
        </div>
        
        <div className="space-y-5">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-purple-500" size={20} />
            </div>
          ) : trendingTokens.length > 0 ? (
            trendingTokens.map((token) => (
              <div 
                key={token.address} 
                onClick={() => navigate(`/token/${token.symbol}`)}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">{token.name}</p>
                  <p className="text-xs text-gray-500">{token.symbol}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-mono text-white">{token.price}</p>
                  <p className={cn(
                    "text-[10px] font-bold",
                    token.change.startsWith('+') ? "text-green-400" : "text-red-400"
                  )}>{token.change}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-600 text-center py-2">No trending data available</p>
          )}
        </div>
        
        <button 
          onClick={() => navigate('/explorer')}
          className="w-full mt-6 py-2 text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors"
        >
          View all markets
        </button>
      </div>

      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Radio className="text-purple-400" size={20} />
          <h3 className="font-bold text-white">Live Spaces</h3>
        </div>

        <div className="space-y-4">
          <div className="py-8 text-center">
            <Radio className="mx-auto mb-2 text-gray-700" size={24} />
            <p className="text-xs text-gray-600 font-medium">No live spaces right now</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default TrendingSidebar;