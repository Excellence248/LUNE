"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Users, Lock, Globe, Zap, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Communities = () => {
  const communities: any[] = [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Communities <Users className="text-purple-500" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Join decentralized groups and token-gated alpha circles.</p>
          </div>
          <button className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/10 transition-colors w-fit text-white">
            <Zap size={20} className="text-yellow-400" />
            Create Community
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communities.length > 0 ? communities.map((community, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-gradient-to-br ${community.color} p-6 md:p-8 hover:border-purple-500/30 transition-all cursor-pointer`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 flex items-center justify-center text-xl md:text-2xl font-bold border border-white/10 text-white">
                  {community.image}
                </div>
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold border border-white/10 text-white">
                  {community.type === 'Public' ? <Globe size={12} /> : <Lock size={12} className="text-purple-400" />}
                  {community.type.toUpperCase()}
                </div>
              </div>

              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-purple-400 transition-colors text-white">{community.name}</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                {community.description}
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Members</p>
                    <p className="text-sm font-bold text-white">{community.members}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Requirement</p>
                    <p className="text-sm font-bold text-purple-400">{community.requirement}</p>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-[2.5rem] border border-white/10">
              <Users className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 font-bold">No communities found. Be the first to create one!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Communities;