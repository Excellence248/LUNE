"use client";

import { useState, useEffect } from 'react';

export interface TokenInfo {
  name: string;
  symbol: string;
  price: string;
  change: string;
  volume: string;
  mcap: string;
  address: string;
  chain: string;
  category: 'Major' | 'Memecoin';
}

export const useTokenData = () => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarketData = async () => {
    try {
      // 1. Fetch Majors from CoinGecko
      const cgResponse = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h');
      const cgData = await cgResponse.json();
      
      const majors: TokenInfo[] = cgData.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: `$${coin.current_price.toLocaleString()}`,
        change: `${coin.price_change_percentage_24h > 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`,
        volume: `$${(coin.total_volume / 1000000000).toFixed(2)}B`,
        mcap: `$${(coin.market_cap / 1000000000).toFixed(2)}B`,
        address: coin.id,
        chain: 'Mainnet',
        category: 'Major'
      }));

      // 2. Fetch Trending Memes from DexScreener (Solana & Base)
      const dexResponse = await fetch('https://api.dexscreener.com/latest/dex/search?q=solana%20base%20trending');
      const dexData = await dexResponse.json();
      
      const memes: TokenInfo[] = (dexData.pairs || [])
        .slice(0, 15)
        .filter((pair: any) => pair.baseToken.symbol.length < 10) // Filter out some noise
        .map((pair: any) => ({
          name: pair.baseToken.name,
          symbol: pair.baseToken.symbol,
          price: `$${parseFloat(pair.priceUsd).toLocaleString(undefined, { maximumFractionDigits: 8 })}`,
          change: `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24}%`,
          volume: `$${(pair.volume.h24 / 1000000).toFixed(2)}M`,
          mcap: pair.fdv ? `$${(pair.fdv / 1000000).toFixed(2)}M` : 'N/A',
          address: pair.baseToken.address,
          chain: pair.chainId.charAt(0).toUpperCase() + pair.chainId.slice(1),
          category: 'Memecoin'
        }));

      setTokens([...majors, ...memes]);
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  return { tokens, loading };
};