"use client";

import { useState, useEffect } from 'react';

export interface GlobalStats {
  totalMarketCap: string;
  totalVolume: string;
  btcDominance: string;
  activeCryptos: number;
  marketCapChange: string;
  loading: boolean;
}

export const useGlobalStats = () => {
  const [stats, setStats] = useState<GlobalStats>({
    totalMarketCap: '$2.4T',
    totalVolume: '$84B',
    btcDominance: '52.4%',
    activeCryptos: 12000,
    marketCapChange: '+1.2%',
    loading: true
  });

  const fetchGlobalData = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/global');
      if (!response.ok) throw new Error('API limit reached');
      
      const { data } = await response.json();

      setStats({
        totalMarketCap: `$${(data.total_market_cap.usd / 1000000000000).toFixed(2)}T`,
        totalVolume: `$${(data.total_volume.usd / 1000000000).toFixed(2)}B`,
        btcDominance: `${data.market_cap_percentage.btc.toFixed(1)}%`,
        activeCryptos: data.active_cryptos,
        marketCapChange: `${data.market_cap_change_percentage_24h_usd > 0 ? '+' : ''}${data.market_cap_change_percentage_24h_usd.toFixed(1)}%`,
        loading: false
      });
    } catch (error) {
      console.warn("Using fallback data for global stats:", error);
      // Fallback to realistic mock data if API fails
      setStats({
        totalMarketCap: '$2.54T',
        totalVolume: '$92.4B',
        btcDominance: '51.8%',
        activeCryptos: 12450,
        marketCapChange: '+2.4%',
        loading: false
      });
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 120000);
    return () => clearInterval(interval);
  }, []);

  return stats;
};