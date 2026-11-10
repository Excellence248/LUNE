import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListStatus } from './ListStatus';
import { formatDate, type AuditEntry } from './api';
import { usePagedList } from './usePagedList';

const ACTION_LABELS: Record<AuditEntry['action'], string> = {
  suspend: 'Suspended',
  reinstate: 'Reinstated',
  remove_post: 'Removed post',
  remove_reply: 'Removed reply',
  grant_badge: 'Granted badge',
  revoke_badge: 'Revoked badge',
};

const detail = (entry: AuditEntry) => {
  if (entry.details.content) return `“${entry.details.content.slice(0, 140)}${entry.details.content.length > 140 ? '…' : ''}”`;
  const parts = [entry.details.tier, entry.details.expires_at && `until ${formatDate(entry.details.expires_at)}`].filter(Boolean);
  return parts.join(' ');
};

const NO_PARAMS = {};

const AuditLog = () => {
  const list = usePagedList<AuditEntry>('/api/admin/audit', NO_PARAMS);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-display text-lg font-semibold">Audit log</h2>
        <p className="text-sm text-muted-foreground">Every admin action, newest first. Entries cannot be edited or deleted.</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(entry.created_at)}</TableCell>
                <TableCell>{entry.admin_username ? `@${entry.admin_username}` : 'Deleted admin'}</TableCell>
                <TableCell className="whitespace-nowrap">{ACTION_LABELS[entry.action]}</TableCell>
                <TableCell>{entry.target_username ? `@${entry.target_username}` : entry.target_profile_id ? 'Deleted member' : '—'}</TableCell>
                <TableCell className="min-w-[180px]">{entry.reason}</TableCell>
                <TableCell className="min-w-[180px] text-muted-foreground">{detail(entry)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListStatus count={list.items.length} loading={list.loading} error={list.error} hasMore={list.hasMore} empty="No admin actions yet." onRetry={list.reload} onMore={list.loadMore} />
    </section>
  );
};

export default AuditLog;
