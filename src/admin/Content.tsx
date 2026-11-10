import { useState } from 'react';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast';
import ActionDialog from './ActionDialog';
import { ListStatus, SearchBox } from './ListStatus';
import { api, formatCount, formatDate, type ContentItem } from './api';
import { usePagedList } from './usePagedList';

type Kind = 'posts' | 'replies';

const Content = ({ canRemove }: { canRemove: boolean }) => {
  const [kind, setKind] = useState<Kind>('posts');
  const [q, setQ] = useState('');
  const list = usePagedList<ContentItem>('/api/admin/content', { kind, q });
  const [removing, setRemoving] = useState<ContentItem | null>(null);
  const noun = kind === 'posts' ? 'post' : 'reply';

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex gap-2" role="radiogroup" aria-label="Content type">
          {(['posts', 'replies'] as const).map(option => (
            <Button key={option} size="sm" role="radio" aria-checked={kind === option} variant={kind === option ? 'default' : 'outline'} className="capitalize" onClick={() => setKind(option)}>{option}</Button>
          ))}
        </div>
        <SearchBox label="Search text or username" onSearch={setQ} />
      </div>
      <ul className="divide-y divide-border">
        {list.items.map(item => (
          <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">@{item.author.username}</span> · {formatDate(item.created_at)}</p>
              {item.content && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.content}</p>}
              {item.image_url && <a href={item.image_url} target="_blank" rel="noreferrer" className="text-sm text-lune-300 underline">View attached image</a>}
              {kind === 'posts' && (
                <p className="flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {formatCount(item.likes ?? 0)}</span>
                  <span className="inline-flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" /> {formatCount(item.reposts ?? 0)}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {formatCount(item.replies ?? 0)}</span>
                </p>
              )}
            </div>
            {canRemove && <Button size="sm" variant="destructive" className="shrink-0" onClick={() => setRemoving(item)}>Remove</Button>}
          </li>
        ))}
      </ul>
      <ListStatus count={list.items.length} loading={list.loading} error={list.error} hasMore={list.hasMore} empty={q ? `No ${kind} match “${q}”.` : `No ${kind} yet.`} onRetry={list.reload} onMore={list.loadMore} />

      {removing && (
        <ActionDialog
          title={`Remove this ${noun} by @${removing.author.username}?`}
          description={`It disappears for everyone${kind === 'posts' ? ', along with its likes, reposts and replies' : ''}. A copy is kept in the audit log.`}
          confirmLabel="Remove" destructive
          onConfirm={async ({ reason }) => {
            await api(`/api/admin/${kind}/${removing.id}/remove`, { method: 'POST', body: { reason } });
            showSuccess(`The ${noun} was removed`);
            void list.reload();
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </section>
  );
};

export default Content;
