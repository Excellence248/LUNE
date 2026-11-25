import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gift, Loader2, Lock, Trophy, UserPlus } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import { EmptyState, PageHeader } from '@/components/lune/Brand';
import UnavailableFeature from '@/components/lune/UnavailableFeature';
import { useWallet } from '@/context/WalletContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { HowPointsWork } from '@/pages/Leaderboard';

interface Achievement { id: string; name: string; description: string; done: boolean; progress?: number; goal?: number }
interface RewardsData {
  available: boolean; points: number; week: number; rank: number | null;
  level: { number: number; name: string; from: number; next: { name: string; at: number } | null };
  referrals: { invited: number; active: number };
  achievements: Achievement[];
}

const ICONS: Record<string, string> = {
  first_post: '🚀', posts_25: '📚', first_reply: '👋', replies_50: '💬', likes_10: '⭐', likes_100: '🌟', followers_10: '🪐', followers_100: '🌌',
  community: '👩‍🚀', founder: '🏗️', inviter: '📡', ambassador: '🛸', profile: '🪪', verified: '🏅',
};

const Rewards = () => {
  const { user, loading } = useWallet();
  const [data, setData] = useState<RewardsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    api<RewardsData>('/api/me/rewards').then(result => { if (active) setData(result); }).catch(() => { if (active) setError('Your rewards could not be loaded. Check your connection and try again.'); });
    return () => { active = false; };
  }, [user?.id]);

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl">
          <PageHeader eyebrow="Rewards" icon={Gift} title="Moon points & achievements" description="Earn points and unlock achievements by taking part on Lune." />
          <div className="lune-card">{loading ? <p role="status" className="flex items-center justify-center gap-2 py-10 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p> : <EmptyState icon={Gift} title="Log in to see your rewards"><Link to="/signin" className="text-lune-300 hover:underline">Log in</Link> or <Link to="/signup" className="text-lune-300 hover:underline">create an account</Link> to start earning.</EmptyState>}</div>
        </div>
      </Layout>
    );
  }
  if (data && !data.available) return <Layout><UnavailableFeature title="Rewards" description="Rewards are being set up. Please check back soon." /></Layout>;

  const level = data?.level;
  const span = level?.next ? level.next.at - level.from : 1;
  const into = level ? (data!.points - level.from) : 0;
  const percent = level?.next ? Math.max(4, Math.min(100, Math.round((into / span) * 100))) : 100;
  const unlocked = data?.achievements.filter(item => item.done).length ?? 0;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Rewards" icon={Gift} title="Moon points & achievements" description="Earn points and unlock achievements by taking part on Lune." />
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {!data && !error && <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>}

        {data && level && (
          <>
            <div className="mb-6 overflow-hidden rounded-3xl border border-lune-400/25 bg-gradient-to-br from-lune-600/30 via-lune-900/40 to-black/30 p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lune-200/80">Level {level.number}</p>
                  <p className="font-display text-3xl font-bold text-white">{level.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold tabular-nums text-white">{data.points.toLocaleString()}</p>
                  <p className="text-xs text-white/55">Moon points · +{data.week.toLocaleString()} this week</p>
                </div>
              </div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next level">
                <div className="h-full rounded-full bg-gradient-to-r from-lune-300 to-lune-500" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-white/55">{level.next ? `${(level.next.at - data.points).toLocaleString()} points to ${level.next.name}` : 'Top level reached. Legendary.'}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                <Link to="/leaderboard" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-white/80 hover:border-lune-300/50 hover:text-white"><Trophy size={14} />{data.rank ? `Rank #${data.rank} of all time` : 'See the leaderboard'}</Link>
                <Link to="/referrals" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-white/80 hover:border-lune-300/50 hover:text-white"><UserPlus size={14} />Invite friends · +20 each</Link>
              </div>
            </div>

            <h2 className="mb-3 font-display text-lg font-semibold">Achievements <span className="text-sm font-normal text-white/45">{unlocked} of {data.achievements.length}</span></h2>
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {data.achievements.map(item => (
                <div key={item.id} className={cn('flex items-center gap-3 rounded-2xl border p-3.5', item.done ? 'border-lune-400/30 bg-lune-500/10' : 'border-white/[0.08] bg-white/[0.02]')}>
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl', item.done ? 'bg-white/10' : 'bg-white/[0.04] grayscale opacity-50')}>{ICONS[item.id] ?? '✨'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-white">{item.name}{item.done ? <Check size={14} className="text-emerald-300" /> : <Lock size={12} className="text-white/30" />}</p>
                    <p className="text-xs text-white/50">{item.description}</p>
                    {!item.done && item.goal && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lune-400" style={{ width: `${Math.round(((item.progress ?? 0) / item.goal) * 100)}%` }} /></div>
                        <span className="text-[11px] tabular-nums text-white/40">{item.progress ?? 0}/{item.goal}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <HowPointsWork />
          </>
        )}
      </div>
    </Layout>
  );
};

export default Rewards;
