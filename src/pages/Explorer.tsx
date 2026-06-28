"use client";

import React, { useState, useMemo } from 'react';
import Layout from '@/components/lune/Layout';
import { 
  Search, 
  BarChart3, 
  ArrowUpRight, 
  Filter, 
  Loader2, 
  Globe, 
  Zap, 
  TrendingUp, 
  Star,
  ArrowUpDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTokenData, TokenInfo } from '@/hooks/useTokenData';
import { useNavigate } from 'react-router-dom';

const Explorer = () => {
  const navigate = useNavigate();
  const { tokens, loading } = useTokenData();
  const [activeTab, setActiveTab] = useState<'All' | 'Major' | 'Memecoin'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof TokenInfo; direction: 'asc' | 'desc' } | null>(null);

  const chains = useMemo(() => {
    const uniqueChains = Array.from(new Set(tokens.map(t => t.chain)));
    return ['All', ...uniqueChains];
  }, [tokens]);

  const filteredAndSortedTokens = useMemo(() => {
    let result = tokens.filter(t => {
      const matchesTab = activeTab === 'All' || t.category === activeTab;
      const matchesChain = selectedChain === 'All' || t.chain === selectedChain;
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesChain && matchesSearch;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle numeric strings (like prices/volumes)
        const cleanA = typeof aValue === 'string' ? parseFloat(aValue.replace(/[^0-9.-]/g, '')) : aValue;
        const cleanB = typeof bValue === 'string' ? parseFloat(bValue.replace(/[^0-9.-]/g, '')) : bValue;

        if (cleanA < cleanB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (cleanA > cleanB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tokens, activeTab, selectedChain, searchQuery, sortConfig]);

  const handleSort = (key: keyof TokenInfo) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const trendingTokens = tokens.slice(0, 3);

  return (
    <Layout className="max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-purple-400 font-bold text-sm uppercase tracking-widest">
            <TrendingUp size={16} />
            Live Market Pulse
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Market Explorer
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            Real-time analytics for the most active assets across Solana, Ethereum, and Base.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or symbol..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Trending Section */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {trendingTokens.map((token, i) => (
            <motion.div
              key={token.address + i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(`/token/${token.symbol}`)}
              className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[2rem] p-6 hover:border-purple-500/30 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} />
              </div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                  {token.symbol[0]}
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20">
                  HOT 🔥
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1 group-hover:text-purple-400 transition-colors">{token.name}</h3>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                <span>{token.symbol}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Globe size={12} /> {token.chain}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-mono font-bold">{token.price}</p>
                  <p className="text-green-400 text-sm font-bold">{token.change}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <ArrowUpRight size={20} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {['All', 'Major', 'Memecoin'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab 
                  ? "bg-white text-black shadow-xl" 
                  : "text-gray-500 hover:text-white"
              )}
            >
              {tab}s
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">Filter by Chain:</span>
          {chains.map(chain => (
            <button
              key={chain}
              onClick={() => setSelectedChain(chain)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                selectedChain === chain 
                  ? "bg-purple-500/10 border-purple-500/50 text-purple-400" 
                  : "bg-transparent border-white/10 text-gray-500 hover:border-white/20"
              )}
            >
              {chain}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap size={24} className="text-purple-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white mb-2">Syncing Market Data</p>
            <p className="text-gray-500">Aggregating real-time feeds from multiple DEXs...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-white transition-colors">
                      Token <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Chain</th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('price')} className="flex items-center gap-2 hover:text-white transition-colors">
                      Price <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('change')} className="flex items-center gap-2 hover:text-white transition-colors">
                      24h Change <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('volume')} className="flex items-center gap-2 hover:text-white transition-colors">
                      Volume <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('mcap')} className="flex items-center gap-2 hover:text-white transition-colors">
                      Market Cap <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedTokens.map((token, i) => (
                    <motion.tr 
                      key={token.address + i}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => navigate(`/token/${token.symbol}`)}
                      className="hover:bg-white/[0.03] transition-all cursor-pointer group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-lg",
                            token.category === 'Major' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                          )}>
                            {token.symbol.substring(0, 3)}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{token.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{token.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            token.chain === 'Solana' ? "bg-green-400" : 
                            token.chain === 'Ethereum' ? "bg-blue-400" : "bg-purple-400"
                          )} />
                          <span className="text-xs font-medium text-gray-400">{token.chain}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono font-bold text-sm">{token.price}</td>
                      <td className="px-8 py-6">
                        <div className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold",
                          token.change.startsWith('+') ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {token.change}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-gray-400 text-sm font-mono">{token.volume}</td>
                      <td className="px-8 py-6 text-gray-400 text-sm font-mono">{token.mcap}</td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2.5 bg-white/5 text-gray-500 rounded-xl hover:bg-white/10 hover:text-white transition-all">
                            <Star size={16} />
                          </button>
                          <button className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition-all">
                            <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          {filteredAndSortedTokens.length === 0 && !loading && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium">No tokens found matching your criteria.</p>
              <button 
                onClick={() => { setActiveTab('All'); setSelectedChain('All'); setSearchQuery(''); }}
                className="mt-4 text-purple-400 font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Explorer;