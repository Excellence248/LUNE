import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import CreatePost from '@/components/lune/CreatePost';
import TrendingSidebar from '@/components/lune/TrendingSidebar';
import { EmptyState } from '@/components/lune/Brand';
import GettingStarted from '@/components/lune/GettingStarted';
import WelcomeBurst from '@/components/lune/WelcomeBurst';
import { RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';

const PostSkeleton = () => (
  <div className="p-5 md:px-6 flex gap-3.5 animate-pulse">
    <div className="h-11 w-11 rounded-full glass-soft" />
    <div className="flex-1 space-y-3 pt-1">
      <div className="h-3 w-32 rounded-full glass-soft" />
      <div className="h-3 w-full rounded-full glass-soft" />
      <div className="h-3 w-2/3 rounded-full glass-soft" />
    </div>
  </div>
);

const Index = () => {
  const { posts, refreshFeed, loading, feedError, liveStatus, hasMore, loadMore, loadingMore } = useSocial();
  const { user } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const refreshBusy = useRef(false);
  const handleRefresh = async () => {
    if (refreshBusy.current) return;
    refreshBusy.current = true;
    setRefreshing(true);
    try {
      await refreshFeed();
    } finally {
      refreshBusy.current = false;
      setRefreshing(false);
    }
  };

  return (
    <Layout noPadding className="flex justify-center gap-8 xl:px-8">
      <WelcomeBurst />
      <div className="flex-1 w-full max-w-2xl min-w-0 lg:border-x border-white/[0.06] bg-background/40">
        <div className="sticky top-16 lg:top-[72px] z-30 px-4 md:px-6 h-14 flex items-center justify-between border-b border-white/[0.06] bg-[hsl(260_40%_3%/0.75)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold">Home</h1>
            <span className="text-[11px] text-white/40 flex items-center gap-1.5" title={liveStatus === 'live' ? 'Connected to the live feed' : 'The feed also refreshes every 30 seconds'}>
              <span className={`h-1.5 w-1.5 rounded-full ${liveStatus === 'live' ? 'bg-emerald-400' : 'bg-amber-300'}`} />
              {liveStatus === 'live' ? 'Live' : liveStatus === 'connecting' ? 'Connecting…' : 'Auto-refresh'}
            </span>
          </div>
          <button
            aria-label="Refresh feed"
            disabled={refreshing || loading}
            onClick={handleRefresh}
            className="h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:text-lune-300 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <CreatePost key={user?.id || 'guest'} />

        <GettingStarted />
        <div className="mx-4 md:mx-6 my-3 flex items-start gap-2.5 rounded-2xl border border-white/[0.06] glass-soft px-3.5 py-2.5 text-xs text-white/40 leading-relaxed">
          <Info size={14} className="mt-0.5 shrink-0 text-lune-300/70" />
          <p>Posts are user-submitted and not fact-checked. Nothing here is financial advice.</p>
        </div>

        {feedError && posts.length > 0 && <div className="mx-4 my-3 space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 md:mx-6"><p role="alert" className="text-sm text-amber-200">{feedError}</p><button onClick={handleRefresh} disabled={refreshing} className="text-sm font-semibold text-amber-100 disabled:opacity-50">{refreshing ? 'Retrying…' : 'Retry refresh'}</button></div>}
        <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {posts.length ? (
            posts.map(post => <FeedCard key={post.id} post={post} />)
          ) : loading ? (
            <div role="status" aria-label="Loading posts">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : feedError ? (
            <EmptyState icon={AlertTriangle} title="Feed couldn't load">
              <span role="alert">{feedError}</span>
              <button onClick={handleRefresh} disabled={refreshing} className="lune-btn h-9 mt-4 block mx-auto">{refreshing ? 'Retrying…' : 'Retry'}</button>
            </EmptyState>
          ) : (
            <EmptyState moon title="It’s quiet up here">
              No posts yet. Be the first to share something with the community.
              <span className="mt-4 flex justify-center gap-2">
                {user ? <button onClick={() => { const box = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Write a public post"]'); box?.scrollIntoView({ behavior: 'smooth', block: 'center' }); box?.focus(); }} className="lune-btn h-9">Write a post</button> : <Link to="/signup" className="lune-btn inline-flex h-9 items-center">Create account</Link>}
              </span>
            </EmptyState>
          )}
        </div>
        {hasMore && <div className="p-5 flex justify-center"><button onClick={loadMore} disabled={loadingMore || refreshing} className="lune-btn h-9">{loadingMore ? 'Loading…' : 'Load older posts'}</button></div>}
      </div>
      <TrendingSidebar />
    </Layout>
  );
};

export default Index;
