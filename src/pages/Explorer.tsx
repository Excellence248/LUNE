"use client";

import React, { useState, useMemo } from 'react';
import Layout from '@/components/lune/Layout';
import { Search, ArrowUpRight, Globe, TrendingUp, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, changeClass } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/lune/Brand';
import { useTokenData, TokenInfo } from '@/hooks/useTokenData';
import { useNavigate } from 'react-router-dom';

const Explorer = () => {
  const navigate = useNavigate();
  const { tokens, loading, error, updatedAt } = useTokenData();
  const [activeTab, setActiveTab] = useState<'All' | 'Major' | 'DEX'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof TokenInfo; direction: 'asc' | 'desc' } | null>(null);

  const openToken = (token: TokenInfo) => {
    const query = token.category === 'Major'
      ? `coinId=${encodeURIComponent(token.address)}`
      : `address=${encodeURIComponent(token.address)}&chain=${encodeURIComponent(token.chain)}`;
    navigate(`/token/${encodeURIComponent(token.symbol)}?${query}`);
  };

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

  const featured = tokens.slice(0, 3);
  const th = 'px-5 py-4 text-[11px] font-semibold text-white/35 uppercase tracking-wider';
  const SortBtn = ({ k, children }: { k: keyof TokenInfo; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(k)}
      className={cn('flex items-center gap-1.5 uppercase tracking-wider hover:text-white transition-colors', sortConfig?.key === k && 'text-lune-300')}
    >
      {children} <ArrowUpDown size={12} />
    </button>
  );

  return (
    <Layout className="max-w-7xl">
      <PageHeader
        eyebrow="Markets"
        icon={TrendingUp}
        title="Market Explorer"
        description="Selected major assets from CoinGecko and token search results from DexScreener, refreshed every minute. This is not a trending or performance ranking."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or symbol…"
              aria-label="Search tokens"
              className="lune-input py-3 pl-11 pr-4"
            />
          </div>
        }
      />
      {(updatedAt || error) && (
        <div className="-mt-4 mb-8 flex flex-wrap items-center gap-3 text-xs">
          {updatedAt && (
            <span className="inline-flex items-center gap-2 text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Retrieved {new Date(updatedAt).toLocaleString()}
            </span>
          )}
          {error && <span className="text-amber-300" role="alert">{error}</span>}
        </div>
      )}

      {/* Featured */}
      {!loading && featured.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {featured.map((token, i) => (
            <motion.button
              key={token.address + i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => openToken(token)}
              className="lune-card lune-card-hover text-left p-5 group relative overflow-hidden"
            >
              <div aria-hidden className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-lune-500/15 blur-2xl group-hover:bg-lune-500/25 transition-colors" />
              <div className="relative flex items-center justify-between mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 h-11 w-11 rounded-2xl bg-lune-500/15 border border-lune-400/20 flex items-center justify-center font-mono text-xs font-bold text-lune-200">
                    {token.symbol.slice(0, 3)}
                  </span>
                  <div className="min-w-0">
                    <p title={token.name} className="font-display font-semibold truncate group-hover:text-lune-200 transition-colors">{token.name}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1.5 min-w-0">
                      <span className="truncate max-w-[8rem]">{token.symbol}</span>
                      <span className="text-white/20">•</span>
                      <Globe size={11} className="shrink-0" />
                      <span className="truncate">{token.chain}</span>
                    </p>
                  </div>
                </div>
                <ArrowUpRight size={18} className="shrink-0 text-white/30 group-hover:text-lune-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <div className="relative flex items-end justify-between">
                <p className="text-2xl font-mono font-medium truncate">{token.price}</p>
                <p className={cn('text-sm font-mono font-medium', changeClass(token.change))}>{token.change}</p>
              </div>
              <p className="relative mt-3 text-[10px] uppercase tracking-wider text-white/25">
                via {token.category === 'Major' ? 'CoinGecko' : 'DexScreener'}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex gap-1 p-1 rounded-full border border-white/[0.07] bg-white/[0.02] w-fit">
          {(['All', 'Major', 'DEX'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-5 h-9 rounded-full text-sm font-semibold transition-all',
                activeTab === tab ? 'bg-white text-black' : 'text-white/50 hover:text-white'
              )}
            >
              {tab === 'All' ? 'All' : tab === 'Major' ? 'Majors' : 'DEX'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {chains.map(chain => (
            <button
              key={chain}
              onClick={() => setSelectedChain(chain)}
              className={cn(
                'px-3.5 h-8 rounded-full text-xs font-semibold border transition-all whitespace-nowrap',
                selectedChain === chain
                  ? 'bg-lune-500/15 border-lune-400/40 text-lune-200'
                  : 'border-white/[0.08] text-white/45 hover:text-white hover:border-white/20'
              )}
            >
              {chain === 'All' ? 'All chains' : chain}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="lune-card divide-y divide-white/[0.05]" role="status" aria-label="Loading market data">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-[68px] px-5 flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-white/[0.05]" />
              <div className="h-3 w-40 rounded-full bg-white/[0.05]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="lune-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[860px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className={th}><SortBtn k="name">Token</SortBtn></th>
                  <th className={th}>Chain</th>
                  <th className={th}><SortBtn k="price">Price</SortBtn></th>
                  <th className={th}><SortBtn k="change">24h</SortBtn></th>
                  <th className={th}><SortBtn k="volume">Volume</SortBtn></th>
                  <th className={th}><SortBtn k="mcap">Market cap</SortBtn></th>
                  <th className={cn(th, 'w-12')} aria-label="Open" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedTokens.map((token, i) => (
                    <motion.tr
                      key={token.address + i}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => openToken(token)}
                      className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center font-mono font-bold text-[10px] border',
                              token.category === 'Major'
                                ? 'bg-sky-400/10 border-sky-400/15 text-sky-300'
                                : 'bg-lune-500/10 border-lune-400/15 text-lune-200'
                            )}
                          >
                            {token.symbol.substring(0, 3)}
                          </span>
                          <div className="min-w-0 max-w-[260px]">
                            <p title={token.name} className="font-semibold text-sm truncate group-hover:text-lune-200 transition-colors">{token.name}</p>
                            <p className="text-xs text-white/35 font-mono truncate">{token.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              token.chain === 'Solana' ? 'bg-emerald-400' : token.chain === 'Ethereum' ? 'bg-sky-400' : 'bg-lune-400'
                            )}
                          />
                          {token.chain}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm">{token.price}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn('font-mono text-sm', changeClass(token.change))}>{token.change}</span>
                      </td>
                      <td className="px-5 py-3.5 text-white/50 text-sm font-mono">{token.volume}</td>
                      <td className="px-5 py-3.5 text-white/50 text-sm font-mono">{token.mcap}</td>
                      <td className="px-5 py-3.5 text-right">
                        <ArrowUpRight
                          size={16}
                          aria-label={`View ${token.name} market data`}
                          className="inline text-white/25 group-hover:text-lune-300 transition-colors"
                        />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredAndSortedTokens.length === 0 && (
            <EmptyState icon={Search} title="No tokens match">
              <button
                onClick={() => {
                  setActiveTab('All');
                  setSelectedChain('All');
                  setSearchQuery('');
                }}
                className="text-lune-300 font-semibold hover:underline"
              >
                Clear all filters
              </button>
            </EmptyState>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Explorer;
