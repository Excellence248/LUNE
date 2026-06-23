"use client";

import React from 'react';
import { ShieldCheck, AlertTriangle, Lock } from 'lucide-react';

const SecurityNotice = () => {
  return (
    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 items-start">
      <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
        <ShieldCheck className="text-red-400" size={20} />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
          Security Protocol <Lock size={14} />
        </h4>
        <p className="text-xs text-red-200/70 leading-relaxed">
          Lune Protocol <span className="font-bold text-white">never</span> asks for your private keys or seed phrases. All transactions, including automated sniper bot executions, are signed securely through your connected wallet provider (Phantom, Solflare, etc.) or via encrypted delegated access.
        </p>
      </div>
    </div>
  );
};

export default SecurityNotice;