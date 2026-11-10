import { useState } from 'react';
import { BadgeCheck, MoreHorizontal, ShieldCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showSuccess } from '@/utils/toast';
import ActionDialog, { type ActionValues } from './ActionDialog';
import { ListStatus, SearchBox } from './ListStatus';
import { api, formatCount, formatDate, type Member } from './api';
import { usePagedList } from './usePagedList';

type Pending = { kind: 'suspend' | 'reinstate' | 'badge'; member: Member };

const Members = ({ can }: { can: (permission: string) => boolean }) => {
  const [q, setQ] = useState('');
  const list = usePagedList<Member>('/api/admin/members', { q });
  const [pending, setPending] = useState<Pending | null>(null);

  const run = async ({ kind, member }: Pending, values: ActionValues) => {
    await api(`/api/admin/members/${member.id}/${kind}`, { method: 'POST', body: values });
    showSuccess({ suspend: `@${member.username} is suspended`, reinstate: `@${member.username} is reinstated`, badge: `Badge updated for @${member.username}` }[kind]);
    void list.reload();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="font-display text-lg font-semibold">Members</h2>
        <SearchBox label="Search usernames" onSearch={setQ} />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Followers</TableHead>
              <TableHead className="text-right">Following</TableHead>
              <TableHead className="text-right">Posts</TableHead>
              <TableHead className="text-right" title="Likes received on their posts">Likes</TableHead>
              <TableHead className="text-right" title="Reposts received on their posts">Reposts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map(member => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex min-w-[180px] items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback>{member.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate font-medium">
                        @{member.username}
                        {member.badge && <BadgeCheck aria-label={`${member.badge} badge`} className={`h-4 w-4 ${member.badge === 'gold' ? 'text-amber-300' : 'text-sky-400'}`} />}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.email ?? 'No linked sign-in'} · joined {formatDate(member.created_at)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(member.stats.followers)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(member.stats.following)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(member.stats.posts)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(member.stats.likes_received)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(member.stats.reposts_received)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {member.is_admin ? (
                    <span className="inline-flex items-center gap-1 text-sm text-lune-300"><ShieldCheck className="h-4 w-4" /> Admin</span>
                  ) : member.suspension ? (
                    <div className="text-sm text-red-300" title={member.suspension.reason}>
                      <span className="inline-flex items-center gap-1"><UserX className="h-4 w-4" /> Suspended</span>
                      <p className="text-xs text-red-300/70">{member.suspension.expires_at ? `until ${new Date(member.suspension.expires_at).toLocaleDateString()}` : 'until reinstated'}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Active</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {(can('badge.grant') || (can('member.suspend') && !member.is_admin)) && (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label={`Manage @${member.username}`}><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {can('badge.grant') && <DropdownMenuItem onSelect={() => setPending({ kind: 'badge', member })}>Change badge…</DropdownMenuItem>}
                        {can('member.suspend') && !member.is_admin && (member.suspension
                          ? <DropdownMenuItem onSelect={() => setPending({ kind: 'reinstate', member })}>Reinstate…</DropdownMenuItem>
                          : <DropdownMenuItem className="text-red-300 focus:text-red-200" onSelect={() => setPending({ kind: 'suspend', member })}>Suspend…</DropdownMenuItem>)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListStatus count={list.items.length} loading={list.loading} error={list.error} hasMore={list.hasMore} empty={q ? `No usernames match “${q}”.` : 'No members yet.'} onRetry={list.reload} onMore={list.loadMore} />

      {pending?.kind === 'suspend' && (
        <ActionDialog
          title={`Suspend @${pending.member.username}?`}
          description="They can still sign in and read, but cannot post, reply, like, repost, follow or edit their profile."
          confirmLabel="Suspend" destructive withUntil="Suspended until"
          onConfirm={values => run(pending, values)} onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === 'reinstate' && (
        <ActionDialog
          title={`Reinstate @${pending.member.username}?`}
          description={`Suspended for: ${pending.member.suspension?.reason}. Reinstating gives back every member right.`}
          confirmLabel="Reinstate"
          onConfirm={values => run(pending, values)} onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === 'badge' && (
        <ActionDialog
          title={`Badge for @${pending.member.username}`}
          description={pending.member.badge ? `Currently ${pending.member.badge}${pending.member.badge_expires_at ? ` until ${formatDate(pending.member.badge_expires_at)}` : ''}.` : 'No badge right now.'}
          confirmLabel="Save badge" withTier withUntil="Badge expires"
          onConfirm={values => run(pending, values)} onClose={() => setPending(null)}
        />
      )}
    </section>
  );
};

export default Members;
