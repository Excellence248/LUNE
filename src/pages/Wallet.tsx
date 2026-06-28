"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import PortfolioChart from '@/components/lune/PortfolioChart';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Shield, PieChart as PieChartIcon, Wallet as WalletIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';

const Wallet = () => {
  const { isConnected, address, balance } = useWallet();

  const tokens = balance > 0 ? [
    { name: 'Solana', symbol: 'SOL', balance: '142.50', value: '$20,235.00', change: '+5.2%', icon: 'S', color: 'text-blue-400' },
    { name: 'Lune Protocol', symbol: 'LUNE', balance: '25,000', value: '$21,000.00', change: '+24.8%', icon: 'L', color: 'text-purple-400' },
    { name: 'Jupiter', symbol: 'JUP', balance: '1,200', value: '$1,344.00', change: '+1.4%', icon: 'J', color: 'text-orange-400' },
    { name: 'USDC', symbol: 'USDC', balance: '5,420', value: '$5,420.00', change: '0.0%', icon: 'U', color: 'text-green-400' },
  ] : [];

  if (!isConnected) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
            <WalletIcon size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-500 mb-8 max-w-md">Connect your wallet to view your portfolio, manage assets, and trade on Lune.</p>
          <Button className="bg-purple-600 hover:bg-purple-500 h-12 px-8 rounded-xl font-bold">Connect Wallet</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-600 to-blue-700 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(147,51,234,0.3)]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                    <Shield size={18} />
                    <span className="text-sm font-bold truncate max-w-[150px] md:max-w-none">{address || 'Not Connected'}</span>
                  </div>
                  <button className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors">
                    <RefreshCw size={20} />
                  </button>
                </div>
                
                <p className="text-white/70 font-medium mb-2">Total Portfolio Value</p>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-10">${balance.toLocaleString()}</h2>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 bg-white text-black h-14 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all">
                    <ArrowUpRight size={20} />
                    Send
                  </button>
                  <button className="flex-1 bg-black/20 backdrop-blur-md text-white border border-white/20 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                    <ArrowDownLeft size={20} />
                    Receive
                  </button>
                </div>
              </div>
            </motion.div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Your Assets</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Live Prices
                </div>
              </div>
              <div className="space-y-4">
                {tokens.length > 0 ? tokens.map((token, i) => (
                  <div key={token.symbol} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg ${token.color}`}>
                        {token.icon}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm md:text-base">{token.name}</p>
                        <p className="text-xs md:text-sm text-gray-500">{token.balance} {token.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white text-sm md:text-base">{token.value}</p>
                      <p className={`text-[10px] md:text-xs font-medium ${token.change.startsWith('+') ? 'text-green-400' : 'text-gray-500'}`}>
                        {token.change}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-gray-500">
                    No assets found in this wallet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <PieChartIcon className="text-purple-400" size={18} />
                Distribution
              </h3>
              {balance > 0 ? (
                <>
                  <PortfolioChart />
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {['LUNE', 'SOL', 'USDC', 'Others'].map((label, i) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-slate-500'][i]}`} />
                        <span className="text-[10px] font-bold text-gray-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-600 text-sm italic">
                  No data to display
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <RefreshCw className="text-purple-400" size={18} />
                Quick Swap
              </h3>
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-xs text-gray-500 mb-2">You Pay</p>
                  <div className="flex justify-between items-center">
                    <input type="text" placeholder="0.00" className="bg-transparent border-none text-xl font-bold w-24 focus:ring-0 text-white" />
                    <button className="bg-white/10 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 text-white">
                      SOL <ArrowDownLeft size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-center -my-2 relative z-10">
                  <button className="w-10 h-10 rounded-full bg-purple-600 border-4 border-[#050505] flex items-center justify-center text-white">
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-xs text-gray-500 mb-2">You Receive</p>
                  <div className="flex justify-between items-center">
                    <input type="text" placeholder="0.00" className="bg-transparent border-none text-xl font-bold w-24 focus:ring-0 text-white" />
                    <button className="bg-white/10 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 text-white">
                      LUNE <ArrowDownLeft size={14} />
                    </button>
                  </div>
                </div>
                <button className="w-full h-14 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold shadow-lg transition-all text-white">
                  Swap Tokens
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Wallet;