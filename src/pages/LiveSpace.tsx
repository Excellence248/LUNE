"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Mic, MicOff, Users, MessageSquare, Heart, Share2, Hand, LogOut, Zap, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const LiveSpace = () => {
  const [showChat, setShowChat] = React.useState(false);

  const speakers = [
    { name: 'SolanaLegend', role: 'Host', avatar: '', isMuted: false },
    { name: 'DegenKing', role: 'Speaker', avatar: '', isMuted: true },
    { name: 'AlphaHunter', role: 'Speaker', avatar: '', isMuted: false },
    { name: 'CryptoDev', role: 'Speaker', avatar: '', isMuted: false },
  ];

  const listeners = Array.from({ length: 12 }, (_, i) => ({
    name: `Listener ${i + 1}`,
    avatar: ''
  }));

  return (
    <Layout noPadding className="h-[calc(100vh-5rem)]">
      <div className="flex h-full overflow-hidden relative">
        {/* Main Audio Area */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-bold border border-red-500/30 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </div>
                  <span className="text-gray-500 text-xs md:text-sm flex items-center gap-2">
                    <Users size={14} /> 1,242 listening
                  </span>
                </div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Solana Summer Alpha ☀️</h1>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className="lg:hidden bg-white/5 text-white p-3 rounded-xl border border-white/10"
                >
                  <MessageSquare size={20} />
                </button>
                <button className="bg-red-500/10 text-red-400 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 hover:bg-red-500/20 transition-colors text-sm">
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Leave Space</span>
                </button>
              </div>
            </div>

            <div className="mb-12">
              <h3 className="text-gray-500 font-bold uppercase text-[10px] md:text-xs tracking-widest mb-6">Speakers</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8">
                {speakers.map((speaker, i) => (
                  <motion.div
                    key={speaker.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center group"
                  >
                    <div className="relative inline-block mb-4">
                      <Avatar className={`w-20 h-20 md:w-24 md:h-24 border-4 ${speaker.isMuted ? 'border-white/5' : 'border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)]'} rounded-[1.5rem] md:rounded-[2rem]`}>
                        <AvatarFallback className="bg-purple-900 text-lg md:text-xl font-bold">{speaker.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center border-2 md:border-4 border-[#050505] ${speaker.isMuted ? 'bg-gray-800' : 'bg-purple-600'}`}>
                        {speaker.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                      </div>
                    </div>
                    <p className="font-bold text-white text-sm md:text-base truncate">{speaker.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-500">{speaker.role}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-gray-500 font-bold uppercase text-[10px] md:text-xs tracking-widest mb-6">Listeners</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 md:gap-6">
                {listeners.map((listener, i) => (
                  <div key={i} className="text-center">
                    <Avatar className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 border border-white/10 rounded-lg md:rounded-xl">
                      <AvatarFallback className="bg-white/5 text-[8px] md:text-[10px]">{i + 1}</AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-gray-500">
                  +1.2k
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Space Chat Sidebar */}
        <div className={cn(
          "fixed inset-y-0 right-0 w-full sm:w-80 bg-[#050505] border-l border-white/5 flex flex-col z-50 transition-transform duration-300 lg:relative lg:translate-x-0 lg:bg-white/[0.01]",
          showChat ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
              <MessageSquare className="text-purple-400 w-4 h-4 md:w-5 md:h-5" />
              Live Chat
            </h3>
            <button 
              onClick={() => setShowChat(false)}
              className="p-2 text-gray-500 hover:text-white lg:hidden"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
            {[
              { user: 'Degen1', msg: 'What do you think about $LUNE?' },
              { user: 'SolWhale', msg: 'Bullish on the bonding curve.' },
              { user: 'AlphaH', msg: 'Check the chart now!' },
              { user: 'DevCat', msg: 'Meow meow meow' },
            ].map((chat, i) => (
              <div key={i} className="text-xs md:text-sm">
                <span className="font-bold text-purple-400">@{chat.user}: </span>
                <span className="text-gray-300">{chat.msg}</span>
              </div>
            ))}
          </div>

          <div className="p-4 md:p-6 border-t border-white/5 space-y-4">
            <div className="flex gap-2">
              <button className="flex-1 h-10 md:h-12 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <Hand size={18} />
              </button>
              <button className="flex-1 h-10 md:h-12 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <Heart size={18} />
              </button>
              <button className="flex-1 h-10 md:h-12 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <Share2 size={18} />
              </button>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Say something..." 
                className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl py-2.5 md:py-3 px-4 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 rounded-lg">
                <Zap size={12} fill="white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LiveSpace;