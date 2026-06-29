"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Vote, Plus } from 'lucide-react';

const Governance = () => {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Governance <Vote className="text-purple-500" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Shape the future of Lune through decentralized voting.</p>
          </div>
          <button className="bg-white text-black px-6 py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors w-full md:w-auto">
            <Plus size={20} />
            New Proposal
          </button>
        </div>

        <div className="py-20 text-center bg-white/5 rounded-[1.5rem] border border-white/10">
          <Vote className="mx-auto mb-4 text-gray-600" size={48} />
          <p className="text-gray-500 font-bold">No proposals found. Start a discussion to create one!</p>
        </div>
      </div>
    </Layout>
  );
};

export default Governance;