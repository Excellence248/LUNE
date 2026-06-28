"use client";

import React from 'react';
import Layout from '@/components/lune/Layout';
import { Briefcase, DollarSign, MapPin, Clock, Filter, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const Jobs = () => {
  const jobs: any[] = [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Web3 Jobs <Briefcase className="text-blue-500" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Find your next opportunity in the decentralized economy.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Search roles..." 
                className="w-full md:w-64 bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white"
              />
            </div>
            <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-white">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {jobs.length > 0 ? jobs.map((job, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-blue-500/30 hover:bg-white/[0.07] transition-all cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xl shrink-0">
                    {job.company[0]}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold group-hover:text-blue-400 transition-colors text-white">{job.title}</h3>
                    <p className="text-gray-400 font-medium text-sm md:text-base">{job.company}</p>
                    <div className="flex flex-wrap gap-3 md:gap-4 mt-3 text-xs md:text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <DollarSign size={14} className="text-green-400" />
                        {job.salary}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        {job.type}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {job.posted}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-3">
                  <div className="hidden sm:flex gap-2">
                    {job.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all w-full md:w-auto">
                    Apply Now
                  </button>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-white/10">
              <Briefcase className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 font-bold">No job listings available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;