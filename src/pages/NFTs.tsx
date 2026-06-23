"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Gavel, Clock, Heart, ExternalLink, Sparkles, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const NFTs = () => {
  const auctions: any[] = [];

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12 md:mb-16">
          {auctions.length > 0 ? auctions.map((nft, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-white/[0.02] hover:border-purple-500/30 transition-all"
            >
              <div className="aspect-square overflow-hidden relative">
                <img src={nft.image} alt={nft.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-white/10 flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" />
                  <span className="text-xs md:text-sm font-mono font-bold">{nft.timeLeft}</span>
                </div>
              </div>
              
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-1">{nft.title}</h3>
                    <p className="text-gray-500 text-sm">by <span className="text-purple-400 font-medium">@{nft.artist}</span></p>
                  </div>
                  <button className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <Heart size={20} />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/5 gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Current Bid</p>
                    <p className="text-xl font-bold text-white">{nft.currentBid}</p>
                  </div>
                  <button className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all w-full sm:w-auto">
                    Place Bid
                  </button>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-[2.5rem] border border-white/10">
              <ImageIcon className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 font-bold">No active auctions at the moment.</p>
            </div>
          )}
        </div>

        <h2 className="text-xl md:text-2xl font-bold mb-6">Trending Collections</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="col-span-full py-12 text-center text-gray-500">
            No collections found.
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NFTs;