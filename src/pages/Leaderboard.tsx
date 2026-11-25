import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Loader2, Trophy } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import VerifiedBadge from '@/components/lune/VerifiedBadge';
import { EmptyState, PageHeader } from '@/components/lune/Brand';
import UnavailableFeature from '@/components/lune/UnavailableFeature';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/context/WalletContext';
import { api } from '@/lib/api';
import { displayNameOf } from '@/lib/names';
import { cn } from '@/lib/utils';

type Period = 'week' | 'month' | 'all';
interface Row {
  rank: number; points: number; posts: number; replies: number; likes_received: number; reposts_received: number; followers: number; referrals: number;
  id: string; username: string; display_name: string; avatar_url: string;
}
interface Board { available: boolean; items: Row[]; me: { rank: number | null; points: number } | null }

const PERIODS: [Period, string][] = [['week', 'This week'], ['month', 'This month'], ['all', 'All time']];
const MEDAL = ['from-amber-300 to-yellow-600', 'from-slate-200 to-slate-400', 'from-orange-300 to-amber-700'];

export const HowPointsWork = () => (
  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-white/60">
    <p className="mb-2 font-semibold text-white/80">How Moon points work</p>
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
      <li>📝 Post · <b className="text-white/80">5</b></li>
      <li>💬 Reply · <b className="text-white/80">2</b></li>
      <li>❤️ Like received · <b className="text-white/80">1</b></li>
      <li>🔁 Repost received · <b className="text-white/80">2</b></li>
      <li>👤 New follower · <b className="text-white/80">3</b></li>
      <li>🚀 Friend joins and posts · <b className="text-white/80">20</b></li>
    </ul>
    <p className="mt-2 text-xs text-white/35">Moon points are just for fun. They have no money value and can’t be bought, sold or cashed out.</p>
  </div>
);

const Person = ({ row, size = 'h-10 w-10' }: { row: Row; size?: string }) => (
  <Avatar className={cn(size, 'ring-1 ring-white/10')}><AvatarImage src={row.avatar_url} /><AvatarFallback className="bg-lune-900 text-sm text-lune-200">{displayNameOf(row)[0]?.toUpperCase()}</AvatarFallback></Avatar>
);

const Leaderboard = () => {
  const { user } = useWallet();
  const [period, setPeriod] = useState<Period>('week');
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBoard(null);
    setError('');
    api<Board>(`/api/leaderboard?period=${period}`).then(data => { if (active) setBoard(data); }).catch(() => { if (active) setError('The leaderboard could not be loaded. Check your connection and try again.'); });
    return () => { active = false; };
  }, [period, user?.id]);

  if (board && !board.available) return <Layout><UnavailableFeature title="Leaderboard" description="The leaderboard is being set up. Please check back soon." /></Layout>;
  const top = board?.items.slice(0, 3) ?? [];
  const rest = board?.items.slice(3) ?? [];

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Leaderboard" icon={Trophy} title="Brightest on Lune" description="The most active members, by Moon points. Post, reply, get likes and invite friends to climb." />
        <div className="mb-5 flex rounded-full border border-white/10 p-0.5 text-sm" role="tablist">
          {PERIODS.map(([value, label]) => (
            <button key={value} role="tab" aria-selected={period === value} onClick={() => setPeriod(value)} className={cn('flex-1 rounded-full px-4 py-1.5 transition-colors', period === value ? 'bg-lune-500/25 text-white' : 'text-white/50 hover:text-white')}>{label}</button>
          ))}
        </div>

        {board?.me && user && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-lune-400/25 bg-lune-500/10 px-4 py-3 text-sm">
            <span className="text-white/75">{board.me.rank ? <>You’re <b className="text-white">#{board.me.rank}</b> {period === 'all' ? 'of all time' : period === 'week' ? 'this week' : 'this month'}</> : 'You haven’t earned points in this period yet'}</span>
            <span className="font-semibold tabular-nums text-lune-200">{board.me.points.toLocaleString()} pts</span>
          </div>
        )}

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {!board && !error && <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>}
        {board && !board.items.length && <div className="lune-card"><EmptyState icon={Trophy} title="No points yet this period">Be the first: share a post or reply to someone.</EmptyState></div>}

        {top.length > 0 && (
          <div className="mb-4 grid grid-cols-3 items-end gap-3">
            {[top[1], top[0], top[2]].map((row, index) => row && (
              <Link key={row.id} to={`/profile/${encodeURIComponent(row.username)}`} className={cn('flex flex-col items-center rounded-3xl border border-white/10 glass-soft px-2 pb-4 text-center transition-colors hover:border-lune-400/40', index === 1 ? 'pt-6' : 'pt-4')}>
                <div className="relative">
                  {row.rank === 1 && <Crown size={20} className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-300" />}
                  <Person row={row} size={index === 1 ? 'h-16 w-16' : 'h-12 w-12'} />
                  <span className={cn('absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-black', MEDAL[row.rank - 1] ?? MEDAL[2])}>{row.rank}</span>
                </div>
                <p className="mt-2 w-full truncate text-sm font-semibold text-white">{displayNameOf(row)} <VerifiedBadge username={row.username} /></p>
                <p className="text-xs tabular-nums text-lune-200">{row.points.toLocaleString()} pts</p>
              </Link>
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <ol className="mb-6 divide-y divide-white/[0.06] overflow-hidden rounded-3xl border border-white/10 glass-soft">
            {rest.map(row => (
              <li key={row.id}>
                <Link to={`/profile/${encodeURIComponent(row.username)}`} className={cn('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]', row.id === user?.id && 'bg-lune-500/10')}>
                  <span className="w-7 text-center text-sm font-semibold tabular-nums text-white/45">{row.rank}</span>
                  <Person row={row} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{displayNameOf(row)} <VerifiedBadge username={row.username} /></span><span className="block truncate text-xs text-white/40">{row.posts} posts · {row.likes_received} likes · {row.followers} new followers</span></span>
                  <span className="text-sm font-semibold tabular-nums text-lune-200">{row.points.toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <HowPointsWork />
      </div>
    </Layout>
  );
};

export default Leaderboard;
