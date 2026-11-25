import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Loader2 } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import { EmptyState, PageHeader } from '@/components/lune/Brand';
import { useSocial, type Post } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { api } from '@/lib/api';

/** Your saved posts. Only you can see them. */
const Bookmarks = () => {
  const { user, loading } = useWallet();
  const { isBookmarked } = useSocial();
  const [items, setItems] = useState<Post[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    api<{ available: boolean; items: Post[] }>('/api/me/bookmarks')
      .then(data => { if (active) setItems(data.items); })
      .catch(() => { if (active) setError('Your saved posts could not be loaded. Check your connection and try again.'); });
    return () => { active = false; };
  }, [user?.id]);

  // A post you un-save here disappears from the list straight away.
  const shown = items?.filter(post => isBookmarked(post.id)) ?? null;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Saved" icon={Bookmark} title="Your bookmarks" description="Posts you saved to come back to. Only you can see this list." />
        {!user && !loading && <div className="lune-card"><EmptyState icon={Bookmark} title="Log in to see your saved posts"><Link to="/signin" className="text-lune-300 hover:underline">Log in</Link> to save posts and find them here.</EmptyState></div>}
        {user && error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {user && !error && !shown && <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>}
        {shown && !shown.length && <div className="lune-card"><EmptyState icon={Bookmark} title="Nothing saved yet">Tap the bookmark under any post to save it here.</EmptyState></div>}
        {shown && shown.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-white/10 glass-soft divide-y divide-white/[0.06]">
            {shown.map(post => <FeedCard key={post.id} post={post} />)}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Bookmarks;
