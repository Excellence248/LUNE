import { useState, useEffect } from 'react';

export interface SingleTokenInfo {
  name: string;
  symbol: string;
  price: string;
  change: string;
  mcap: string;
  liquidity: string;
  volume: string;
  pairAddress: string | null;
  source: string;
  updatedAt: string;
  historySymbol: string;
}

const coinIds: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin',
};
const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}` : 'Unavailable';
const change = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : 'Unavailable';

export const useSingleTokenData = (symbol: string, selectedCoinId: string | null, address: string | null, chain: string | null) => {
  const [data, setData] = useState<SingleTokenInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setData(null);
    setLoading(true);
    const fetchToken = async () => {
      try {
        const coinId = selectedCoinId || (!address ? coinIds[symbol.toUpperCase()] : null);
        if (coinId) {
          const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}`);
          if (!response.ok) throw new Error('Token source unavailable');
          const result = await response.json();
          const coin = Array.isArray(result) ? result.find(item => item.id === coinId) : null;
          if (!coin || !Number.isFinite(coin.current_price)) throw new Error('No quote available');
          if (active) setData({
            name: coin.name, symbol: coin.symbol.toUpperCase(), price: money(coin.current_price),
            change: change(coin.price_change_percentage_24h), mcap: money(coin.market_cap),
            volume: money(coin.total_volume), liquidity: 'Unavailable', pairAddress: null,
            source: 'CoinGecko (USD)', updatedAt: new Date().toISOString(),
            historySymbol: coinIds[coin.symbol.toUpperCase()] === coinId ? coin.symbol.toUpperCase() : '',
          });
        } else if (address && chain) {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`);
          if (!response.ok) throw new Error('Token source unavailable');
          const result = await response.json();
          const pair = result.pairs?.find((item: { chainId: string; baseToken: { address: string } }) =>
            item.baseToken.address === address && item.chainId.toLowerCase() === chain.toLowerCase());
          if (!pair || !pair.priceUsd || !Number.isFinite(Number(pair.priceUsd))) throw new Error('No matching pair');
          if (active) setData({
            name: pair.baseToken.name, symbol: pair.baseToken.symbol, price: money(Number(pair.priceUsd)),
            change: change(pair.priceChange?.h24), mcap: money(pair.marketCap),
            liquidity: money(pair.liquidity?.usd), volume: money(pair.volume?.h24),
            pairAddress: pair.pairAddress, source: `DexScreener (${pair.chainId}, ${pair.dexId})`,
            updatedAt: new Date().toISOString(), historySymbol: '',
          });
        }
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchToken();
    const interval = setInterval(fetchToken, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [symbol, selectedCoinId, address, chain]);

  return { data, loading };
};
