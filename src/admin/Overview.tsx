import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, formatCount, type Overview as Totals } from './api';

type NumberKey = Exclude<keyof Totals, 'signups'>;
const TILES: { key: NumberKey; label: string; hint?: (totals: Totals) => string }[] = [
  { key: 'members', label: 'Members', hint: totals => `+${formatCount(totals.new_members_7d)} this week` },
  { key: 'active_7d', label: 'Active this week', hint: () => 'Posted, replied or messaged' },
  { key: 'posts', label: 'Posts', hint: totals => `+${formatCount(totals.posts_7d)} this week` },
  { key: 'messages_7d', label: 'Messages this week' },
  { key: 'replies', label: 'Replies' },
  { key: 'likes', label: 'Likes' },
  { key: 'communities', label: 'Communities' },
  { key: 'polls', label: 'Polls' },
  { key: 'tips', label: 'Tips paid', hint: totals => `${(totals.tips_usdc ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC in total` },
  { key: 'verified', label: 'Verified (ticks)' },
  { key: 'push_devices', label: 'Devices with notifications' },
  { key: 'follows', label: 'Follows' },
  { key: 'open_reports', label: 'Open reports' },
  { key: 'suspended', label: 'Suspended members' },
  { key: 'admins', label: 'Admins' },
];

/** Sign-ups per day for the last two weeks, as simple bars. */
const SignupChart = ({ days }: { days: Totals['signups'] }) => {
  const peak = Math.max(1, ...days.map(day => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const label = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sign-ups, last 14 days</p>
        <p className="text-sm tabular-nums text-muted-foreground">{formatCount(total)} total</p>
      </div>
      <div className="flex h-32 items-end gap-1.5" role="img" aria-label={`Sign-ups per day: ${days.map(day => `${label(day.day)} ${day.count}`).join(', ')}`}>
        {days.map(day => (
          <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${label(day.day)}: ${day.count}`}>
            <span className="text-[10px] tabular-nums text-muted-foreground">{day.count || ''}</span>
            <div className="w-full rounded-t bg-lune-500/70" style={{ height: `${Math.max(2, (day.count / peak) * 85)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{days[0] && label(days[0].day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
};

const Overview = () => {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setTotals(await api<Totals>('/api/admin/overview'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the overview.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (error) {
    return <div className="flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-red-300">{error}</p><Button size="sm" variant="outline" onClick={load}>Try again</Button></div>;
  }
  if (!totals) return <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4">
      {totals.signups?.length > 0 && <SignupChart days={totals.signups} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map(tile => (
          <div key={tile.key} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{tile.label}</p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">{formatCount(totals[tile.key] ?? 0)}</p>
            {tile.hint && <p className="mt-1 text-xs text-muted-foreground">{tile.hint(totals)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Overview;
