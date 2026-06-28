"use client";

import { useState, useEffect } from 'react';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
}

export const usePrices = () => {
  const [prices, setPrices] = useState<PriceData[]>([
    { symbol: 'BTC', price: 0, change: 0 },
    { symbol: 'ETH', price: 0, change: 0 },
    { symbol: 'SOL', price: 0, change: 0 },
    { symbol: 'LUNE', price: 0.8425, change: 24.8 },
  ]);

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'
      );
      const data = await response.json();

      setPrices([
        { 
          symbol: 'BTC', 
          price: data.bitcoin.usd, 
          change: parseFloat(data.bitcoin.usd_24h_change.toFixed(2)) 
        },
        { 
          symbol: 'ETH', 
          price: data.ethereum.usd, 
          change: parseFloat(data.ethereum.usd_24h_change.toFixed(2)) 
        },
        { 
          symbol: 'SOL', 
          price: data.solana.usd, 
          change: parseFloat(data.solana.usd_24h_change.toFixed(2)) 
        },
        { 
          symbol: 'LUNE', 
          price: 0.8425, 
          change: 24.8 
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch real-time prices:", error);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return prices;
};