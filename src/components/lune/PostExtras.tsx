import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VerifiedBadge from '@/components/lune/VerifiedBadge';
import { useWallet } from '@/context/WalletContext';
import type { Post } from '@/context/SocialContext';
import { api } from '@/lib/api';
import { displayNameOf } from '@/lib/names';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';

type Quote = NonNullable<Post['quote']>;
type Poll = NonNullable<Post['poll']>;

/** A quoted post, shown small inside the post that quotes it. Tapping it opens the original. */
export const QuoteCard = ({ quote, compact = false }: { quote: Quote; compact?: boolean }) => (
  <Link to={`/post/${quote.id}`} onClick={event => event.stopPropagation()} className="mt-3 block rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]">
    <div className="flex items-center gap-1.5 text-[13px]">
      <Avatar className="h-5 w-5 ring-1 ring-white/10"><AvatarImage src={quote.profiles?.avatar_url} /><AvatarFallback className="bg-lune-900 text-[9px] text-lune-200">{displayNameOf(quote.profiles)[0]?.toUpperCase()}</AvatarFallback></Avatar>
      <span className="truncate font-semibold text-white">{displayNameOf(quote.profiles)}</span>
      <VerifiedBadge username={quote.profiles?.username} />
      {quote.profiles?.username && <span className="truncate text-white/35">@{quote.profiles.username}</span>}
      <span className="shrink-0 text-white/30">· {formatDistanceToNowStrict(new Date(quote.created_at))}</span>
    </div>
    {quote.content && <p className={cn('mt-1 whitespace-pre-wrap break-words text-sm text-white/75', compact ? 'line-clamp-3' : 'line-clamp-6')}>{quote.content}</p>}
    {quote.images?.length > 0 && <img src={quote.images[0]} alt="" loading="lazy" className="mt-2 max-h-48 w-full rounded-xl object-cover" />}
  </Link>
);

/** A poll inside a post: tap an option to vote; after voting (or once it closes) everyone sees the results. */
export const PollView = ({ postId, poll: initial }: { postId: string; poll: Poll }) => {
  const { user } = useWallet();
  const [poll, setPoll] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { setPoll(initial); }, [initial]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);

  const closesAt = new Date(poll.closes_at).getTime();
  const closed = closesAt <= now;
  const mine = user ? poll.votes.find(vote => vote.user_id === user.id)?.option : undefined;
  const showResults = closed || mine !== undefined;
  const total = poll.votes.length;
  const counts = poll.options.map((_, index) => poll.votes.filter(vote => vote.option === index).length);
  const top = Math.max(...counts);

  const vote = async (option: number) => {
    if (!user || busy || showResults) return;
    setBusy(true);
    setPoll(current => ({ ...current, votes: [...current.votes, { user_id: user.id, option }] }));
    try {
      setPoll(await api<Poll>(`/api/posts/${postId}/vote`, { method: 'POST', body: { option } }));
    } catch (cause) {
      setPoll(initial);
      showError(cause instanceof Error ? cause.message : 'Your vote could not be saved. Please try again.');
    } finally { setBusy(false); }
  };

  const left = closed ? 'Final results' : `${formatDistanceToNowStrict(closesAt)} left`;
  return (
    <div className="mt-3 max-w-md space-y-2" onClick={event => event.stopPropagation()}>
      {poll.options.map((option, index) => {
        const share = total ? Math.round((counts[index] / total) * 100) : 0;
        return showResults ? (
          <div key={index} className="relative overflow-hidden rounded-xl border border-white/10 px-3 py-2 text-sm">
            <div className={cn('absolute inset-y-0 left-0 rounded-xl transition-all duration-500', counts[index] === top && top > 0 ? 'bg-lune-500/35' : 'bg-white/10')} style={{ width: `${share}%` }} />
            <div className="relative flex items-center justify-between gap-3">
              <span className={cn('flex items-center gap-1.5', counts[index] === top && top > 0 && 'font-semibold text-white')}>{option}{mine === index && <Check size={14} className="text-lune-200" aria-label="Your vote" />}</span>
              <span className="tabular-nums text-white/70">{share}%</span>
            </div>
          </div>
        ) : (
          <button key={index} type="button" disabled={!user || busy} onClick={() => void vote(index)}
            className="block w-full rounded-full border border-lune-400/40 px-4 py-2 text-sm font-semibold text-lune-100 transition-colors hover:bg-lune-500/15 disabled:opacity-60">
            {option}
          </button>
        );
      })}
      <p className="text-xs text-white/40">{total.toLocaleString()} {total === 1 ? 'vote' : 'votes'} · {left}{!user && !closed ? ' · Log in to vote' : ''}</p>
    </div>
  );
};
