import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import VerifiedBadge from '@/components/lune/VerifiedBadge';
import { EmptyState } from '@/components/lune/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommunityAvatar } from '@/pages/Communities';
import { useSocial, type Post, type PublicProfile } from '@/context/SocialContext';
import { api } from '@/lib/api';
import { displayNameOf } from '@/lib/names';
import type { CommunitySummary } from '@/lib/communities';
import { cn } from '@/lib/utils';

type Tab = 'all' | 'people' | 'posts' | 'communities';

const Search = () => {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const [input, setInput] = useState(q);
  const [tab, setTab] = useState<Tab>('all');
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isBlocked } = useSocial();

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    const term = q.replace(/^[#@]/, '');
    if (term.length < 2) { setPeople([]); setPosts([]); setCommunities([]); setError(''); return; }
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api<PublicProfile[]>(`/api/profiles?q=${encodeURIComponent(q.startsWith('#') ? term : q)}`).catch(() => [] as PublicProfile[]),
      api<{ posts: Post[]; communities: CommunitySummary[] }>(`/api/search?q=${encodeURIComponent(q)}`),
    ]).then(([users, found]) => {
      if (!active) return;
      setPeople(q.startsWith('#') ? [] : users);
      setPosts(found.posts);
      setCommunities(found.communities);
    }).catch(() => { if (active) setError('Search could not be loaded. Check your connection and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [q]);

  const visiblePosts = posts.filter(post => !isBlocked(post.user_id));
  const empty = !loading && !error && q.replace(/^[#@]/, '').length >= 2 && !people.length && !visiblePosts.length && !communities.length;
  const show = (value: Tab) => tab === 'all' || tab === value;
  const counts: Record<Tab, number> = { all: 0, people: people.length, posts: visiblePosts.length, communities: communities.length };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <form onSubmit={event => { event.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}); }} className="relative mb-4">
          <SearchIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input autoFocus={!q} value={input} onChange={event => setInput(event.target.value)} maxLength={64} placeholder="Search people, posts and communities" aria-label="Search" className="lune-input h-12 w-full rounded-full pl-11 text-[16px]" />
        </form>
        <div className="mb-4 flex gap-1 overflow-x-auto text-sm" role="tablist">
          {(['all', 'people', 'posts', 'communities'] as const).map(value => (
            <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={cn('shrink-0 rounded-full px-4 py-1.5 capitalize transition-colors', tab === value ? 'bg-lune-500/25 text-white' : 'text-white/50 hover:text-white')}>
              {value}{value !== 'all' && q && !loading ? ` · ${counts[value]}` : ''}
            </button>
          ))}
        </div>

        {loading && <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Searching…</div>}
        {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
        {!q && <div className="lune-card"><EmptyState icon={SearchIcon} title="Search Lune">Find people, posts and communities. Try a name, a topic, or a #hashtag.</EmptyState></div>}
        {empty && <div className="lune-card"><EmptyState icon={SearchIcon} title={`Nothing found for “${q}”`}>Check the spelling, or try a shorter word.</EmptyState></div>}

        {!loading && !error && (
          <div className="space-y-5">
            {show('people') && people.length > 0 && (
              <section className="rounded-3xl border border-white/10 glass-soft p-2">
                <h2 className="px-3 pb-1 pt-3 font-display text-sm font-semibold text-white/60">People</h2>
                {(tab === 'all' ? people.slice(0, 4) : people).map(person => (
                  <Link key={person.id} to={`/profile/${encodeURIComponent(person.username)}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.04]">
                    <Avatar className="h-10 w-10 ring-1 ring-white/10"><AvatarImage src={person.avatar_url} /><AvatarFallback className="bg-lune-900 text-xs text-lune-200">{displayNameOf(person)[0]?.toUpperCase()}</AvatarFallback></Avatar>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{displayNameOf(person)} <VerifiedBadge username={person.username} /></span><span className="block truncate text-xs text-white/40">@{person.username}</span></span>
                  </Link>
                ))}
              </section>
            )}
            {show('communities') && communities.length > 0 && (
              <section className="rounded-3xl border border-white/10 glass-soft p-2">
                <h2 className="px-3 pb-1 pt-3 font-display text-sm font-semibold text-white/60">Communities</h2>
                {(tab === 'all' ? communities.slice(0, 4) : communities).map(community => (
                  <Link key={community.id} to={`/communities/${community.slug}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.04]">
                    <CommunityAvatar community={community} className="h-10 w-10 text-sm" />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{community.name}</span><span className="block truncate text-xs text-white/40">{community.member_count.toLocaleString()} {community.member_count === 1 ? 'member' : 'members'}</span></span>
                  </Link>
                ))}
              </section>
            )}
            {show('posts') && visiblePosts.length > 0 && (
              <section className="overflow-hidden rounded-3xl border border-white/10 glass-soft divide-y divide-white/[0.06]">
                {(tab === 'all' ? visiblePosts.slice(0, 8) : visiblePosts).map(post => <FeedCard key={post.id} post={post} />)}
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search;
