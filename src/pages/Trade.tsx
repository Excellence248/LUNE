"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/lune/Layout';
import { ArrowDownLeft, RefreshCw, Zap, Activity, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { useWallet } from '@/context/WalletContext';
import { z } from 'zod';

const Trade = () => {
  const { balance, updateBalance } = useWallet();
  const [price, setPrice] = useState(0.8425);
  const [amount, setAmount] = useState('');
  const [isBuying, setIsBuying] = useState(true);
  const [trades, setTrades] = useState([
    { id: 1, type: 'buy', amount: '12.5 SOL', time: '2s ago', price: 0.8425 },
    { id: 2, type: 'sell', amount: '5.2 SOL', time: '5s ago', price: 0.8421 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newPrice = +(price + (Math.random() - 0.45) * 0.001).toFixed(4);
      setPrice(newPrice);
    }, 4000);
    return () => clearInterval(interval);
  }, [price]);

  const handleSwap = () => {
    const numericAmount = parseFloat(amount);
    
    // Define validation schema
    const tradeSchema = z.number()
      .positive("Trade amount must be greater than zero")
      .max(1000000, "Trade amount exceeds maximum platform limit");

    const result = tradeSchema.safeParse(numericAmount);

    if (!result.success) {
      showError(result.error.errors[0].message);
      return;
    }

    if (isBuying && numericAmount > balance) {
      showError("Insufficient SOL balance for this trade.");
      return;
    }

    // Simulate transaction processing
    const change = isBuying ? -numericAmount : numericAmount;
    updateBalance(change);
    
    const newTrade = {
      id: Date.now(),
      type: isBuying ? 'buy' : 'sell',
      amount: `${numericAmount.toFixed(1)} SOL`,
      time: 'Just now',
      price: price
    };

    setTrades(prev => [newTrade, ...prev.slice(0, 9)]);
    showSuccess(`${isBuying ? 'Bought' : 'Sold'} ${numericAmount} SOL worth of LUNE`);
    setAmount('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Sanitize input: only allow numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <Layout noPadding>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3 border-r border-white/5 p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-lg md:text-xl shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                L
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold">Lune Protocol</h2>
                  <span className="text-gray-500 font-mono text-xs md:text-sm">LUNE/SOL</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg md:text-xl font-mono font-bold text-white">${price.toFixed(4)}</span>
                  <span className="text-green-400 text-xs md:text-sm font-bold">+24.8%</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Balance</p>
              <p className="text-sm font-bold text-purple-400">{balance.toLocaleString()} SOL</p>
            </div>
          </div>

          <div className="h-[300px] md:h-[500px] bg-white/[0.02] border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute inset-0 flex items-end p-4 md:p-8 gap-1">
              {[...Array(40)].map((_, i) => (
                <div key={i} className="flex-1 bg-purple-500/20 rounded-t-sm" style={{ height: `${Math.random() * 60 + 20}%` }} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 size={48} className="text-white/5" />
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6">
            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => setIsBuying(true)}
                className={cn("flex-1 py-2.5 rounded-xl font-bold text-sm transition-all", isBuying ? "bg-green-500 text-black" : "bg-white/5 text-gray-500")}
              >
                Buy
              </button>
              <button 
                onClick={() => setIsBuying(false)}
                className={cn("flex-1 py-2.5 rounded-xl font-bold text-sm transition-all", !isBuying ? "bg-red-500 text-black" : "bg-white/5 text-gray-500")}
              >
                Sell
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-gray-500 mb-2">Amount (SOL)</p>
                <input 
                  type="text" 
                  value={amount}
                  onChange={handleInputChange}
                  placeholder="0.00" 
                  className="bg-transparent border-none text-lg md:text-xl font-bold w-full focus:ring-0 text-white" 
                />
              </div>

              <button 
                onClick={handleSwap}
                className={cn(
                  "w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-bold shadow-lg transition-all mt-4 text-white",
                  isBuying ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
                )}
              >
                {isBuying ? 'Buy' : 'Sell'} LUNE
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
              <Activity size={16} className="text-purple-400" />
              Recent Trades
            </h3>
            <div className="space-y-3">
              {trades.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-[10px]">
                  <span className={cn("font-bold", t.type === 'buy' ? 'text-green-400' : 'text-red-400')}>{t.type.toUpperCase()}</span>
                  <span className="font-mono text-white">{t.amount}</span>
                  <span className="text-gray-500">{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Trade;