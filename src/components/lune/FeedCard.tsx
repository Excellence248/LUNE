"use client";
import VerifiedBadge from '@/components/lune/VerifiedBadge';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Repeat2, Heart, Coins, SendHorizontal, MoreHorizontal, Trash2, Flag, Ban, Users, ListTree } from 'lucide-react';
import ImageGrid from './ImageGrid';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ConfirmDialog, { type Confirm } from './ConfirmDialog';
import ReportDialog from './ReportDialog';
import { cn } from '@/lib/utils';
import TipModal from './TipModal';
import { useSocial, type Post, type Reply, type ReportTarget } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { formatDistanceToNowStrict } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { shortWalletAddress } from '@/lib/solana-wallet';
import { displayNameOf } from '@/lib/names';
import { api } from '@/lib/api';

interface FeedCardProps {
  post: Post & { repostedBy?: string };
  initialCommentsOpen?: boolean;
}

/** Highlight $TICKER cashtags and link them to the token page. */
const renderContent = (text: string, go: (path: string) => void) =>
  text.split(/(\$[A-Za-z][A-Za-z0-9]{1,9}\b|(?<![A-Za-z0-9_])@[A-Za-z0-9_]{3,64}|(?<![A-Za-z0-9_&])#[A-Za-z][A-Za-z0-9_]{1,49})/g).map((part, i) =>
    /^(\$[A-Za-z][A-Za-z0-9]{1,9}|@[A-Za-z0-9_]{3,64}|#[A-Za-z][A-Za-z0-9_]{1,49})$/.test(part) ? (
      <button
        key={i}
        onClick={e => {
          e.stopPropagation();
          if (part[0] === '$') go(`/token/${encodeURIComponent(part.slice(1).toUpperCase())}`);
          else if (part[0] === '@') go(`/profile/${encodeURIComponent(part.slice(1))}`);
          else go(`/search?q=${encodeURIComponent(part)}`);
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
  const { toggleLike, toggleRepost, addComment, followUser, unfollowUser, isFollowing, followingLoading, followingError, deletePost, deleteReply, isBlocked, blockUser } = useSocial();
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [showComments, setShowComments] = useState(initialCommentsOpen);
  const [commentInput, setCommentInput] = useState('');
  const [pending, setPending] = useState(false);
  const [likeOverride, setLikeOverride] = useState<{ userId: string; active: boolean } | null>(null);
  const [repostOverride, setRepostOverride] = useState<{ userId: string; active: boolean } | null>(null);
  const [savedReplies, setSavedReplies] = useState<Reply[]>([]);
  // Which reply the box is answering (null: the post itself), and likes on replies changed here.
  const [replyTarget, setReplyTarget] = useState<Reply | null>(null);
  const [replyLikes, setReplyLikes] = useState<Record<string, { active: boolean; count: number }>>({});
  const replyBox = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => { setLikeOverride(null); }, [sourcePost.likes, currentUser?.id]);
  useEffect(() => { setRepostOverride(null); }, [sourcePost.reposts, currentUser?.id]);
  useEffect(() => { setCommentInput(''); setSavedReplies([]); }, [sourcePost.id, currentUser?.id]);

  const post = {
    ...sourcePost,
    likes: likeOverride ? [...(sourcePost.likes || []).filter(row => row.user_id !== likeOverride.userId), ...(likeOverride.active ? [{ user_id: likeOverride.userId }] : [])] : sourcePost.likes,
    reposts: repostOverride ? [...(sourcePost.reposts || []).filter(row => row.user_id !== repostOverride.userId), ...(repostOverride.active ? [{ user_id: repostOverride.userId }] : [])] : sourcePost.reposts,
    replies: [...(sourcePost.replies || []), ...savedReplies.filter(reply => !sourcePost.replies?.some(row => row.id === reply.id))]
      .filter(reply => !isBlocked(reply.user_id)),
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
    if (await handleAction(async () => { reply = await addComment(post.id, commentInput, replyTarget?.id); })) {
      const savedReply = reply;
      if (savedReply) setSavedReplies(previous => [...previous, savedReply]);
      setCommentInput('');
      setReplyTarget(null);
    }
  };

  const answer = (reply: Reply) => {
    setReplyTarget(reply);
    setShowComments(true);
    requestAnimationFrame(() => replyBox.current?.focus());
  };

  const likeReply = async (reply: Reply) => {
    if (!currentUser) return;
    try {
      const result = await api<{ active: boolean; count: number }>(`/api/replies/${reply.id}/like`, { method: 'POST', body: {} });
      setReplyLikes(previous => ({ ...previous, [reply.id]: result }));
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Your like could not be saved. Please try again.');
    }
  };

  // Replies in conversation order: each reply to the post, then everything that answers it (at any depth).
  const threaded = (() => {
    const list = post.replies ?? [];
    const byId = new Map(list.map(reply => [reply.id, reply]));
    const rootOf = (reply: Reply) => {
      let current = reply;
      for (let hops = 0; current.parent_id && byId.has(current.parent_id) && hops < 50; hops++) current = byId.get(current.parent_id) as Reply;
      return current.id;
    };
    const tops = list.filter(reply => !reply.parent_id || !byId.has(reply.parent_id));
    return tops.flatMap(top => [{ reply: top, nested: false }, ...list.filter(reply => reply.id !== top.id && rootOf(reply) === top.id).map(reply => ({ reply, nested: true }))]);
  })();

  const navigateToProfile = (username?: string) => {
    if (username) navigate(`/profile/${encodeURIComponent(username)}`);
  };

  const goTo = (path: string) => navigate(path);

  const isRepost = post.post_type === 'repost';
  const displayUsername = isRepost ? post.repost_username : post.profiles?.username;
  // The name shown as them (their chosen display name, else username); the @handle is always the username.
  const displayName = displayNameOf({ username: displayUsername, display_name: isRepost ? '' : post.profiles?.display_name, wallet_address: post.profiles?.wallet_address });
  const handle = displayUsername && displayUsername === post.profiles?.wallet_address ? shortWalletAddress(displayUsername) : displayUsername;
  const body = isRepost && post.repost_content ? post.repost_content : post.content;

  const askDeletePost = () => setConfirm({
    title: 'Delete this post?',
    description: 'It disappears for everyone, along with its likes, reposts and replies. This can’t be undone.',
    action: 'Delete',
    run: async () => { await deletePost(post.id); setDeleted(true); showSuccess('Post deleted'); },
  });
  const askBlock = () => setConfirm({
    title: `Block @${displayUsername}?`,
    description: 'You won’t see their posts, and neither of you can follow, reply to, like or repost the other. You can unblock them from their profile.',
    action: 'Block',
    run: async () => { await blockUser(post.user_id); showSuccess(`@${displayUsername} is blocked`); },
  });
  const askDeleteReply = (reply: Reply) => setConfirm({
    title: 'Delete this reply?',
    description: 'It disappears for everyone. This can’t be undone.',
    action: 'Delete',
    run: async () => {
      await deleteReply(post.id, reply.id);
      setSavedReplies(previous => previous.filter(row => row.id !== reply.id));
      showSuccess('Reply deleted');
    },
  });

  if (deleted) return null;

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
              {displayName[0]?.toUpperCase() || 'U'}
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
              {displayName}
            </button>
            <VerifiedBadge username={displayUsername} />
            {handle && <span className="text-white/35 truncate hidden sm:inline">@{handle}</span>}
            <span className="text-white/25">·</span>
            <Link to={`/post/${post.id}`} aria-label="Open post and replies" className="shrink-0 text-sm text-white/35 hover:underline">
              <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}>{shortAgo(post.created_at)}</time>
            </Link>
            <div className="ml-auto flex shrink-0 items-center gap-1">
            {!isOwnPost && currentUser && !isRepost && (
              <button
                disabled={pending || followingLoading || !!followingError}
                title={followingError || undefined}
                onClick={() => handleAction(() => following ? unfollowUser(post.user_id) : followUser(post.user_id))}
                className={cn(
                  'shrink-0 text-xs font-semibold h-7 px-3 rounded-full border transition-all disabled:opacity-50',
                  following
                    ? 'border-white/10 text-white/50 hover:text-red-300 hover:border-red-400/30'
                    : 'border-lune-400/40 text-lune-200 bg-lune-500/10 hover:bg-lune-500/20'
                )}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
            {currentUser && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button aria-label="More options for this post" className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwnPost ? (
                    <DropdownMenuItem className="text-red-300 focus:text-red-200" onSelect={askDeletePost}><Trash2 className="mr-2 h-4 w-4" />Delete post</DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onSelect={() => setReporting({ type: 'post', id: post.id, label: `Post by @${displayUsername}` })}><Flag className="mr-2 h-4 w-4" />Report post</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-300 focus:text-red-200" onSelect={askBlock}><Ban className="mr-2 h-4 w-4" />Block @{displayUsername}</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>
          </div>

          <p className="selectable mt-1 text-[15px] text-white/85 leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(body, goTo)}
          </p>

          <ImageGrid images={post.images?.length ? post.images : post.image_url ? [post.image_url] : []} />

          {(post.community || (!!post.thread_count && !initialCommentsOpen)) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {post.community && <Link to={`/communities/${post.community.slug}`} className="inline-flex items-center gap-1 rounded-full border border-lune-400/25 bg-lune-500/10 px-2.5 py-1 font-medium text-lune-200 hover:bg-lune-500/20"><Users size={12} />{post.community.name}</Link>}
              {!!post.thread_count && !initialCommentsOpen && <Link to={`/post/${post.id}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 font-medium text-white/60 hover:border-lune-400/40 hover:text-white"><ListTree size={12} />Show thread · {post.thread_count + 1} posts</Link>}
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
            {!isOwnPost && <ActionButton icon={Coins} tone="amber" label={currentUser ? `Tip @${displayUsername || 'author'} in USDC` : 'Log in to tip'} disabled={!currentUser} onClick={() => setIsTipOpen(true)} />}
          </div>

          {!showComments && !!post.replies?.length && (() => {
            const count = post.replies.length;
            const latest = post.replies[count - 1];
            return (
              <button type="button" onClick={() => setShowComments(true)} className="mt-2 block w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition-colors hover:bg-white/[0.05]">
                <span className="text-xs font-semibold text-lune-300">{isOwnPost ? `${count} ${count === 1 ? 'reply' : 'replies'} on your post` : `View ${count === 1 ? '1 reply' : `all ${count} replies`}`}</span>
                <span className="mt-0.5 block truncate text-xs text-white/55"><span className="font-semibold text-white/75">{displayNameOf(latest.profiles)}</span> {latest.content}</span>
              </button>
            );
          })()}

          {showComments && (
            <div className="mt-3 rounded-2xl border border-white/[0.06] glass-soft p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white/70">{post.replies?.length ? `${post.replies.length} ${post.replies.length === 1 ? 'reply' : 'replies'}` : 'Replies'}</span>
                {!initialCommentsOpen && <Link to={`/post/${post.id}`} className="text-lune-300 hover:underline">Open post</Link>}
              </div>
              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {threaded.length ? (
                threaded.map(({ reply, nested }) => {
                  const liked = replyLikes[reply.id]?.active ?? !!(currentUser && reply.likes?.some(like => like.user_id === currentUser.id));
                  const likeCount = replyLikes[reply.id]?.count ?? reply.likes?.length ?? 0;
                  return (
                  <div key={reply.id} className={cn('flex gap-2.5', nested && 'ml-4 border-l border-white/10 pl-3')}>
                    <button onClick={() => navigateToProfile(reply.profiles?.username)} className="shrink-0 h-fit">
                      <Avatar className="w-7 h-7 ring-1 ring-white/10">
                        <AvatarImage src={reply.profiles?.avatar_url} />
                        <AvatarFallback className="bg-lune-900 text-[10px] text-lune-200 font-semibold">
                          {displayNameOf(reply.profiles)[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          onClick={() => navigateToProfile(reply.profiles?.username)}
                          className="font-semibold text-white hover:underline"
                        >
                          {displayNameOf(reply.profiles)}
                        </button>
                        <VerifiedBadge username={reply.profiles?.username} />
                        {reply.profiles?.username && <span className="truncate text-white/30">@{reply.profiles.username}</span>}
                        <span className="text-white/30">· {shortAgo(reply.created_at)}</span>
                        {currentUser && (
                          reply.user_id === currentUser.id ? (
                            <button onClick={() => askDeleteReply(reply)} aria-label="Delete your reply" title="Delete reply" className="ml-auto text-white/30 hover:text-red-300"><Trash2 size={13} /></button>
                          ) : (
                            <button onClick={() => setReporting({ type: 'reply', id: reply.id, label: `Reply by @${reply.profiles?.username}` })} aria-label="Report this reply" title="Report reply" className="ml-auto text-white/30 hover:text-amber-300"><Flag size={13} /></button>
                          )
                        )}
                      </div>
                      {nested && reply.reply_to_username && <p className="text-[11px] text-white/35">Replying to <button onClick={() => navigateToProfile(reply.reply_to_username ?? undefined)} className="text-lune-300 hover:underline">@{reply.reply_to_username}</button></p>}
                      <p className="selectable whitespace-pre-wrap text-sm text-white/70 leading-relaxed break-words">{renderContent(reply.content, goTo)}</p>
                      <div className="mt-1 flex items-center gap-4 text-[11px] text-white/40">
                        <button type="button" disabled={!currentUser} onClick={() => answer(reply)} aria-label={`Reply to @${reply.profiles?.username ?? 'this reply'}`} className="flex items-center gap-1 hover:text-lune-300 disabled:opacity-50"><MessageCircle size={13} />Reply</button>
                        <button type="button" disabled={!currentUser} onClick={() => void likeReply(reply)} aria-pressed={liked} aria-label={liked ? 'Unlike reply' : 'Like reply'} className={cn('flex items-center gap-1 transition-colors disabled:opacity-50', liked ? 'text-pink-400' : 'hover:text-pink-400')}>
                          <Heart size={13} className={cn(liked && 'fill-current')} />{likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })
              ) : (
                <p className="text-xs text-white/35 px-1">No replies yet.</p>
              )}
              </div>

              {currentUser ? (
                <form onSubmit={handleComment} className="space-y-1.5 pt-1">
                  {replyTarget && (
                    <p className="flex items-center gap-2 px-1 text-xs text-white/50">
                      Replying to <span className="font-semibold text-lune-300">@{replyTarget.profiles?.username}</span>
                      <button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel replying to this reply" className="ml-auto text-white/40 hover:text-white">✕</button>
                    </p>
                  )}
                  <div className="flex gap-2">
                  <input
                    ref={replyBox}
                    type="text"
                    value={commentInput}
                    disabled={pending}
                    maxLength={1000}
                    aria-label="Write a public reply"
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder={replyTarget ? `Reply to @${replyTarget.profiles?.username ?? 'them'}` : 'Post your public reply'}
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
                  </div>
                </form>
              ) : (
                <p className="text-xs text-white/35 px-1"><Link to="/signin" className="text-lune-300 hover:underline">Log in</Link> to reply.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {isTipOpen && <TipModal isOpen onClose={() => setIsTipOpen(false)} recipient={displayUsername || 'Anonymous'} postId={isRepost && post.original_post_id ? post.original_post_id : post.id} />}
      {reporting && <ReportDialog target={reporting} onClose={() => setReporting(null)} />}
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />}
    </article>
  );
};

export default FeedCard;
