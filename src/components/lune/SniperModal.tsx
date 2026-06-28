"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, ShieldCheck, Settings2, Target, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { showSuccess } from '@/utils/toast';

interface SniperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SniperModal = ({ isOpen, onClose }: SniperModalProps) => {
  const [config, setConfig] = useState({
    buyAmount: '0.5',
    slippage: '15',
    priorityFee: '0.001',
    autoSell: true,
    takeProfit: '50',
    stopLoss: '20',
    antiRug: true
  });

  const handleSave = () => {
    showSuccess("Sniper Bot configuration saved and encrypted.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#050505] border-white/10 text-white rounded-[2.5rem] max-w-lg p-8 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            Sniper Configuration <Zap className="text-yellow-400 fill-yellow-400" size={24} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Buy Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} /> Entry Parameters
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Buy Amount (SOL)</Label>
                <Input 
                  value={config.buyAmount}
                  onChange={e => setConfig({...config, buyAmount: e.target.value})}
                  className="bg-white/5 border-white/10 h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Slippage (%)</Label>
                <Input 
                  value={config.slippage}
                  onChange={e => setConfig({...config, slippage: e.target.value})}
                  className="bg-white/5 border-white/10 h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Speed Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} /> Execution Speed
            </h4>
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Priority Fee</p>
                  <p className="text-[10px] text-gray-500">Higher fees = faster inclusion</p>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <input 
                    value={config.priorityFee}
                    onChange={e => setConfig({...config, priorityFee: e.target.value})}
                    className="bg-transparent border-none text-xs font-mono w-16 focus:ring-0 p-0"
                  />
                  <span className="text-[10px] font-bold text-gray-600">SOL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exit Strategy */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={14} /> Exit Strategy
              </h4>
              <Switch 
                checked={config.autoSell}
                onCheckedChange={val => setConfig({...config, autoSell: val})}
              />
            </div>
            
            {config.autoSell && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-green-400">Take Profit (%)</Label>
                  <Input 
                    value={config.takeProfit}
                    onChange={e => setConfig({...config, takeProfit: e.target.value})}
                    className="bg-green-500/5 border-green-500/20 h-11 rounded-xl text-green-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-red-400">Stop Loss (%)</Label>
                  <Input 
                    value={config.stopLoss}
                    onChange={e => setConfig({...config, stopLoss: e.target.value})}
                    className="bg-red-500/5 border-red-500/20 h-11 rounded-xl text-red-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Security */}
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-red-400" size={16} />
                <span className="text-xs font-bold text-red-400">Anti-Rug Protection</span>
              </div>
              <Switch 
                checked={config.antiRug}
                onCheckedChange={val => setConfig({...config, antiRug: val})}
              />
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Automatically front-runs malicious transactions (like liquidity pulls or tax changes) to sell your position before the rug occurs.
            </p>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <Info className="text-gray-500 shrink-0 mt-0.5" size={14} />
              <p className="text-[9px] text-gray-500 leading-relaxed">
                Lune Sniper Bot uses secure delegated signing. Your funds never leave your wallet until a trade is executed. You can revoke access at any time.
              </p>
            </div>
            <Button 
              onClick={handleSave}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-lg font-bold rounded-2xl shadow-lg"
            >
              Save & Activate Bot
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SniperModal;