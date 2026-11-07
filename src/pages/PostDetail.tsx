import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import { EmptyState } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { postSelect, useSocial, type Post } from '@/context/SocialContext';
import { supabase } from '@/lib/supabase';

const PostView = ({ id }: { id: string }) => {
  const { posts: feedPosts } = useSocial();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchPost = async () => {
      setLoading(true);
      setError('');
      try {
        if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
          if (active) setPost(null);
          return;
        }
        const { data, error: queryError } = await supabase.from('posts').select(postSelect).eq('id', id).order('created_at', { referencedTable: 'replies', ascending: true }).maybeSingle();
        if (queryError) throw queryError;
        if (active) setPost(data as unknown as Post | null);
      } catch {
        if (active) setError('This post could not be loaded. Check your connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchPost();
    return () => { active = false; };
  }, [id, feedPosts, retry]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3"><Button asChild variant="ghost" size="icon" className="rounded-full"><Link to="/" aria-label="Back to feed"><ArrowLeft size={20} /></Link></Button><h1 className="font-display text-xl font-bold">Post</h1></div>
        {error && <div className="mb-4 space-y-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4"><p role="alert" className="text-sm text-red-200">{error}</p><Button variant="outline" disabled={loading} onClick={() => setRetry(previous => previous + 1)}>Try again</Button></div>}
        {post ? <div className="overflow-hidden rounded-3xl border border-white/10 glass-soft"><FeedCard post={post} initialCommentsOpen /></div> : loading ? <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /> Loading post…</div> : !error && <div className="lune-card"><EmptyState icon={MessageCircle} title="Post not found">This post is no longer available, or the link is incorrect.</EmptyState></div>}
      </div>
    </Layout>
  );
};

const PostDetail = () => {
  const { id = '' } = useParams();
  return <PostView key={id} id={id} />;
};

export default PostDetail;
