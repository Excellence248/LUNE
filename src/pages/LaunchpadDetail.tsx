"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Users, ShieldCheck, Zap, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useParams } from 'react-router-dom';

const LaunchpadDetail = () => {
  const { id } = useParams();
  
  // In a real app, we would fetch this token's data based on the ID
  const token = null; 
  const comments: any[] = [];
  const holders: any[] = [];

  if (!token && id !== 'demo') {
    return (
      <Layout>
        <div className="text-center py-32">
          <h2 className="text-2xl font-bold mb-2">Token Not Found</h2>
          <p className="text-gray-500">This launchpad project does not exist or has been concluded.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column: Token Info & Discussion */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-6">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl md:text-3xl font-bold shadow-2xl shrink-0">
                    ?
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-4xl font-bold mb-1 truncate">Project Name</h1>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-gray-500">
                      <span className="font-mono text-xs md:text-sm">$TICKER</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700 hidden sm:block" />
                      <span className="text-xs md:text-sm truncate">Created by @user</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2.5 md:p-3 bg-white/5 rounded-xl md:rounded-2xl hover:bg-white/10 transition-colors">
                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <button className="p-2.5 md:p-3 bg-white/5 rounded-xl md:rounded-2xl hover:bg-white/10 transition-colors">
                    <ShieldCheck className="text-green-400 w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
              </div>

              <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8">
                No description provided for this project.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: 'Market Cap', value: '$0.0' },
                  { label: 'Holders', value: '0' },
                  { label: 'Liquidity', value: 'Pending' },
                  { label: 'Age', value: 'Just now' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/5">
                    <p className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase mb-1">{stat.label}</p>
                    <p className="text-xs md:text-sm font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Discussion/Comments */}
            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8">
              <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="text-purple-400 w-5 h-5 md:w-6 md:h-6" />
                Community Discussion
              </h3>
              <div className="space-y-6">
                {comments.length > 0 ? comments.map((comment, i) => (
                  <div key={i} className="flex gap-3 md:gap-4">
                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-white/10 shrink-0">
                      <AvatarFallback className="bg-purple-900 text-[10px] md:text-xs">{comment.user[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/5 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs md:text-sm truncate">@{comment.user}</span>
                        <span className="text-[8px] md:text-[10px] text-gray-500 shrink-0">{comment.time}</span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-300 leading-relaxed">{comment.msg}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-gray-600 py-8 text-sm">No comments yet. Be the first to meow!</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Bonding Curve & Buy */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8">
              <h3 className="font-bold text-lg md:text-xl mb-6 flex items-center gap-2">
                <Zap className="text-yellow-400 w-5 h-5 md:w-6 md:h-6" />
                Bonding Curve
              </h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs md:text-sm mb-2">
                    <span className="text-gray-400">Progress to Raydium</span>
                    <span className="text-white font-bold">0%</span>
                  </div>
                  <Progress value={0} className="h-2 md:h-3 bg-white/5" />
                </div>

                <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-[10px] md:text-xs text-purple-200/80 leading-relaxed">
                    When the market cap reaches <span className="font-bold text-white">$69,420</span>, all liquidity will be migrated to Raydium and burned.
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10">
                    <p className="text-[10px] md:text-xs text-gray-500 mb-2">Amount (SOL)</p>
                    <div className="flex justify-between items-center">
                      <input type="text" placeholder="0.0" className="bg-transparent border-none text-lg md:text-xl font-bold w-full focus:ring-0" />
                      <button className="text-[10px] md:text-xs font-bold text-purple-400 shrink-0">MAX</button>
                    </div>
                  </div>
                  <Button className="w-full h-12 md:h-14 bg-purple-600 hover:bg-purple-500 text-base md:text-lg font-bold rounded-xl md:rounded-2xl shadow-lg">
                    Buy Token
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
                <Users className="text-blue-400 w-4 h-4 md:w-5 md:h-5" />
                Top Holders
              </h3>
              <div className="space-y-4">
                {holders.length > 0 ? holders.map((holder, i) => (
                  <div key={i} className="flex items-center justify-between text-xs md:text-sm">
                    <span className="font-mono text-gray-500 truncate mr-4">{holder.addr}</span>
                    <span className="font-bold shrink-0">{holder.pct}</span>
                  </div>
                )) : (
                  <p className="text-center text-gray-600 py-4 text-xs">No holders yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LaunchpadDetail;