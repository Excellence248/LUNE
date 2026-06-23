"use client";

import React, { useState } from 'react';
import Layout from '@/components/lune/Layout';
import { ArrowRightLeft, ArrowDown, RefreshCw, ShieldCheck, Zap, Globe, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';

const Bridge = () => {
  const { balance, updateBalance } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBridge = () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      updateBalance(numericAmount);
      showSuccess(`Successfully bridged ${numericAmount} ETH to Solana!`);
      setAmount('');
      setLoading(false);
    }, 3000);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center justify-center gap-3">
            Cross-Chain Bridge <ArrowRightLeft className="text-blue-500" />
          </h1>
          <p className="text-gray-500 text-sm md:text-base">Seamlessly move your assets between Solana and other major networks.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">From Network</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500 flex items-center justify-center text-[8px] md:text-[10px] font-bold">ETH</div>
                  <span className="font-bold text-sm md:text-base">Ethereum</span>
                </div>
              </div>
              <div className="bg-black/40 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10">
                <input 
                  type="text" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" 
                  className="bg-transparent border-none text-lg md:text-xl font-bold w-full focus:ring-0 text-white" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">To Network</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-600 flex items-center justify-center text-[8px] md:text-[10px] font-bold">SOL</div>
                  <span className="font-bold text-sm md:text-base">Solana</span>
                </div>
              </div>
              <div className="bg-black/40 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10">
                <input 
                  type="text" 
                  value={amount ? (parseFloat(amount) * 15).toFixed(2) : '0.00'}
                  placeholder="0.00" 
                  className="bg-transparent border-none text-lg md:text-xl font-bold w-full focus:ring-0 text-white" 
                  readOnly 
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleBridge}
            disabled={loading}
            className="w-full h-12 md:h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-base md:text-lg font-bold rounded-xl md:rounded-2xl shadow-lg transition-all"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Initiate Bridge"}
          </button>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Bridge;