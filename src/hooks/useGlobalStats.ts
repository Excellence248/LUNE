import { useState, useEffect } from 'react';

export interface GlobalStats {
  totalMarketCap: string | null;
  totalVolume: string | null;
  btcDominance: string | null;
  activeCryptos: number | null;
  marketCapChange: string | null;
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
}

const unavailable: GlobalStats = {
  totalMarketCap: null, totalVolume: null, btcDominance: null,
  activeCryptos: null, marketCapChange: null, loading: false,
  error: null, updatedAt: null,
};

export const useGlobalStats = () => {
  const [stats, setStats] = useState<GlobalStats>({ ...unavailable, loading: true });

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/global');
        if (!response.ok) throw new Error('Global market source unavailable');
        const { data } = await response.json();
        const values = [data?.total_market_cap?.usd, data?.total_volume?.usd, data?.market_cap_percentage?.btc, data?.active_cryptos, data?.market_cap_change_percentage_24h_usd];
        if (!values.every(Number.isFinite)) throw new Error('Incomplete market data');
        if (active) setStats({
          totalMarketCap: `$${(data.total_market_cap.usd / 1e12).toFixed(2)}T`,
          totalVolume: `$${(data.total_volume.usd / 1e9).toFixed(2)}B`,
          btcDominance: `${data.market_cap_percentage.btc.toFixed(1)}%`,
          activeCryptos: data.active_cryptos,
          marketCapChange: `${data.market_cap_change_percentage_24h_usd > 0 ? '+' : ''}${data.market_cap_change_percentage_24h_usd.toFixed(1)}%`,
          loading: false, error: null, updatedAt: new Date().toISOString(),
        });
      } catch {
        if (active) setStats({ ...unavailable, error: 'CoinGecko market data is unavailable. No fallback values are shown.' });
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 120000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return stats;
};
