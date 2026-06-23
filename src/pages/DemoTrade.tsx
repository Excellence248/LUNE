"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '@/components/lune/Layout';
import TradingChart from '@/components/lune/TradingChart';
import { 
  TrendingUp, 
  RefreshCw, 
  Zap, 
  Activity, 
  BarChart3, 
  Globe, 
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Wallet,
  TrendingDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { useForexPrices } from '@/hooks/useForexPrices';
import { usePrices } from '@/hooks/usePrices';
import { z } from 'zod';

interface Position {
  id: string;
  pair: string;
  type: 'long' | 'short';
  entryPrice: number;
  amount: number;
  timestamp: number;
  market: 'Crypto' | 'Forex';
}

const DemoTrade = () => {
  const forexPrices = useForexPrices();
  const cryptoPrices = usePrices();
  
  const [marketType, setMarketType] = useState<'Crypto' | 'Forex'>('Crypto');
  const [selectedPair, setSelectedPair] = useState('SOL');
  const [demoBalance, setDemoBalance] = useState(10000);
  const [amount, setAmount] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Get current price for selected pair
  const currentPrice = useMemo(() => {
    if (marketType === 'Forex') return forexPrices[selectedPair]?.price || 0;
    return cryptoPrices.find(p => p.symbol === selectedPair)?.price || 0;
  }, [selectedPair, marketType, forexPrices, cryptoPrices]);

  // Initialize chart data
  useEffect(() => {
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    let lastClose = currentPrice || (marketType === 'Forex' ? 2342 : 140);
    
    for (let i = 100; i > 0; i--) {
      const time = now - (i * 60);
      const open = lastClose + (Math.random() - 0.5) * (lastClose * 0.002);
      const close = open + (Math.random() - 0.5) * (open * 0.002);
      const high = Math.max(open, close) + Math.random() * (open * 0.001);
      const low = Math.min(open, close) - Math.random() * (open * 0.001);
      
      data.push({ time, open, high, low, close });
      lastClose = close;
    }
    setChartData(data);
  }, [selectedPair, marketType]);

  // Live Tick Update
  useEffect(() => {
    if (chartData.length === 0 || !currentPrice) return;

    const lastBar = chartData[chartData.length - 1];
    const now = Math.floor(Date.now() / 1000);
    const currentMinute = Math.floor(now / 60) * 60;

    if (lastBar.time === currentMinute) {
      // Update current bar
      const updatedBar = {
        ...lastBar,
        high: Math.max(lastBar.high, currentPrice),
        low: Math.min(lastBar.low, currentPrice),
        close: currentPrice
      };
      setChartData(prev => [...prev.slice(0, -1), updatedBar]);
    } else if (now >= currentMinute) {
      // New bar
      const newBar = {
        time: currentMinute,
        open: lastBar.close,
        high: Math.max(lastBar.close, currentPrice),
        low: Math.min(lastBar.close, currentPrice),
        close: currentPrice
      };
      setChartData(prev => [...prev, newBar].slice(-200));
    }
  }, [currentPrice]);

  const handleOpenPosition = (type: 'long' | 'short') => {
    const numericAmount = parseFloat(amount);
    
    const tradeSchema = z.number()
      .positive("Amount must be greater than zero")
      .max(demoBalance, "Insufficient demo balance");

    const result = tradeSchema.safeParse(numericAmount);

    if (!result.success) {
      showError(result.error.errors[0].message);
      return;
    }

    const newPosition: Position = {
      id: Math.random().toString(36).substr(2, 9),
      pair: selectedPair,
      type,
      entryPrice: currentPrice,
      amount: numericAmount,
      timestamp: Date.now(),
      market: marketType
    };

    setDemoBalance(prev => prev - numericAmount);
    setPositions(prev => [newPosition, ...prev]);
    showSuccess(`Opened ${type} position for ${selectedPair} at $${currentPrice}`);
    setAmount('');
  };

  const closePosition = (pos: Position) => {
    const pnl = calculatePnL(pos);
    const totalReturn = pos.amount + pnl;
    
    setDemoBalance(prev => prev + totalReturn);
    setPositions(prev => prev.filter(p => p.id !== pos.id));
    setTradeHistory(prev => [{
      ...pos,
      exitPrice: getLivePrice(pos.pair, pos.market),
      pnl,
      closedAt: Date.now()
    }, ...prev.slice(0, 19)]);
    
    showSuccess(`Closed ${pos.pair} position. PnL: $${pnl.toFixed(2)}`);
  };

  const getLivePrice = (pair: string, market: 'Crypto' | 'Forex') => {
    if (market === 'Forex') return forexPrices[pair]?.price || 0;
    return cryptoPrices.find(p => p.symbol === pair)?.price || 0;
  };

  const calculatePnL = (pos: Position) => {
    const livePrice = getLivePrice(pos.pair, pos.market);
    if (!livePrice || !pos.entryPrice) return 0;
    
    const priceDiff = pos.type === 'long' 
      ? (livePrice - pos.entryPrice) 
      : (pos.entryPrice - livePrice);
    
    return (priceDiff / pos.entryPrice) * pos.amount;
  };

  const totalUnrealizedPnL = positions.reduce((acc, pos) => acc + calculatePnL(pos), 0);

  return (
    <Layout noPadding className="h-[calc(100vh-5rem)]">
      <div className="flex flex-col h-full">
        {/* Demo Header */}
        <div className="bg-purple-600/10 border-b border-purple-500/20 p-3 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-600 px-2 py-0.5 rounded text-[10px] font-bold text-white">DEMO TRADING</div>
            <p className="text-xs text-purple-200/80 hidden sm:block">Simulated environment for alpha testing.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Unrealized PnL</span>
              <span className={cn(
                "text-xs font-bold",
                totalUnrealizedPnL >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Equity</span>
              <span className="text-xs font-bold text-white">${(demoBalance + totalUnrealizedPnL).toLocaleString()}</span>
            </div>
            <button onClick={() => { setDemoBalance(10000); setPositions([]); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-purple-400">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
          {/* Left: Chart & Positions */}
          <div className="lg:col-span-3 border-r border-white/5 flex flex-col overflow-hidden">
            {/* Market Selector */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                <button 
                  onClick={() => { setMarketType('Crypto'); setSelectedPair('SOL'); }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    marketType === 'Crypto' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                  )}
                >
                  <Coins size={14} /> Crypto
                </button>
                <button 
                  onClick={() => { setMarketType('Forex'); setSelectedPair('XAU/USD'); }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    marketType === 'Forex' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                  )}
                >
                  <Globe size={14} /> Forex
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[50%]">
                {(marketType === 'Crypto' ? ['SOL', 'BTC', 'ETH', 'LUNE'] : Object.keys(forexPrices)).map(pair => (
                  <button
                    key={pair}
                    onClick={() => setSelectedPair(pair)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all whitespace-nowrap",
                      selectedPair === pair 
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-400" 
                        : "bg-transparent border-white/10 text-gray-500 hover:border-white/20"
                    )}
                  >
                    {pair}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[300px] bg-[#050505] relative">
              <TradingChart data={chartData} symbol={selectedPair} />
            </div>

            {/* Positions Table */}
            <div className="h-48 border-t border-white/5 bg-white/[0.01] flex flex-col">
              <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Open Positions ({positions.length})</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {positions.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#050505] text-gray-600 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="px-6 py-3">Asset</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Size</th>
                        <th className="px-6 py-3">Entry</th>
                        <th className="px-6 py-3">Mark</th>
                        <th className="px-6 py-3">PnL</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {positions.map((pos) => {
                        const pnl = calculatePnL(pos);
                        const livePrice = getLivePrice(pos.pair, pos.market);
                        return (
                          <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-3 font-bold">{pos.pair}</td>
                            <td className="px-6 py-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                pos.type === 'long' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                              )}>
                                {pos.type}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-gray-400">${pos.amount.toLocaleString()}</td>
                            <td className="px-6 py-3 font-mono">${pos.entryPrice.toLocaleString()}</td>
                            <td className="px-6 py-3 font-mono">${livePrice.toLocaleString()}</td>
                            <td className={cn(
                              "px-6 py-3 font-bold",
                              pnl >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button 
                                onClick={() => closePosition(pos)}
                                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                    <Activity size={24} className="opacity-20" />
                    <p className="text-[10px] font-medium">No active positions</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Order Panel */}
          <div className="p-6 space-y-6 bg-white/[0.02] overflow-y-auto custom-scrollbar">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <Zap className="text-purple-400" size={18} />
                  Market Order
                </h3>
                <div className="text-right">
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Available</p>
                  <p className="text-xs font-bold text-white">${demoBalance.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-black/40 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-gray-500 mb-2">Order Size (USD)</p>
                  <div className="flex items-center justify-between">
                    <input 
                      type="text" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00" 
                      className="bg-transparent border-none text-xl font-bold w-full focus:ring-0 text-white" 
                    />
                    <span className="text-xs font-bold text-gray-600">USD</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => handleOpenPosition('long')} 
                    className="h-16 bg-green-600 hover:bg-green-500 font-bold rounded-2xl shadow-lg shadow-green-500/10 flex flex-col items-center justify-center gap-0"
                  >
                    <span className="text-[10px] opacity-70">LONG</span>
                    <ArrowUpRight size={20} />
                  </Button>
                  <Button 
                    onClick={() => handleOpenPosition('short')} 
                    className="h-16 bg-red-600 hover:bg-red-500 font-bold rounded-2xl shadow-lg shadow-red-500/10 flex flex-col items-center justify-center gap-0"
                  >
                    <span className="text-[10px] opacity-70">SHORT</span>
                    <ArrowDownRight size={20} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                <History size={16} className="text-purple-400" />
                Recent History
              </h3>
              <div className="space-y-3">
                {tradeHistory.length > 0 ? tradeHistory.map((t, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-white">{t.pair}</p>
                      <p className={cn("text-[8px] font-bold uppercase", t.type === 'long' ? 'text-green-400' : 'text-red-400')}>
                        {t.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-[10px] font-bold", t.pnl >= 0 ? "text-green-400" : "text-red-400")}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </p>
                      <p className="text-[8px] text-gray-500">Closed</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center">
                    <p className="text-[10px] text-gray-600 italic">No closed trades</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DemoTrade;