"use client";

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrices } from '@/hooks/usePrices';

const PriceTicker = () => {
  const prices = usePrices();

  return (
    <div className="hidden xl:flex items-center gap-6 px-4 py-1 bg-white/5 rounded-full border border-white/10 overflow-hidden">
      {prices.map((p) => (
        <div key={p.symbol} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] font-bold text-gray-500">{p.symbol}</span>
          <span className="text-xs font-mono font-bold text-white">
            ${p.price > 0 ? p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
          </span>
          <span className={cn(
            "text-[10px] font-bold flex items-center",
            p.change >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {p.change >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
            {Math.abs(p.change)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default PriceTicker;