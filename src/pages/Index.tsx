import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import CreatePost from '@/components/lune/CreatePost';
import TrendingSidebar from '@/components/lune/TrendingSidebar';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';

const Index = () => {
  const { posts, refreshFeed, loading, feedError } = useSocial();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshFeed(); } finally { setRefreshing(false); }
  };

  return (
    <Layout noPadding className="flex flex-col lg:flex-row">
      <div className="flex-1 border-r border-white/5 w-full lg:max-w-3xl">
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-xl font-bold">Feed</h1>
          <Button variant="ghost" size="icon" aria-label="Refresh feed" disabled={refreshing || loading} onClick={handleRefresh}>
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
        <div className="p-4 md:p-6 border-b border-white/5 space-y-4">
          <p className="text-sm text-gray-400">Posts come from the app database and are user-submitted, not fact-checked. Market pages show third-party API data; unconnected features are marked unavailable.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="bg-white/5 border-white/10"><Link to="/explorer">Market Explorer</Link></Button>
            <Button asChild variant="outline" className="bg-white/5 border-white/10"><Link to="/analytics">Market Analytics</Link></Button>
          </div>
        </div>
        <CreatePost />
        <div className="divide-y divide-white/5">
          {loading ? (
            <p className="py-12 text-center text-gray-400" role="status">Loading posts…</p>
          ) : feedError ? (
            <p className="py-12 px-6 text-center text-gray-400" role="alert">{feedError}</p>
          ) : posts.length ? posts.map(post => <FeedCard key={post.id} post={post} />) : (
            <p className="py-12 text-center text-gray-500">No posts were returned from the database.</p>
          )}
        </div>
      </div>
      <TrendingSidebar />
    </Layout>
  );
};

export default Index;
