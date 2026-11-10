import { useState, useEffect } from 'react';

export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const useTokenHistory = (symbol: string) => {
  const [history, setHistory] = useState<OHLCVData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setHistory([]);
    const majors = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE'];
    if (!majors.includes(symbol.toUpperCase())) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchHistory = async () => {
      try {
        // Binance's public market-data mirror first (reachable from more networks), then the main host.
        const query = `/api/v3/klines?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT&interval=1h&limit=100`;
        let response: Response | null = null;
        for (const host of ['https://data-api.binance.vision', 'https://api.binance.com']) {
          try {
            const attempt = await fetch(`${host}${query}`);
            if (attempt.ok) { response = attempt; break; }
          } catch { /* try the next host */ }
        }
        if (!response) throw new Error('History unavailable');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid price history');
        const candles: OHLCVData[] = data.map((row: (string | number)[]) => ({
          time: Number(row[0]) / 1000, open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]),
        }));
        if (!candles.every(row => Object.values(row).every(Number.isFinite))) throw new Error('Invalid candles');
        if (active) setHistory(candles);
      } catch {
        if (active) setHistory([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchHistory();
    return () => { active = false; };
  }, [symbol]);

  return { history, loading };
};
