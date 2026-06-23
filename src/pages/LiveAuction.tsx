"use client";

import React, { useState } from 'react';
import Layout from '@/components/lune/Layout';
import { Gavel, Users, MessageSquare, Heart, Share2, Play, Volume2, ShieldCheck, Zap } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { useWallet } from '@/context/WalletContext';
import { z } from 'zod';

const LiveAuction = () => {
  const { balance, isConnected, updateBalance } = useWallet();
  const [bid, setBid] = useState('45.5');
  const [bids, setBids] = useState([
    { user: 'SolWhale', amount: '45.5 SOL', time: 'Just now' },
    { user: 'DegenKing', amount: '44.2 SOL', time: '2m ago' },
    { user: 'AlphaH', amount: '42.0 SOL', time: '5m ago' },
  ]);

  const handlePlaceBid = () => {
    if (!isConnected) {
      showError("Please connect your wallet to place a bid.");
      return;
    }

    const nextBidAmount = parseFloat(bid) + 0.5;
    
    const bidSchema = z.number()
      .positive()
      .max(balance, "Insufficient balance to cover this bid");

    const result = bidSchema.safeParse(nextBidAmount);

    if (!result.success) {
      showError(result.error.errors[0].message);
      return;
    }

    const newBidStr = nextBidAmount.toFixed(1);
    setBid(newBidStr);
    setBids(prev => [{ user: 'You', amount: `${newBidStr} SOL`, time: 'Just now' }, ...prev]);
    showSuccess(`Bid placed: ${newBidStr} SOL`);
  };

  return (
    <Layout noPadding className="h-[calc(100vh-5rem)]">
      <div className="flex h-full overflow-hidden relative flex-col lg:flex-row">
        {/* Video Stream Area */}
        <div className="flex-1 bg-black relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 z-10 pointer-events-none" />
          
          {/* Mock Video Player */}
          <div className="w-full h-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700">
            <div className="relative z-20 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <Play fill="white" size={32} className="ml-1" />
              </div>
              <p className="text-white font-bold tracking-widest uppercase text-sm">Live Stream Paused</p>
            </div>
          </div>

          {/* Overlay Info */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-red-500 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg shadow-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE AUCTION
              </div>
              <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold border border-white/10 flex items-center gap-2">
                <Users size={12} /> 0 Watching
              </div>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-2xl">No Active Auction</h1>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4">
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white">
                <Volume2 size={20} />
              </button>
              <span className="text-xs font-mono text-white/60">00:00:00 remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white">
                <Share2 size={20} />
              </button>
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white">
                <Heart size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Bidding Sidebar */}
        <div className="w-full lg:w-96 border-l border-white/5 bg-[#050505] flex flex-col">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <Gavel className="text-purple-500" size={18} />
                Live Bidding
              </h3>
              <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                <ShieldCheck size={14} /> Verified
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Current Highest Bid</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{bid} SOL</span>
                <span className="text-xs text-gray-500 mb-1">~$0.00</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setBid((parseFloat(bid) + 1).toFixed(1))} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-white/10 transition-all">+1 SOL</button>
                <button onClick={() => setBid((parseFloat(bid) + 5).toFixed(1))} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-white/10 transition-all">+5 SOL</button>
                <button onClick={() => setBid((parseFloat(bid) + 10).toFixed(1))} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-white/10 transition-all">+10 SOL</button>
              </div>
              <Button 
                onClick={handlePlaceBid}
                className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-lg font-bold rounded-2xl shadow-lg shadow-purple-500/20"
              >
                Place Bid
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <h4 className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Bid History</h4>
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {bids.length > 0 ? bids.map((b, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 border border-white/10">
                        <AvatarFallback className="bg-purple-900 text-[10px]">{b.user[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-bold text-white">@{b.user}</p>
                        <p className="text-[10px] text-gray-500">{b.time}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400">{b.amount}</span>
                  </motion.div>
                )) : (
                  <p className="text-center text-gray-600 text-xs py-8">No bids yet.</p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="p-4 border-t border-white/5">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input 
                type="text" 
                placeholder="Send a message..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LiveAuction;