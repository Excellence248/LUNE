import { useState } from 'react';
import { FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast';
import ActionDialog from './ActionDialog';
import { ListStatus, SearchBox } from './ListStatus';
import { api, formatCount, formatDate, type AdminCommunity } from './api';
import { usePagedList } from './usePagedList';

/** Every community, newest first, with a way to remove one that breaks the rules. */
const Communities = ({ canRemove }: { canRemove: boolean }) => {
  const [q, setQ] = useState('');
  const list = usePagedList<AdminCommunity>('/api/admin/communities', { q });
  const [removing, setRemoving] = useState<AdminCommunity | null>(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border p-4">
        <SearchBox label="Search name, address or owner" onSearch={setQ} />
      </div>
      <ul className="divide-y divide-border">
        {list.items.map(item => (
          <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="font-medium">{item.name} <a href={`/communities/${item.slug}`} target="_blank" rel="noreferrer" className="text-sm font-normal text-lune-300 underline">/communities/{item.slug}</a></p>
              <p className="text-sm text-muted-foreground">Owner <span className="font-medium text-foreground">@{item.owner.username}</span> · {formatDate(item.created_at)}</p>
              {item.description && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description}</p>}
              <p className="flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {formatCount(item.members)} members</span>
                <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {formatCount(item.posts)} posts</span>
              </p>
            </div>
            {canRemove && <Button size="sm" variant="destructive" className="shrink-0" onClick={() => setRemoving(item)}>Remove</Button>}
          </li>
        ))}
      </ul>
      <ListStatus count={list.items.length} loading={list.loading} error={list.error} hasMore={list.hasMore} empty={q ? `No communities match “${q}”.` : 'No communities yet.'} onRetry={list.reload} onMore={list.loadMore} />

      {removing && (
        <ActionDialog
          title={`Remove “${removing.name}”?`}
          description={`It disappears for everyone, along with its ${formatCount(removing.posts)} posts and ${formatCount(removing.members)} memberships. Its details are kept in the audit log.`}
          confirmLabel="Remove community" destructive
          onConfirm={async ({ reason }) => {
            await api(`/api/admin/communities/${removing.id}/remove`, { method: 'POST', body: { reason } });
            showSuccess('The community was removed');
            void list.reload();
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </section>
  );
};

export default Communities;
