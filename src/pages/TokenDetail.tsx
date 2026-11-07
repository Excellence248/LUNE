import Layout from '@/components/lune/Layout';
import TradingChart from '@/components/lune/TradingChart';
import FeedCard from '@/components/lune/FeedCard';
import { EmptyState } from '@/components/lune/Brand';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CandlestickChart, ShieldQuestion, MessagesSquare, SearchX } from 'lucide-react';
import { useSingleTokenData } from '@/hooks/useSingleTokenData';
import { useTokenHistory } from '@/hooks/useTokenHistory';
import { useSocial } from '@/context/SocialContext';
import { cn, changeClass } from '@/lib/utils';

const TokenDetail = () => {
  const { symbol = '' } = useParams();
  const [search] = useSearchParams();
  const { data, loading } = useSingleTokenData(symbol, search.get('coinId'), search.get('address'), search.get('chain'));
  const { history, loading: historyLoading } = useTokenHistory(data?.historySymbol || '');
  const { posts, loading: postsLoading, feedError } = useSocial();
  const relatedPosts = posts.filter(post =>
    post.content
      .split(/\s+/)
      .some(word => word.replace(/[.,!?;:]+$/, '').toUpperCase() === `$${symbol.toUpperCase()}`)
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-5">
        <Link to="/explorer" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white transition-colors">
          <ArrowLeft size={15} /> Explorer
        </Link>

        {loading ? (
          <div role="status" aria-label="Loading market quote" className="space-y-4 animate-pulse">
            <div className="h-24 lune-card" />
            <div className="h-[460px] lune-card" />
          </div>
        ) : !data ? (
          <div className="lune-card">
            <EmptyState icon={SearchX} title="Market data unavailable">
              No quote could be loaded for this asset. A symbol alone may refer to multiple tokens; choose an asset from the{' '}
              <Link to="/explorer" className="text-lune-300 hover:underline">explorer</Link> to identify its source.
            </EmptyState>
          </div>
        ) : (
          <>
            <section className="lune-card p-6 md:p-8 relative overflow-hidden">
              <div aria-hidden className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-lune-500/15 blur-3xl" />
              <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="shrink-0 h-14 w-14 rounded-2xl bg-lune-500/15 border border-lune-400/20 flex items-center justify-center font-mono text-sm font-bold text-lune-200">
                    {data.symbol.slice(0, 3)}
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold line-clamp-2 break-words">
                      {data.name} <span className="text-white/35 text-lg font-medium">{data.symbol}</span>
                    </h1>
                    <p className="text-xs text-white/35 mt-0.5">Source: {data.source}</p>
                  </div>
                </div>
                <div className="md:text-right">
                  <p className="text-3xl md:text-4xl font-mono font-medium tracking-tight">{data.price}</p>
                  <p className={cn('font-mono text-sm mt-1', changeClass(data.change))}>
                    {data.change} <span className="text-white/30">24h</span>
                  </p>
                </div>
              </div>

              <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  ['Market cap', data.mcap],
                  ['Liquidity', data.liquidity],
                  ['24h volume', data.volume],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/[0.06] glass-soft px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-white/35">{label}</p>
                    <p className="font-mono text-sm mt-1">{value}</p>
                  </div>
                ))}
              </div>

              <div className="relative mt-4 space-y-1 text-[11px] text-white/30 break-all">
                <p>Retrieved {new Date(data.updatedAt).toLocaleString()} · refreshed every 30 seconds</p>
                {search.get('address') && <p>Token address: <span className="font-mono">{search.get('address')}</span></p>}
                {data.pairAddress && <p>Quoted pair: <span className="font-mono">{data.pairAddress}</span></p>}
              </div>
            </section>

            <section className="lune-card overflow-hidden">
              <div className="px-6 pt-5 pb-3 flex items-center gap-2">
                <CandlestickChart size={17} className="text-lune-300" />
                <h2 className="font-display font-semibold">Price history</h2>
              </div>
              {historyLoading ? (
                <div className="h-[400px] mx-6 mb-6 rounded-2xl glass-soft animate-pulse" />
              ) : history.length > 0 ? (
                <>
                  <p className="px-6 pb-2 text-[11px] text-white/35">
                    Binance {data.historySymbol}/USDT hourly candles. This exchange pair differs from a USD aggregate quote.
                  </p>
                  <TradingChart data={history} symbol={`${data.historySymbol}/USDT`} />
                </>
              ) : (
                <EmptyState icon={CandlestickChart} title="No price history">
                  Historical prices are unavailable for this asset. No generated candles are shown.
                </EmptyState>
              )}
            </section>
          </>
        )}

        <div className="lune-card p-5 flex items-start gap-4">
          <ShieldQuestion size={20} className="text-white/35 shrink-0 mt-0.5" />
          <p className="text-sm text-white/45 leading-relaxed">
            <span className="text-white/75 font-medium">Holder data, sentiment, audits and swaps aren't connected.</span>{' '}
            Quotes are not trading confirmations or safety endorsements.
          </p>
        </div>

        <section className="lune-card overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-white/[0.06]">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <MessagesSquare size={17} className="text-lune-300" /> Posts mentioning <span className="text-lune-300">${symbol}</span>
            </h2>
            <p className="text-[11px] text-white/35 mt-1">
              User-submitted. Symbol mentions don't establish a match to a specific token address or verify a claim.
            </p>
          </div>
          {postsLoading ? (
            <p className="p-6 text-white/40 text-sm">Loading posts…</p>
          ) : feedError ? (
            <p className="p-6 text-white/40 text-sm">{feedError}</p>
          ) : relatedPosts.length ? (
            <div className="divide-y divide-white/[0.06]">
              {relatedPosts.map(post => (
                <FeedCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState title="No mentions yet">Be the first to post about ${symbol}.</EmptyState>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default TokenDetail;
