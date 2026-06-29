"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Gavel, Sparkles, Image as ImageIcon } from 'lucide-react';

const NFTs = () => {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              NFT Marketplace <Sparkles className="text-yellow-400" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Discover, collect, and auction rare digital artifacts.</p>
          </div>
          <div className="flex gap-4">
            <button className="bg-white text-black px-6 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors w-full md:w-auto">
              Mint NFT
            </button>
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
          <Gavel className="text-purple-500" size={24} />
          Live Auctions
        </h2>

        <div className="py-20 text-center bg-white/5 rounded-[2.5rem] border border-white/10">
          <ImageIcon className="mx-auto mb-4 text-gray-600" size={48} />
          <p className="text-gray-500 font-bold">No active auctions at the moment.</p>
        </div>
      </div>
    </Layout>
  );
};

export default NFTs;