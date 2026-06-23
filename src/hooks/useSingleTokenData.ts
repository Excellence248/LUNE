"use client";

import { useState, useEffect } from 'react';

export interface SingleTokenInfo {
  name: string;
  symbol: string;
  price: string;
  change: string;
  mcap: string;
  liquidity: string;
  volume: string;
  pairAddress: string;
  loading: boolean;
}

export const useSingleTokenData = (symbol: string) => {
  const [data, setData] = useState<SingleTokenInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTokenData = async () => {
    try {
      // Search for the pair on Solana/Ethereum/Base
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${symbol}`);
      const result = await response.json();
      
      const pair = result.pairs?.[0]; // Get the most relevant pair
      
      if (pair) {
        setData({
          name: pair.baseToken.name,
          symbol: pair.baseToken.symbol,
          price: `$${parseFloat(pair.priceUsd).toLocaleString(undefined, { maximumFractionDigits: 6 })}`,
          change: `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24}%`,
          mcap: pair.fdv ? `$${(pair.fdv / 1000000).toFixed(2)}M` : 'N/A',
          liquidity: pair.liquidity ? `$${(pair.liquidity.usd / 1000000).toFixed(2)}M` : 'N/A',
          volume: `$${(pair.volume.h24 / 1000000).toFixed(2)}M`,
          pairAddress: pair.pairAddress,
          loading: false
        });
      }
    } catch (error) {
      console.error("Failed to fetch token data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenData();
    const interval = setInterval(fetchTokenData, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  return { data, loading };
};