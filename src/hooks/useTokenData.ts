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
  category: 'Major' | 'DEX';
}

const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}` : 'Unavailable';
const percent = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : 'Unavailable';

export const useTokenData = () => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      const results = await Promise.allSettled([
        (async (): Promise<TokenInfo[]> => {
          const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple&order=market_cap_desc&per_page=5&page=1&sparkline=false');
          if (!response.ok) throw new Error('CoinGecko unavailable');
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('Invalid CoinGecko data');
          return data.filter(coin => typeof coin.id === 'string' && typeof coin.symbol === 'string' && typeof coin.name === 'string').map(coin => ({
            name: coin.name, symbol: coin.symbol.toUpperCase(), price: money(coin.current_price),
            change: percent(coin.price_change_percentage_24h), volume: money(coin.total_volume),
            mcap: money(coin.market_cap), address: coin.id, chain: 'Not specified', category: 'Major',
          }));
        })(),
        (async (): Promise<TokenInfo[]> => {
          const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=solana%20base');
          if (!response.ok) throw new Error('DexScreener unavailable');
          const data = await response.json();
          if (!Array.isArray(data.pairs)) throw new Error('Invalid DexScreener data');
          const seen = new Set<string>();
          return data.pairs.filter((pair: any) => {
            if (!pair.baseToken?.address || !pair.baseToken?.symbol || !pair.chainId) return false;
            const key = `${pair.chainId}:${pair.baseToken.address}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, 15).map((pair: any) => ({
            name: pair.baseToken.name, symbol: pair.baseToken.symbol,
            price: pair.priceUsd ? money(Number(pair.priceUsd)) : 'Unavailable',
            change: percent(pair.priceChange?.h24), volume: money(pair.volume?.h24),
            mcap: money(pair.marketCap), address: pair.baseToken.address,
            chain: pair.chainId, category: 'DEX',
          }));
        })(),
      ]);
      if (!active) return;
      const available = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
      setTokens(available);
      setError(results.some(result => result.status === 'rejected') ? 'One or more market sources are unavailable. Only successfully returned data is shown.' : null);
      setUpdatedAt(available.length ? new Date().toISOString() : null);
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return { tokens, loading, error, updatedAt };
};
