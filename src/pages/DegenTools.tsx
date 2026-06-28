"use client";

import React, { useState } from 'react';
import Layout from '@/components/lune/Layout';
import { ShieldAlert, Search, Target, Zap, CheckCircle2, ShieldCheck, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SecurityNotice from '@/components/lune/SecurityNotice';
import SniperModal from '@/components/lune/SniperModal';
import { cn } from '@/lib/utils';

const DegenTools = () => {
  const [isSniperOpen, setIsSniperOpen] = useState(false);
  const [scanAddress, setScanAddress] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleScan = () => {
    if (!scanAddress.trim()) return;
    setIsScanning(true);
    setScanResult(null);

    // Simulate deep contract analysis
    setTimeout(() => {
      const isSafe = Math.random() > 0.3;
      setScanResult({
        safe: isSafe,
        score: isSafe ? 88 : 32,
        checks: [
          { label: 'Mint Authority', status: 'Disabled', safe: true },
          { label: 'Freeze Authority', status: isSafe ? 'Disabled' : 'Enabled', safe: isSafe },
          { label: 'Liquidity Lock', status: isSafe ? '98% Locked' : 'No Lock Found', safe: isSafe },
          { label: 'Top 10 Holders', status: isSafe ? '12% Supply' : '65% Supply', safe: isSafe },
          { label: 'Contract Source', status: 'Verified', safe: true },
        ]
      });
      setIsScanning(false);
    }, 2000);
  };

  const whaleAlerts = [
    { name: 'Solana Whale #1', action: 'Bought 500 SOL of $LUNE', time: '2m ago', icon: '🐋' },
    { name: 'Alpha Hunter X', action: 'Sold 120 SOL of $PEPE', time: '15m ago', icon: '🎯' },
    { name: 'Degen Master', action: 'Bought 2,000 SOL of $SOL', time: '45m ago', icon: '⚡' },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            Degen Tools <ShieldAlert className="text-red-500" />
          </h1>
          <p className="text-gray-500 text-sm md:text-base">Advanced utilities for the sophisticated on-chain hunter.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Rug Check Tool */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                <Search size={20} />
              </div>
              <h2 className="text-xl font-bold">Rug Check</h2>
            </div>
            <p className="text-sm text-gray-500">Instantly audit any Solana token contract for malicious code or hidden mint functions.</p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                value={scanAddress}
                onChange={e => setScanAddress(e.target.value)}
                placeholder="Enter token address..." 
                className="bg-black/40 border-white/10 h-12 rounded-xl focus:ring-red-500/20" 
              />
              <Button 
                onClick={handleScan}
                disabled={isScanning}
                className="h-12 bg-red-600 hover:bg-red-500 px-6 rounded-xl font-bold w-full sm:w-auto shrink-0"
              >
                {isScanning ? <Loader2 className="animate-spin" /> : "Scan"}
              </Button>
            </div>

            <div className="flex-1 min-h-[200px] relative">
              <AnimatePresence mode="wait">
                {isScanning ? (
                  <motion.div 
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                      <Search className="absolute inset-0 m-auto text-red-500" size={24} />
                    </div>
                    <p className="text-xs font-bold text-red-400 animate-pulse">ANALYZING BYTECODE...</p>
                  </motion.div>
                ) : scanResult ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4 pt-4"
                  >
                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between",
                      scanResult.safe ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                    )}>
                      <div className="flex items-center gap-3">
                        {scanResult.safe ? <ShieldCheck className="text-green-400" /> : <AlertTriangle className="text-red-400" />}
                        <div>
                          <p className={cn("font-bold text-sm", scanResult.safe ? "text-green-400" : "text-red-400")}>
                            {scanResult.safe ? "Likely Safe" : "High Risk Detected"}
                          </p>
                          <p className="text-[10px] text-gray-500">Security Score: {scanResult.score}/100</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {scanResult.checks.map((item: any) => (
                        <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-xs text-gray-400">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-bold", item.safe ? "text-white" : "text-red-400")}>{item.status}</span>
                            {item.safe ? <CheckCircle2 size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 opacity-30">
                    <ShieldAlert size={48} />
                    <p className="text-xs font-bold mt-4">READY TO SCAN</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Whale Tracker Tool */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Target size={20} />
              </div>
              <h2 className="text-xl font-bold">Whale Tracker</h2>
            </div>
            <p className="text-sm text-gray-500">Follow the smart money. Get real-time alerts when top traders make a move.</p>
            
            <div className="space-y-4 min-h-[200px] flex flex-col justify-center">
              {whaleAlerts.map((alert, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{alert.icon}</span>
                      <span className="font-bold text-sm group-hover:text-blue-400 transition-colors">{alert.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{alert.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-7">{alert.action}</p>
                </div>
              ))}
            </div>
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-500/20">
              Add Wallet to Track
            </Button>
          </motion.div>
        </div>

        {/* Sniper Bot Section */}
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-3xl rounded-full -mr-32 -mt-32" />
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-3">
                  <Zap className="text-yellow-400" size={24} />
                  Lune Sniper Bot (Beta)
                </h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30 flex items-center gap-1">
                    <ShieldCheck size={10} /> NON-CUSTODIAL
                  </span>
                  <span className="text-xs text-gray-500">Secure Wallet Signing</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-400 mb-6 leading-relaxed max-w-2xl text-sm md:text-base">
              Automate your trading with our high-speed sniper bot. Set your parameters and let Lune execute your trades securely via your connected wallet provider. We use official signing APIs to ensure your funds remain under your control at all times.
            </p>
            
            <SecurityNotice />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setIsSniperOpen(true)}
                className="bg-white text-black h-14 rounded-2xl font-bold px-8 hover:bg-gray-200 transition-all w-full sm:w-auto flex items-center gap-2"
              >
                <ShieldCheck size={18} />
                Configure Secure Bot
              </Button>
              <Button className="bg-white/10 border border-white/10 h-14 rounded-2xl font-bold px-8 hover:bg-white/20 transition-all w-full sm:w-auto">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SniperModal isOpen={isSniperOpen} onClose={() => setIsSniperOpen(false)} />
    </Layout>
  );
};

export default DegenTools;