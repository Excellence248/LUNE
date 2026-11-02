import { Link } from 'react-router-dom';
import { ArrowUpRight, Radio } from 'lucide-react';
import { useTokenData } from '@/hooks/useTokenData';
import { cn, changeClass } from '@/lib/utils';
import { LuneMark } from './Brand';

const TrendingSidebar = () => {
  const { tokens, loading, error, updatedAt } = useTokenData();
  return (
    <aside className="w-80 shrink-0 hidden xl:block py-6 space-y-4 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto no-scrollbar">
      <section className="lune-card lune-tilt p-5" data-tilt="4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold">Market quotes</h2>
          {updatedAt && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/35 mb-4">Selected assets via CoinGecko &amp; DexScreener — not a ranking.</p>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="-mx-2">
            {tokens.slice(0, 5).map(token => {
              const query =
                token.category === 'Major'
                  ? `coinId=${encodeURIComponent(token.address)}`
                  : `address=${encodeURIComponent(token.address)}&chain=${encodeURIComponent(token.chain)}`;
              return (
                <Link
                  key={`${token.chain}:${token.address}`}
                  to={`/token/${encodeURIComponent(token.symbol)}?${query}`}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <span className="h-9 w-9 rounded-xl bg-lune-500/10 border border-lune-400/15 flex items-center justify-center text-[10px] font-bold text-lune-200 font-mono shrink-0">
                    {token.symbol.slice(0, 3)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{token.name}</span>
                    <span className="block text-[11px] text-white/35">{token.symbol}</span>
                  </span>
                  <span className="text-right shrink-0 font-mono">
                    <span className="block text-xs">{token.price}</span>
                    <span className={cn('block text-[11px]', changeClass(token.change))}>{token.change}</span>
                  </span>
                </Link>
              );
            })}
            {!tokens.length && <p className="px-2 text-xs text-white/40">No market quotes were returned.</p>}
          </div>
        )}
        {error && <p className="mt-2 text-xs text-amber-300/80">{error}</p>}
        <Link
          to="/explorer"
          className="mt-3 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-white/[0.07] text-xs font-semibold text-lune-200 hover:bg-lune-500/10 hover:border-lune-400/30 transition-all"
        >
          Open Market Explorer <ArrowUpRight size={14} />
        </Link>
      </section>

      <section className="lune-card lune-tilt p-5" data-tilt="4">
        <div className="flex items-center gap-2 mb-1.5">
          <Radio size={16} className="text-lune-300" />
          <h2 className="font-display font-bold">Audio Spaces</h2>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          An audio-room service isn't connected yet, so live rooms can't be shown.
        </p>
      </section>

      <div className="flex items-center gap-2 px-2 text-[11px] text-white/25">
        <LuneMark className="h-5 w-5" glow={false} />
        <span>Lune · Social finance, by the moonlight</span>
      </div>
    </aside>
  );
};

export default TrendingSidebar;
