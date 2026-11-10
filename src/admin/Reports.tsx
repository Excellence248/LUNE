import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast';
import ActionDialog, { type ActionValues } from './ActionDialog';
import { ListStatus } from './ListStatus';
import { api, formatDate, type AdminReport } from './api';
import { usePagedList } from './usePagedList';

type Status = AdminReport['status'];
type Pending =
  | { kind: 'remove'; report: AdminReport }
  | { kind: 'suspend'; report: AdminReport }
  | { kind: 'review'; report: AdminReport; outcome: 'resolved' | 'dismissed' };

const REASONS: Record<string, string> = {
  spam: 'Spam', scam: 'Scam or fraud', harassment: 'Harassment', hate: 'Hate speech', violence: 'Violence or threats',
  sexual: 'Sexual content', impersonation: 'Impersonation', other: 'Something else',
};

const Reports = ({ can }: { can: (permission: string) => boolean }) => {
  const [status, setStatus] = useState<Status>('open');
  const list = usePagedList<AdminReport>('/api/admin/reports', { status });
  const [pending, setPending] = useState<Pending | null>(null);

  const run = async (action: Pending, { reason, until }: ActionValues) => {
    const { report } = action;
    if (action.kind === 'remove') {
      await api(`/api/admin/${report.target_type === 'post' ? 'posts' : 'replies'}/${report.target_id}/remove`, { method: 'POST', body: { reason } });
      showSuccess(`The ${report.target_type} was removed and its reports closed`);
    } else if (action.kind === 'suspend') {
      await api(`/api/admin/members/${report.target_profile_id}/suspend`, { method: 'POST', body: { reason, until } });
      showSuccess(`@${report.target_username} is suspended`);
    } else {
      await api(`/api/admin/reports/${report.id}/review`, { method: 'POST', body: { outcome: action.outcome, reason } });
      showSuccess(action.outcome === 'resolved' ? 'Report resolved' : 'Report dismissed');
    }
    void list.reload();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="font-display text-lg font-semibold">Reports</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="Report status">
          {(['open', 'resolved', 'dismissed'] as const).map(option => (
            <Button key={option} size="sm" role="radio" aria-checked={status === option} variant={status === option ? 'default' : 'outline'} className="capitalize" onClick={() => setStatus(option)}>{option}</Button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {list.items.map(report => (
          <li key={report.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-200"><Flag className="h-3 w-3" />{REASONS[report.reason] ?? report.reason}</span>
                <span className="text-muted-foreground">
                  {report.target_type === 'profile' ? 'Account' : report.target_type === 'post' ? 'Post' : 'Reply'} by <span className="font-medium text-foreground">{report.target_username ? `@${report.target_username}` : 'a deleted member'}</span>
                  {' · '}reported by {report.reporter_username ? `@${report.reporter_username}` : 'a deleted member'} · {formatDate(report.created_at)}
                </span>
                {report.open_reports > 1 && report.status === 'open' && <span className="text-xs text-amber-300">{report.open_reports} open reports</span>}
              </p>
              {report.target_type !== 'profile' && (
                report.removed
                  ? <p className="text-sm italic text-muted-foreground">This {report.target_type} has been removed.</p>
                  : <p className="whitespace-pre-wrap break-words rounded-xl border border-border bg-background/50 p-3 text-sm">{report.content}{report.image_url && <a href={report.image_url} target="_blank" rel="noreferrer" className="mt-1 block text-lune-300 underline">View attached image</a>}</p>
              )}
              {report.details && <p className="text-sm text-muted-foreground">“{report.details}”</p>}
            </div>
            {report.status === 'open' && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {can('content.remove_any') && report.target_type !== 'profile' && !report.removed && (
                  <Button size="sm" variant="destructive" onClick={() => setPending({ kind: 'remove', report })}>Remove {report.target_type}</Button>
                )}
                {can('member.suspend') && report.target_profile_id && (
                  <Button size="sm" variant="outline" onClick={() => setPending({ kind: 'suspend', report })}>Suspend</Button>
                )}
                {can('content.remove_any') && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setPending({ kind: 'review', report, outcome: 'resolved' })}>Resolve</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPending({ kind: 'review', report, outcome: 'dismissed' })}>Dismiss</Button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <ListStatus count={list.items.length} loading={list.loading} error={list.error} hasMore={list.hasMore} empty={status === 'open' ? 'No open reports. Nice and quiet.' : `No ${status} reports.`} onRetry={list.reload} onMore={list.loadMore} />

      {pending && (
        <ActionDialog
          title={pending.kind === 'remove' ? `Remove this ${pending.report.target_type}?` : pending.kind === 'suspend' ? `Suspend @${pending.report.target_username}?` : pending.outcome === 'resolved' ? 'Mark this report resolved?' : 'Dismiss this report?'}
          description={pending.kind === 'remove' ? 'It disappears for everyone and every open report about it is closed. A copy is kept in the audit log.'
            : pending.kind === 'suspend' ? 'They can still sign in and read, but cannot post, reply, like, repost, follow or edit their profile.'
            : pending.outcome === 'resolved' ? 'Use this when you dealt with it another way. The content stays up.' : 'Use this when nothing breaks the rules. The content stays up.'}
          confirmLabel={pending.kind === 'remove' ? 'Remove' : pending.kind === 'suspend' ? 'Suspend' : pending.outcome === 'resolved' ? 'Resolve' : 'Dismiss'}
          destructive={pending.kind !== 'review'}
          withUntil={pending.kind === 'suspend' ? 'Suspended until' : undefined}
          onConfirm={values => run(pending, values)}
          onClose={() => setPending(null)}
        />
      )}
    </section>
  );
};

export default Reports;
