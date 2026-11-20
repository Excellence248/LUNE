import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Trash2, Users, X } from 'lucide-react';
import EditCommunity from '@/components/lune/EditCommunity';
import Layout from '@/components/lune/Layout';
import CreatePost from '@/components/lune/CreatePost';
import FeedCard from '@/components/lune/FeedCard';
import ConfirmDialog, { type Confirm } from '@/components/lune/ConfirmDialog';
import { EmptyState } from '@/components/lune/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CommunityAvatar } from '@/pages/Communities';
import { useWallet } from '@/context/WalletContext';
import type { Post } from '@/context/SocialContext';
import { api, orNull } from '@/lib/api';
import { displayNameOf } from '@/lib/names';
import type { CommunityDetails, CommunityMember } from '@/lib/communities';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

const CommunityView = ({ slug }: { slug: string }) => {
  const { user } = useWallet();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<CommunityDetails | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [tab, setTab] = useState<'posts' | 'about'>('posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const loadPosts = useCallback(async () => {
    const data = await api<{ items: Post[] }>(`/api/communities/${slug}/posts`);
    setPosts(data.items);
  }, [slug]);

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const details = await orNull(api<CommunityDetails>(`/api/communities/${slug}`));
      setCommunity(details);
      if (details) {
        const [list, people] = await Promise.all([
          api<{ items: Post[] }>(`/api/communities/${slug}/posts`),
          api<{ items: CommunityMember[] }>(`/api/communities/${slug}/members`),
        ]);
        setPosts(list.items);
        setMembers(people.items);
      }
    } catch {
      setError('This community could not be loaded. Check your connection and try again.');
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { void loadAll(); }, [loadAll, user?.id]);

  const act = async (run: () => Promise<unknown>, done?: string) => {
    if (working) return;
    setWorking(true);
    try {
      await run();
      if (done) showSuccess(done);
    } catch (failure) {
      showError(failure instanceof Error ? failure.message : 'That didn’t work. Please try again.');
    } finally { setWorking(false); }
  };

  const join = () => {
    if (!user) { navigate('/signin'); return; }
    void act(async () => { setCommunity(await api<CommunityDetails>(`/api/communities/${slug}/join`, { method: 'POST', body: {} })); await loadAll(); }, 'You joined this community.');
  };
  const leave = () => act(async () => { setCommunity(await api<CommunityDetails>(`/api/communities/${slug}/leave`, { method: 'POST', body: {} })); await loadAll(); }, 'You left this community.');
  const askDelete = () => setConfirm({
    title: 'Delete this community?',
    description: 'Its posts and memberships disappear for everyone. This can’t be undone.',
    action: 'Delete',
    run: async () => { await api(`/api/communities/${slug}`, { method: 'DELETE' }); showSuccess('Community deleted'); navigate('/communities'); },
  });
  const removePost = (post: Post) => setConfirm({
    title: 'Remove this post?',
    description: 'It is taken out of the community, along with any thread that follows it.',
    action: 'Remove',
    run: async () => { await api(`/api/communities/${slug}/posts/${post.id}`, { method: 'DELETE' }); setPosts(previous => previous.filter(row => row.id !== post.id)); },
  });
  const removeMember = (member: CommunityMember) => setConfirm({
    title: `Remove ${displayNameOf(member)}?`,
    description: 'They leave the community and can no longer post in it. They can join again.',
    action: 'Remove',
    run: async () => { await api(`/api/communities/${slug}/members/${member.id}`, { method: 'DELETE' }); await loadAll(); },
  });

  if (loading) return <Layout><div role="status" className="flex items-center justify-center gap-2 py-24 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading community…</div></Layout>;
  if (!community) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl">
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error} <button className="underline" onClick={() => { setLoading(true); void loadAll(); }}>Try again</button></p>}
          {!error && <div className="lune-card"><EmptyState icon={Users} title="Community not found">It may have been deleted, or the link is incorrect. <Link to="/communities" className="text-lune-300 hover:underline">Browse communities</Link></EmptyState></div>}
        </div>
      </Layout>
    );
  }

  const isOwner = community.viewer_role === 'owner';
  const isMember = !!community.viewer_role;
  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="mb-3 rounded-full text-white/60"><Link to="/communities"><ArrowLeft size={16} className="mr-1.5" />Communities</Link></Button>
        <div className="overflow-hidden rounded-3xl border border-white/10 glass-soft">
          <div className="h-32 bg-gradient-to-br from-lune-700/50 via-lune-900/60 to-black/40 sm:h-40">
            {community.cover_url && <img src={community.cover_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-9 flex items-end justify-between gap-3">
              <CommunityAvatar community={community} className="h-[72px] w-[72px] text-2xl ring-4 ring-[#0a0618]" />
              <div className="flex items-center gap-2 pb-1">
                {isOwner && <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-full border-white/15 bg-transparent"><Pencil size={14} className="mr-1.5" />Edit</Button>}
                {isOwner && <Button variant="outline" size="sm" disabled={working} onClick={askDelete} className="rounded-full border-red-400/30 bg-transparent text-red-300 hover:bg-red-400/10"><Trash2 size={14} className="mr-1.5" />Delete</Button>}
                {!isOwner && (isMember
                  ? <Button variant="outline" size="sm" disabled={working} onClick={() => void leave()} className="rounded-full border-white/15 bg-transparent">Joined · Leave</Button>
                  : <button disabled={working} onClick={join} className="lune-btn h-9 px-5 text-sm">Join</button>)}
              </div>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold">{community.name}</h1>
            <p className="text-sm text-white/40">{community.member_count.toLocaleString()} {community.member_count === 1 ? 'member' : 'members'} · created by <Link to={`/profile/${encodeURIComponent(community.owner.username)}`} className="hover:text-lune-300">{displayNameOf(community.owner)}</Link></p>
            {community.description && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/75">{community.description}</p>}
          </div>
          <div className="flex border-t border-white/[0.06] text-sm" role="tablist">
            {([['posts', 'Posts'], ['about', 'Members & rules']] as const).map(([value, label]) => (
              <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={cn('flex-1 py-3 font-medium transition-colors', tab === value ? 'border-b-2 border-lune-400 text-white' : 'text-white/45 hover:text-white')}>{label}</button>
            ))}
          </div>
        </div>

        {tab === 'posts' ? (
          <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 glass-soft divide-y divide-white/[0.06]">
            {isMember
              ? <CreatePost community={community.slug} placeholder={`Share something with ${community.name}`} onPosted={() => void loadPosts()} />
              : <p className="px-5 py-4 text-sm text-white/50">{user ? 'Join this community to post in it.' : <><Link to="/signin" className="text-lune-300 hover:underline">Log in</Link> and join to post in this community.</>}</p>}
            {posts.length ? posts.map(post => (
              <div key={post.id} className="relative">
                <FeedCard post={post} />
                {isOwner && post.user_id !== user?.id && <button onClick={() => removePost(post)} aria-label="Remove this post from the community" title="Remove from community" className="absolute right-12 top-4 flex h-7 w-7 items-center justify-center rounded-full text-white/30 hover:bg-white/10 hover:text-red-300"><X size={15} /></button>}
              </div>
            )) : <EmptyState icon={Users} title="No posts yet">{isMember ? 'Start the conversation above.' : 'Posts from members will show up here.'}</EmptyState>}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {community.rules && <div className="rounded-3xl border border-white/10 glass-soft p-5"><h2 className="mb-2 font-display font-semibold">Rules</h2><p className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">{community.rules}</p></div>}
            <div className="rounded-3xl border border-white/10 glass-soft p-2">
              <h2 className="px-3 pb-1 pt-3 font-display font-semibold">Members</h2>
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.03]">
                  <Link to={`/profile/${encodeURIComponent(member.username)}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-white/10"><AvatarImage src={member.avatar_url} /><AvatarFallback className="bg-lune-900 text-xs text-lune-200">{displayNameOf(member)[0]?.toUpperCase()}</AvatarFallback></Avatar>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{displayNameOf(member)}</span><span className="block truncate text-xs text-white/35">@{member.username}</span></span>
                  </Link>
                  {member.role === 'owner' && <span className="rounded-full border border-lune-400/30 bg-lune-500/10 px-2 py-0.5 text-[11px] font-medium text-lune-200">Owner</span>}
                  {isOwner && member.role !== 'owner' && <button onClick={() => removeMember(member)} className="text-xs text-white/35 hover:text-red-300">Remove</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />}
      {isOwner && <EditCommunity key={`${community.name}${community.avatar_url}${community.cover_url}`} community={community} open={editing} onClose={() => setEditing(false)} onSaved={next => setCommunity(previous => previous ? { ...previous, ...next } : next)} />}
    </Layout>
  );
};

const CommunityDetail = () => {
  const { slug = '' } = useParams();
  return <CommunityView key={slug} slug={slug.toLowerCase()} />;
};

export default CommunityDetail;
