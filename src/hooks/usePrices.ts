import { useState, useEffect } from 'react';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
}

export const usePrices = () => {
  const [prices, setPrices] = useState<PriceData[]>([]);

  useEffect(() => {
    let active = true;
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) throw new Error('Price source unavailable');
        const data = await response.json();
        const next = [['bitcoin', 'BTC'], ['ethereum', 'ETH'], ['solana', 'SOL']].flatMap(([id, symbol]) => {
          const quote = data[id];
          return Number.isFinite(quote?.usd) && Number.isFinite(quote?.usd_24h_change)
            ? [{ symbol, price: quote.usd, change: Number(quote.usd_24h_change.toFixed(2)) }]
            : [];
        });
        if (active) setPrices(next);
      } catch {
        if (active) setPrices([]);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return prices;
};
