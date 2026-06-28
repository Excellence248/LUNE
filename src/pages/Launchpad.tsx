"use client";

import React, { useState } from 'react';
import Layout from '@/components/lune/Layout';
import { Rocket, Info, ShieldCheck, Zap, ArrowUpRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { useWallet } from '@/context/WalletContext';
import { z } from 'zod';

const Launchpad = () => {
  const { balance, updateBalance } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', symbol: '', description: '' });

  const handleCreate = () => {
    // Define validation schema
    const launchSchema = z.object({
      name: z.string().min(2, "Token name must be at least 2 characters").max(32, "Token name too long"),
      symbol: z.string().min(2, "Symbol must be at least 2 characters").max(10, "Symbol too long").regex(/^[A-Z0-9]+$/, "Symbol must be uppercase alphanumeric"),
      description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description too long")
    });

    const result = launchSchema.safeParse(formData);

    if (!result.success) {
      showError(result.error.errors[0].message);
      return;
    }

    const LAUNCH_FEE = 0.02;
    if (balance < LAUNCH_FEE) {
      showError(`Insufficient SOL for launch fee (${LAUNCH_FEE} SOL).`);
      return;
    }

    setLoading(true);
    // Simulate transaction processing
    setTimeout(() => {
      updateBalance(-LAUNCH_FEE);
      showSuccess(`${formData.name} ($${formData.symbol}) has been launched successfully!`);
      setFormData({ name: '', symbol: '', description: '' });
      setLoading(false);
    }, 2000);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Launchpad <Rocket className="text-purple-500" />
            </h1>
            <p className="text-gray-500 text-sm md:text-base">Create and launch your own memecoin in seconds on Solana.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3 w-fit">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Balance: {balance.toFixed(2)} SOL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold">Token Details</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-400">Token Name</Label>
                  <Input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Moon Rocket" 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-purple-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Symbol</Label>
                  <Input 
                    value={formData.symbol}
                    onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                    placeholder="e.g. MOON" 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-purple-500/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400">Description</Label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all text-white"
                  placeholder="Tell the community why your token is the next big thing..."
                />
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex gap-4">
                <Info className="text-purple-400 shrink-0" size={20} />
                <p className="text-sm text-purple-200/80 leading-relaxed">
                  Launching a token requires a small fee of 0.02 SOL. Liquidity will be automatically generated and locked upon successful funding.
                </p>
              </div>

              <Button 
                onClick={handleCreate}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-lg font-bold rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.3)]"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Create Token"}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="text-green-400" size={18} />
                Lune Safety
              </h3>
              <ul className="space-y-4">
                {['Anti-Rug Protection', 'Auto-Locked Liquidity', 'Verified Contracts', 'Community Audited'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Launchpad;