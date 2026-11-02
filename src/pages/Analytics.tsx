import Layout from '@/components/lune/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useGlobalStats } from '@/hooks/useGlobalStats';

const Analytics = () => {
  const stats = useGlobalStats();
  const metrics = [
    ['Global Market Cap', stats.totalMarketCap],
    ['24h Global Volume', stats.totalVolume],
    ['BTC Dominance', stats.btcDominance],
    ['Active Cryptocurrencies', stats.activeCryptos?.toLocaleString()],
    ['24h Market Cap Change', stats.marketCapChange],
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">Market Analytics</h1>
          <p className="text-gray-400">Global cryptocurrency statistics from CoinGecko, requested every two minutes. These are not Solana network health metrics.</p>
          {stats.updatedAt && <p className="text-xs text-gray-500">Retrieved {new Date(stats.updatedAt).toLocaleString()}</p>}
        </div>
        {stats.loading ? <p className="text-gray-400" role="status">Loading market data…</p> : stats.error ? (
          <p className="text-gray-400" role="alert">{stats.error}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {metrics.map(([label, value]) => (
              <Card key={label} className="bg-white/5 border-white/10 text-white rounded-2xl">
                <CardContent className="p-6 space-y-2">
                  <p className="text-sm text-gray-400">{label}</p>
                  <p className="text-2xl font-semibold">{value ?? 'Unavailable'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Card className="bg-white/5 border-white/10 text-white rounded-2xl">
          <CardContent className="p-6 space-y-2">
            <h2 className="font-semibold">Additional analytics unavailable</h2>
            <p className="text-gray-400 text-sm">Network health, market-cap history, ecosystem rankings, and sentiment do not have connected data sources. No estimates or sample charts are shown.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Analytics;
