import { Link } from 'react-router-dom';
import { useTokenData } from '@/hooks/useTokenData';

const TrendingSidebar = () => {
  const { tokens, loading, error, updatedAt } = useTokenData();
  return (
    <aside className="w-80 hidden xl:block p-6 space-y-6 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
      <section className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <h2 className="font-bold">Market Quotes</h2>
        <p className="text-xs text-gray-500">Selected assets, not a trending ranking. Sources: CoinGecko and DexScreener.</p>
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
          <div className="space-y-4">
            {tokens.slice(0, 4).map(token => {
              const query = token.category === 'Major'
                ? `coinId=${encodeURIComponent(token.address)}`
                : `address=${encodeURIComponent(token.address)}&chain=${encodeURIComponent(token.chain)}`;
              return (
                <Link key={`${token.chain}:${token.address}`} to={`/token/${encodeURIComponent(token.symbol)}?${query}`} className="flex items-center justify-between gap-3 hover:text-purple-400">
                  <span className="text-sm truncate">{token.name}</span>
                  <span className="text-right shrink-0">
                    <span className="block text-xs font-mono">{token.price}</span>
                    <span className="block text-xs text-gray-400">24h: {token.change}</span>
                  </span>
                </Link>
              );
            })}
            {!tokens.length && <p className="text-xs text-gray-400">No market quotes were returned.</p>}
          </div>
        )}
        {error && <p className="text-xs text-gray-400">{error}</p>}
        {updatedAt && <p className="text-xs text-gray-500">Retrieved {new Date(updatedAt).toLocaleTimeString()}</p>}
        <Link to="/explorer" className="block text-sm text-purple-400 hover:underline">Open Market Explorer</Link>
      </section>
      <section className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-2">
        <h2 className="font-bold">Audio Spaces</h2>
        <p className="text-xs text-gray-500">An audio-room service is not connected. Live status is unavailable.</p>
      </section>
    </aside>
  );
};

export default TrendingSidebar;
