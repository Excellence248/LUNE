"use client";

import { useState, useEffect } from 'react';

export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const useTokenHistory = (symbol: string, currentPrice: number) => {
  const [history, setHistory] = useState<OHLCVData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // For major tokens, try to get real data from Binance
      const majors = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE'];
      if (majors.includes(symbol.toUpperCase())) {
        const binanceSymbol = `${symbol.toUpperCase()}USDT`;
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1h&limit=100`);
        const data = await response.json();
        
        const formattedData = data.map((d: any) => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));
        setHistory(formattedData);
      } else {
        // For memecoins/others, generate a realistic simulated history based on current price
        const data: OHLCVData[] = [];
        const now = Math.floor(Date.now() / 1000);
        let lastClose = currentPrice || 1.0;
        
        for (let i = 100; i > 0; i--) {
          const time = now - (i * 3600); // 1 hour intervals
          const volatility = 0.05; // 5% volatility
          const open = lastClose * (1 + (Math.random() - 0.5) * volatility);
          const close = open * (1 + (Math.random() - 0.5) * volatility);
          const high = Math.max(open, close) * (1 + Math.random() * 0.02);
          const low = Math.min(open, close) * (1 - Math.random() * 0.02);
          
          data.push({ time, open, high, low, close });
          lastClose = close;
        }
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch token history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPrice > 0) {
      fetchHistory();
    }
  }, [symbol, currentPrice]);

  return { history, loading };
};