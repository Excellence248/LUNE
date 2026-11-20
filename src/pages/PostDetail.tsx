import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle, ListTree } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import FeedCard from '@/components/lune/FeedCard';
import { EmptyState } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { useSocial, type Post } from '@/context/SocialContext';
import { api, orNull } from '@/lib/api';

const PostView = ({ id }: { id: string }) => {
  const { posts: feedPosts } = useSocial();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [thread, setThread] = useState<Post[]>([]);

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
        const data = await orNull(api<Post>(`/api/posts/${id}`));
        if (active) setPost(data);
        if (data && (data.thread_count || data.thread_root_id)) {
          const full = await api<{ items: Post[] }>(`/api/posts/${id}/thread`).catch(() => null);
          if (active) setThread(full?.items ?? []);
        } else if (active) setThread([]);
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
        {post ? <div className="overflow-hidden rounded-3xl border border-white/10 glass-soft">{thread.length > 1 && <p className="flex items-center gap-1.5 border-b border-white/[0.06] px-6 py-2.5 text-xs font-semibold text-lune-200"><ListTree size={13} />Thread · {thread.length} posts</p>}{thread.length > 1 ? thread.map(part => <div key={part.id} className={part.id === id ? 'bg-white/[0.03]' : ''}><FeedCard post={part.id === post.id ? post : part} initialCommentsOpen={part.id === id} /></div>) : <FeedCard post={post} initialCommentsOpen />}</div> : loading ? <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /> Loading post…</div> : !error && <div className="lune-card"><EmptyState icon={MessageCircle} title="Post not found">This post is no longer available, or the link is incorrect.</EmptyState></div>}
      </div>
    </Layout>
  );
};

const PostDetail = () => {
  const { id = '' } = useParams();
  return <PostView key={id} id={id} />;
};

export default PostDetail;
