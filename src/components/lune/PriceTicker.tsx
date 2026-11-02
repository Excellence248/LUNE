"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { usePrices } from '@/hooks/usePrices';

const PriceTicker = () => {
  const prices = usePrices();

  return (
    <div
      title="CoinGecko USD quotes, 24-hour change; requested every 30 seconds"
      className="hidden xl:flex items-center gap-5 h-10 px-4 rounded-full border border-white/[0.07] bg-white/[0.02] overflow-hidden"
    >
      {!prices.length && <span className="text-xs text-white/35">Quotes loading or unavailable</span>}
      {prices.map(p => (
        <div key={p.symbol} className="flex items-center gap-2 whitespace-nowrap font-mono">
          <span className="text-[10px] font-bold text-white/40">{p.symbol}</span>
          <span className="text-xs font-medium text-white">
            ${p.price > 0 ? p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
          </span>
          <span className={cn('text-[10px] font-semibold', p.change >= 0 ? 'text-up' : 'text-down')}>
            {p.change >= 0 ? '▲' : '▼'} {Math.abs(p.change)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default PriceTicker;
