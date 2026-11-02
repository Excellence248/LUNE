import Layout from '@/components/lune/Layout';
import TradingChart from '@/components/lune/TradingChart';
import FeedCard from '@/components/lune/FeedCard';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSingleTokenData } from '@/hooks/useSingleTokenData';
import { useTokenHistory } from '@/hooks/useTokenHistory';
import { useSocial } from '@/context/SocialContext';

const TokenDetail = () => {
  const { symbol = '' } = useParams();
  const [search] = useSearchParams();
  const { data, loading } = useSingleTokenData(symbol, search.get('coinId'), search.get('address'), search.get('chain'));
  const { history, loading: historyLoading } = useTokenHistory(data?.historySymbol || '');
  const { posts, loading: postsLoading, feedError } = useSocial();
  const relatedPosts = posts.filter(post => post.content.split(/\s+/).some(word =>
    word.replace(/[.,!?;:]+$/, '').toUpperCase() === `$${symbol.toUpperCase()}`));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {loading ? <p role="status" className="text-gray-400">Loading market quote…</p> : !data ? (
          <Card className="bg-white/5 border-white/10 text-white rounded-3xl">
            <CardContent className="p-8 space-y-4">
              <h1 className="text-2xl font-bold">Market data unavailable</h1>
              <p className="text-gray-400">No quote could be loaded for this asset. A symbol alone may refer to multiple tokens; choose an asset from the explorer to identify its source.</p>
              <Link to="/explorer" className="text-purple-400 hover:underline">Open Market Explorer</Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold">{data.name} <span className="text-gray-500 text-xl">{data.symbol}</span></h1>
              <p className="text-2xl font-mono">{data.price} <span className="text-sm text-gray-400">24h change: {data.change}</span></p>
              <p className="text-xs text-gray-500">Source: {data.source}. Retrieved {new Date(data.updatedAt).toLocaleString()}. Requested every 30 seconds.</p>
              {search.get('address') && <p className="text-xs text-gray-500 break-all">Token address: {search.get('address')}</p>}
              {data.pairAddress && <p className="text-xs text-gray-500 break-all">Quoted pair: {data.pairAddress}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[['Market Cap', data.mcap], ['Liquidity', data.liquidity], ['24h Volume', data.volume]].map(([label, value]) => (
                <Card key={label} className="bg-white/5 border-white/10 text-white rounded-2xl">
                  <CardContent className="p-5 space-y-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-semibold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="bg-white/5 border-white/10 text-white rounded-3xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Price History</h2>
                {historyLoading ? <p className="text-gray-400">Loading history…</p> : history.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-500">Binance {data.historySymbol}/USDT, hourly candles. This exchange pair differs from a USD aggregate quote.</p>
                    <TradingChart data={history} symbol={`${data.historySymbol}/USDT`} />
                  </>
                ) : <p className="text-gray-400">Historical prices are unavailable for this asset. No generated candles are shown.</p>}
              </CardContent>
            </Card>
          </>
        )}
        <Card className="bg-white/5 border-white/10 text-white rounded-3xl">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-xl font-semibold">Additional data and trading unavailable</h2>
            <p className="text-sm text-gray-400">Holder distribution, sentiment analysis, security audits, and swap execution are not connected. Quotes are not trading confirmations or safety endorsements.</p>
          </CardContent>
        </Card>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Posts mentioning ${symbol}</h2>
          <p className="text-xs text-gray-500">User-submitted content from the app database. Symbol mentions do not establish a match to a specific token address or verify a claim.</p>
          {postsLoading ? <p className="text-gray-400">Loading posts…</p> : feedError ? <p className="text-gray-400">{feedError}</p> : relatedPosts.length ? (
            <div className="divide-y divide-white/5">{relatedPosts.map(post => <FeedCard key={post.id} post={post} />)}</div>
          ) : <p className="text-gray-400">No matching posts were returned.</p>}
        </section>
      </div>
    </Layout>
  );
};

export default TokenDetail;
