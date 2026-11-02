import Layout from '@/components/lune/Layout';
import { PageHeader, EmptyState } from '@/components/lune/Brand';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { PieChart, DollarSign, Activity, Bitcoin, Layers, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const Analytics = () => {
  const stats = useGlobalStats();
  const change = stats.marketCapChange;
  const changeUp = typeof change === 'string' ? !change.trim().startsWith('-') : undefined;

  const metrics = [
    { label: 'Global market cap', value: stats.totalMarketCap, icon: DollarSign },
    { label: '24h global volume', value: stats.totalVolume, icon: Activity },
    { label: 'BTC dominance', value: stats.btcDominance, icon: Bitcoin },
    { label: 'Active cryptocurrencies', value: stats.activeCryptos?.toLocaleString(), icon: Layers },
    { label: '24h market cap change', value: change, icon: TrendingUp, tone: changeUp },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          eyebrow="Markets"
          icon={PieChart}
          title="Market Analytics"
          description="Global cryptocurrency statistics from CoinGecko, refreshed every two minutes. These are not Solana network health metrics."
          actions={
            stats.updatedAt && (
              <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-white/10 bg-white/[0.03] text-xs text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Updated {new Date(stats.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )
          }
        />

        {stats.loading ? (
          <div role="status" aria-label="Loading market data" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(m => (
              <div key={m.label} className="lune-card h-36 animate-pulse" />
            ))}
          </div>
        ) : stats.error ? (
          <div className="lune-card">
            <EmptyState icon={AlertTriangle} title="Market data unavailable">
              <span role="alert">{stats.error}</span>
            </EmptyState>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(({ label, value, icon: Icon, tone }, i) => (
              <div
                key={label}
                className={cn('lune-card lune-card-hover p-6 relative overflow-hidden', i === 0 && 'sm:col-span-2 lg:col-span-1')}
              >
                <div aria-hidden className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-lune-500/10 blur-2xl" />
                <div className="h-10 w-10 rounded-xl bg-lune-500/10 border border-lune-400/15 flex items-center justify-center text-lune-300 mb-5">
                  <Icon size={18} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</p>
                <p
                  className={cn(
                    'mt-1.5 font-mono text-2xl md:text-[1.75rem] font-medium tracking-tight',
                    tone === true && 'text-up',
                    tone === false && 'text-down'
                  )}
                >
                  {value ?? <span className="text-white/30 text-lg">Unavailable</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="lune-card mt-4 p-6 flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="font-display font-semibold">More analytics coming</h2>
            <p className="text-white/45 text-sm mt-1 leading-relaxed">
              Network health, market-cap history, ecosystem rankings, and sentiment don't have connected data sources yet. No estimates or sample charts are shown.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
