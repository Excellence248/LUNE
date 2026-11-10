import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, formatCount, type Overview as Totals } from './api';

const TILES: { key: keyof Totals; label: string; hint?: (totals: Totals) => string }[] = [
  { key: 'members', label: 'Members', hint: totals => `+${formatCount(totals.new_members_7d)} this week` },
  { key: 'posts', label: 'Posts', hint: totals => `+${formatCount(totals.posts_7d)} this week` },
  { key: 'replies', label: 'Replies' },
  { key: 'likes', label: 'Likes' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'follows', label: 'Follows' },
  { key: 'open_reports', label: 'Open reports' },
  { key: 'suspended', label: 'Suspended members' },
  { key: 'admins', label: 'Admins' },
];

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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {TILES.map(tile => (
        <div key={tile.key} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{tile.label}</p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">{formatCount(totals[tile.key])}</p>
          {tile.hint && <p className="mt-1 text-xs text-muted-foreground">{tile.hint(totals)}</p>}
        </div>
      ))}
    </div>
  );
};

export default Overview;
