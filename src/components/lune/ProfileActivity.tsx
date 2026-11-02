import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/lune/Brand';
import FeedCard from '@/components/lune/FeedCard';
import { useSocial, type Post } from '@/context/SocialContext';
import { supabase } from '@/lib/supabase';

interface ProfileActivityProps {
  user: { id: string; username: string; avatar: string; walletAddress: string };
  kind: 'posts' | 'reposts';
}

const ProfileActivity = ({ user, kind }: ProfileActivityProps) => {
  const { posts: feedPosts } = useSocial();
  const [posts, setPosts] = useState<Post[]>([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchActivity = async () => {
      setLoading(true);
      setError('');
      try {
        const selection = '*, profiles(username, avatar_url, wallet_address), likes(user_id), reposts(user_id), replies(*, profiles(username, avatar_url, wallet_address))';
        const query = kind === 'reposts'
          ? supabase.from('posts').select(`${selection}, matched_reposts:reposts!inner(user_id)`).eq('matched_reposts.user_id', user.id)
          : supabase.from('posts').select(selection).eq('user_id', user.id);
        const { data, error: queryError } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).order('created_at', { referencedTable: 'replies', ascending: true }).limit(limit + 1);
        if (queryError) throw queryError;
        if (!active) return;
        setPosts((data || []).slice(0, limit) as unknown as Post[]);
        setHasMore((data?.length || 0) > limit);
      } catch {
        if (active) setError('Your activity could not be loaded. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchActivity();
    return () => { active = false; };
  }, [user.id, kind, limit, retry, feedPosts]);

  return (
    <div>
      <div className="divide-y divide-white/[0.06]">
        {posts.map(post => (
          <FeedCard key={post.id} post={{
            ...post,
            profiles: post.user_id === user.id ? { username: user.username, avatar_url: user.avatar, wallet_address: user.walletAddress } : post.profiles,
            repostedBy: kind === 'reposts' ? user.username : undefined,
          }} />
        ))}
      </div>
      {loading && <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading activity…</div>}
      {error && <div className="space-y-3 p-6 text-center"><p role="alert" className="text-sm text-red-200">{error}</p><Button variant="outline" onClick={() => setRetry(previous => previous + 1)}>Try again</Button></div>}
      {!loading && !error && posts.length === 0 && <EmptyState title={kind === 'posts' ? 'Your story starts here' : 'No reposts yet'}>{kind === 'posts' ? 'Share your first post from the feed. It will appear here.' : 'Repost something worth sharing and find it here.'}</EmptyState>}
      {!loading && !error && hasMore && <div className="p-5 text-center"><Button variant="outline" className="rounded-full border-white/10" onClick={() => setLimit(previous => previous + 30)}>Load more</Button></div>}
    </div>
  );
};

export default ProfileActivity;
