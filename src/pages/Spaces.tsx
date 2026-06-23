"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Radio, Users, Mic2, Plus, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const Spaces = () => {
  const activeSpaces: any[] = [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Live Spaces <Radio className="text-red-500 animate-pulse" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Join live audio discussions and trade alpha in real-time.</p>
          </div>
          <button className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors w-fit">
            <Plus size={20} />
            Start a Space
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeSpaces.length > 0 ? activeSpaces.map((space, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${space.color} p-6 md:p-8 hover:border-white/20 transition-all cursor-pointer`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Users size={16} />
                  {space.listeners}
                </div>
              </div>

              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-purple-400 transition-colors">{space.title}</h3>
              <p className="text-gray-400 mb-6 flex items-center gap-2 text-sm md:text-base">
                <Mic2 size={16} className="text-purple-400" />
                Hosted by <span className="text-white font-medium">@{space.host}</span>
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {space.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#050505] bg-gray-800 flex items-center justify-center text-[10px] font-bold">
                      {n}
                    </div>
                  ))}
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#050505] bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    +1k
                  </div>
                </div>
                <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                  <Play size={20} fill="black" />
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-white/10">
              <Radio className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 font-bold">No live spaces right now. Why not start one?</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Spaces;