"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Vote, CheckCircle2, XCircle, Clock, Users, ArrowRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const Governance = () => {
  const proposals: any[] = [];

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total Proposals</p>
            <p className="text-2xl md:text-3xl font-bold">0</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Active Votes</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-400">0</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Your Voting Power</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-400">0 LUNE</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg md:text-xl font-bold">Recent Proposals</h2>
          {proposals.length > 0 ? proposals.map((proposal, i) => (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 hover:border-purple-500/30 transition-all group cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] md:text-xs font-mono text-purple-400 font-bold">{proposal.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${
                      proposal.status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold group-hover:text-purple-400 transition-colors">{proposal.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Users size={14} /> by @{proposal.author}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {proposal.timeLeft}</span>
                  </div>
                </div>
                <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all shrink-0">
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-2xl">
                {proposal.description}
              </p>

              <div className="space-y-4">
                <div className="flex justify-between text-xs md:text-sm font-bold">
                  <span className="text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> For: {proposal.votes.for}%</span>
                  <span className="text-red-400 flex items-center gap-2"><XCircle className="w-4 h-4 md:w-5 md:h-5" /> Against: {proposal.votes.against}%</span>
                </div>
                <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-500" style={{ width: `${proposal.votes.for}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${proposal.votes.against}%` }} />
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="py-20 text-center bg-white/5 rounded-[1.5rem] border border-white/10">
              <Vote className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 font-bold">No proposals found. Start a discussion to create one!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Governance;