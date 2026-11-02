"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Repeat2, Heart, Coins, SendHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import TipModal from './TipModal';
import { useSocial, type Post, type Reply } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { formatDistanceToNowStrict } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { showError } from '@/utils/toast';
import { shortWalletAddress } from '@/lib/solana-wallet';

interface FeedCardProps {
  post: Post & { repostedBy?: string };
  initialCommentsOpen?: boolean;
}

/** Highlight $TICKER cashtags and link them to the token page. */
const renderContent = (text: string, onTicker: (t: string) => void) =>
  text.split(/(\$[A-Za-z][A-Za-z0-9]{1,9}\b)/g).map((part, i) =>
    /^\$[A-Za-z][A-Za-z0-9]{1,9}$/.test(part) ? (
      <button
        key={i}
        onClick={e => {
          e.stopPropagation();
          onTicker(part.slice(1).toUpperCase());
        }}
        className="font-semibold text-lune-300 hover:text-lune-200 hover:underline underline-offset-2"
      >
        {part}
      </button>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );

const shortAgo = (date: string) =>
  formatDistanceToNowStrict(new Date(date))
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y');

const ActionButton = ({
  icon: Icon,
  count,
  active,
  tone,
  label,
  disabled,
  onClick,
  fill,
}: {
  icon: React.ElementType;
  count?: number;
  active?: boolean;
  tone: 'lune' | 'up' | 'pink' | 'amber';
  label: string;
  disabled?: boolean;
  onClick: () => void;
  fill?: boolean;
}) => {
  const tones = {
    lune: ['text-lune-300', 'group-hover/btn:text-lune-300', 'group-hover/btn:bg-lune-400/10', 'bg-lune-400/10'],
    up: ['text-emerald-400', 'group-hover/btn:text-emerald-400', 'group-hover/btn:bg-emerald-400/10', 'bg-emerald-400/10'],
    pink: ['text-pink-400', 'group-hover/btn:text-pink-400', 'group-hover/btn:bg-pink-400/10', 'bg-pink-400/10'],
    amber: ['text-amber-300', 'group-hover/btn:text-amber-300', 'group-hover/btn:bg-amber-300/10', 'bg-amber-300/10'],
  }[tone];
  return (
    <button
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'group/btn flex items-center gap-1 text-white/40 transition-colors disabled:opacity-40 disabled:pointer-events-none',
        active ? tones[0] : tones[1]
      )}
    >
      <span className={cn('h-8 w-8 rounded-full flex items-center justify-center transition-colors', active ? tones[3] : tones[2])}>
        <Icon size={17} strokeWidth={1.9} className={cn(fill && active && 'fill-current')} />
      </span>
      {count !== undefined && <span className="text-xs font-medium tabular-nums min-w-[1ch]">{count > 0 ? count : ''}</span>}
    </button>
  );
};

const FeedCard = ({ post: sourcePost, initialCommentsOpen = false }: FeedCardProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useWallet();
  const { toggleLike, toggleRepost, addComment, followUser, unfollowUser, isFollowing, followingLoading, followingError } = useSocial();
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [showComments, setShowComments] = useState(initialCommentsOpen);
  const [commentInput, setCommentInput] = useState('');
  const [pending, setPending] = useState(false);
  const [likeOverride, setLikeOverride] = useState<{ userId: string; active: boolean } | null>(null);
  const [repostOverride, setRepostOverride] = useState<{ userId: string; active: boolean } | null>(null);
  const [savedReplies, setSavedReplies] = useState<Reply[]>([]);
  const busy = useRef(false);

  useEffect(() => { setLikeOverride(null); }, [sourcePost.likes, currentUser?.id]);
  useEffect(() => { setRepostOverride(null); }, [sourcePost.reposts, currentUser?.id]);
  useEffect(() => { setCommentInput(''); setSavedReplies([]); }, [sourcePost.id, currentUser?.id]);

  const post = {
    ...sourcePost,
    likes: likeOverride ? [...(sourcePost.likes || []).filter(row => row.user_id !== likeOverride.userId), ...(likeOverride.active ? [{ user_id: likeOverride.userId }] : [])] : sourcePost.likes,
    reposts: repostOverride ? [...(sourcePost.reposts || []).filter(row => row.user_id !== repostOverride.userId), ...(repostOverride.active ? [{ user_id: repostOverride.userId }] : [])] : sourcePost.reposts,
    replies: [...(sourcePost.replies || []), ...savedReplies.filter(reply => !sourcePost.replies?.some(row => row.id === reply.id))],
  };
  const isLiked = currentUser ? post.likes?.some(l => l.user_id === currentUser.id) : false;
  const isReposted = currentUser ? post.reposts?.some(r => r.user_id === currentUser.id) : false;
  const following = isFollowing(post.user_id);
  const isOwnPost = currentUser?.id === post.user_id;

  const handleAction = async (action: () => Promise<unknown>) => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    try {
      await action();
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : 'The action could not be saved. Check your login session and try again.');
      return false;
    } finally { busy.current = false; setPending(false); }
  };

  const handleReaction = async (kind: 'like' | 'repost') => {
    if (!currentUser) return;
    const author = currentUser.id;
    let active = false;
    const succeeded = await handleAction(async () => { active = await (kind === 'like' ? toggleLike(post.id) : toggleRepost(post.id)); });
    if (succeeded) {
      if (kind === 'like') setLikeOverride({ userId: author, active });
      else setRepostOverride({ userId: author, active });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentUser) return;
    let reply: Reply | undefined;
    if (await handleAction(async () => { reply = await addComment(post.id, commentInput); })) {
      const savedReply = reply;
      if (savedReply) setSavedReplies(previous => [...previous, savedReply]);
      setCommentInput('');
    }
  };

  const navigateToProfile = (username?: string) => {
    if (username) navigate(`/profile/${encodeURIComponent(username)}`);
  };

  const goToTicker = (sym: string) => navigate(`/token/${encodeURIComponent(sym)}`);

  const isRepost = post.post_type === 'repost';
  const displayUsername = isRepost ? post.repost_username : post.profiles?.username;
  const displayName = displayUsername && displayUsername === post.profiles?.wallet_address ? shortWalletAddress(displayUsername) : displayUsername;
  const body = isRepost && post.repost_content ? post.repost_content : post.content;

  return (
    <article className="lune-spot lune-spot--soft px-4 md:px-6 py-4 hover:bg-white/[0.015] transition-colors">
      {(post.repostedBy || (isRepost && post.profiles?.username)) && (
        <button
          onClick={() => navigateToProfile(post.repostedBy || post.profiles?.username)}
          className="flex items-center gap-2 mb-2 ml-7 text-xs font-medium text-white/40 hover:text-lune-300 transition-colors"
        >
          <Repeat2 size={14} />
          <span>{post.repostedBy || post.profiles?.username} reposted</span>
        </button>
      )}

      <div className="flex gap-3.5">
        <button onClick={() => navigateToProfile(displayUsername)} className="shrink-0 h-fit" aria-label={`View ${displayUsername || 'user'}'s profile`}>
          <Avatar className="w-11 h-11 ring-1 ring-white/10 hover:ring-lune-400/50 transition-all">
            <AvatarImage src={isRepost ? undefined : post.profiles?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-lune-600/70 to-lune-900 text-lune-100 text-sm font-semibold">
              {displayUsername?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 text-[15px]">
            <button
              onClick={() => navigateToProfile(displayUsername)}
              className="font-semibold text-white hover:underline truncate"
              title={post.profiles?.wallet_address || undefined}
            >
              {displayName || 'Lune user'}
            </button>
            {displayUsername && <span className="text-white/35 truncate hidden sm:inline">@{displayName}</span>}
            <span className="text-white/25">·</span>
            <Link to={`/post/${post.id}`} aria-label="Open post and replies" className="shrink-0 text-sm text-white/35 hover:underline">
              <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}>{shortAgo(post.created_at)}</time>
            </Link>
            {!isOwnPost && currentUser && !isRepost && (
              <button
                disabled={pending || followingLoading || !!followingError}
                title={followingError || undefined}
                onClick={() => handleAction(() => following ? unfollowUser(post.user_id) : followUser(post.user_id))}
                className={cn(
                  'ml-auto shrink-0 text-xs font-semibold h-7 px-3 rounded-full border transition-all disabled:opacity-50',
                  following
                    ? 'border-white/10 text-white/50 hover:text-red-300 hover:border-red-400/30'
                    : 'border-lune-400/40 text-lune-200 bg-lune-500/10 hover:bg-lune-500/20'
                )}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          <p className="selectable mt-1 text-[15px] text-white/85 leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(body, goToTicker)}
          </p>

          {post.image_url && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-white/[0.08] max-w-xl">
              <img src={post.image_url} alt="Post attachment" loading="lazy" className="w-full h-auto max-h-[520px] object-cover" />
            </div>
          )}

          <div className="mt-2 -ml-2 flex items-center justify-between max-w-sm">
            <ActionButton
              icon={MessageCircle}
              tone="lune"
              label="Replies"
              count={post.replies?.length || 0}
              active={showComments}
              onClick={() => setShowComments(!showComments)}
            />
            <ActionButton
              icon={Repeat2}
              tone="up"
              label={!currentUser ? 'Log in to repost' : isReposted ? 'Undo repost' : 'Repost'}
              count={post.reposts?.length || 0}
              active={isReposted}
              disabled={!currentUser || pending}
              onClick={() => handleReaction('repost')}
            />
            <ActionButton
              icon={Heart}
              tone="pink"
              label={!currentUser ? 'Log in to like' : isLiked ? 'Unlike' : 'Like'}
              count={post.likes?.length || 0}
              active={isLiked}
              fill
              disabled={!currentUser || pending}
              onClick={() => handleReaction('like')}
            />
            <ActionButton icon={Coins} tone="amber" label="Tip (unavailable)" onClick={() => setIsTipOpen(true)} />
          </div>

          {showComments && (
            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
              {post.replies?.length ? (
                post.replies.map(reply => (
                  <div key={reply.id} className="flex gap-2.5">
                    <button onClick={() => navigateToProfile(reply.profiles?.username)} className="shrink-0 h-fit">
                      <Avatar className="w-7 h-7 ring-1 ring-white/10">
                        <AvatarImage src={reply.profiles?.avatar_url} />
                        <AvatarFallback className="bg-lune-900 text-[10px] text-lune-200 font-semibold">
                          {reply.profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          onClick={() => navigateToProfile(reply.profiles?.username)}
                          className="font-semibold text-white hover:underline"
                        >
                          {reply.profiles?.username}
                        </button>
                        <span className="text-white/30">{shortAgo(reply.created_at)}</span>
                      </div>
                      <p className="selectable whitespace-pre-wrap text-sm text-white/70 leading-relaxed break-words">{reply.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/35 px-1">No replies yet.</p>
              )}

              {currentUser ? (
                <form onSubmit={handleComment} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInput}
                    disabled={pending}
                    maxLength={1000}
                    aria-label="Write a public reply"
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="Post your public reply"
                    className="lune-input rounded-full px-4 py-2"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim() || pending}
                    aria-label="Send reply"
                    className="lune-btn h-9 w-9 px-0 shrink-0"
                  >
                    <SendHorizontal size={15} />
                  </button>
                </form>
              ) : (
                <p className="text-xs text-white/35 px-1"><Link to="/signin" className="text-lune-300 hover:underline">Log in</Link> to reply.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <TipModal isOpen={isTipOpen} onClose={() => setIsTipOpen(false)} recipient={displayUsername || 'Anonymous'} />
    </article>
  );
};

export default FeedCard;
