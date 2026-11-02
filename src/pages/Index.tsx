import { useState } from 'react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import CreatePost from '@/components/lune/CreatePost';
import TrendingSidebar from '@/components/lune/TrendingSidebar';
import { EmptyState } from '@/components/lune/Brand';
import { RefreshCw, Info, Inbox, AlertTriangle } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';

const PostSkeleton = () => (
  <div className="p-5 md:px-6 flex gap-3.5 animate-pulse">
    <div className="h-11 w-11 rounded-full bg-white/[0.06]" />
    <div className="flex-1 space-y-3 pt-1">
      <div className="h-3 w-32 rounded-full bg-white/[0.06]" />
      <div className="h-3 w-full rounded-full bg-white/[0.04]" />
      <div className="h-3 w-2/3 rounded-full bg-white/[0.04]" />
    </div>
  </div>
);

const Index = () => {
  const { posts, refreshFeed, loading, feedError } = useSocial();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFeed();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Layout noPadding className="flex justify-center gap-8 xl:px-8">
      <div className="flex-1 w-full max-w-2xl min-w-0 lg:border-x border-white/[0.06] bg-background/40">
        <div className="sticky top-16 lg:top-[72px] z-30 px-4 md:px-6 h-14 flex items-center justify-between border-b border-white/[0.06] bg-[hsl(260_40%_3%/0.75)] backdrop-blur-2xl">
          <h1 className="font-display text-lg font-bold">Home</h1>
          <button
            aria-label="Refresh feed"
            disabled={refreshing || loading}
            onClick={handleRefresh}
            className="h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:text-lune-300 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <CreatePost />

        <div className="mx-4 md:mx-6 my-3 flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs text-white/40 leading-relaxed">
          <Info size={14} className="mt-0.5 shrink-0 text-lune-300/70" />
          <p>Posts are user-submitted and not fact-checked. Nothing here is financial advice.</p>
        </div>

        <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {loading ? (
            <div role="status" aria-label="Loading posts">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : feedError ? (
            <EmptyState icon={AlertTriangle} title="Feed couldn't load">
              <span role="alert">{feedError}</span>
            </EmptyState>
          ) : posts.length ? (
            posts.map(post => <FeedCard key={post.id} post={post} />)
          ) : (
            <EmptyState icon={Inbox} title="No posts yet">
              Be the first to share something with the community.
            </EmptyState>
          )}
        </div>
      </div>
      <TrendingSidebar />
    </Layout>
  );
};

export default Index;
