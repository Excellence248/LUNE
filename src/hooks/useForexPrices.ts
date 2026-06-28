"use client";

import { useState, useEffect } from 'react';

export interface ForexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  precision: number;
}

export const useForexPrices = () => {
  const [prices, setPrices] = useState<Record<string, ForexData>>({
    'XAU/USD': { symbol: 'XAU/USD', name: 'Gold', price: 2342.50, change: 0.45, precision: 2 },
    'EUR/USD': { symbol: 'EUR/USD', name: 'Euro', price: 1.0842, change: -0.12, precision: 4 },
    'GBP/USD': { symbol: 'GBP/USD', name: 'British Pound', price: 1.2654, change: 0.08, precision: 4 },
    'USD/JPY': { symbol: 'USD/JPY', name: 'Japanese Yen', price: 151.42, change: 0.24, precision: 2 },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const newPrices = { ...prev };
        Object.keys(newPrices).forEach(key => {
          const item = newPrices[key];
          const volatility = key === 'XAU/USD' ? 0.5 : 0.0002;
          const movement = (Math.random() - 0.5) * volatility;
          item.price = +(item.price + movement).toFixed(item.precision);
          item.change = +(item.change + (Math.random() - 0.5) * 0.01).toFixed(2);
        });
        return newPrices;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return prices;
};