import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, ChevronDown, Copy, CornerUpLeft, Loader2, MessageCircle, Mic, Palette, Phone, Search, SendHorizontal, Smile, Trash2, Video, X } from 'lucide-react';
import { differenceInDays, format, isSameDay, isToday, isYesterday } from 'date-fns';
import Layout from '@/components/lune/Layout';
import VerifiedBadge from '@/components/lune/VerifiedBadge';
import { EmptyState } from '@/components/lune/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppearancePanel from '@/components/lune/AppearancePanel';
import VoiceBubble from '@/components/lune/VoiceBubble';
import { useSocial, type PublicProfile } from '@/context/SocialContext';
import { useCall } from '@/context/CallContext';
import { useWallet } from '@/context/WalletContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { announceMessagesChanged } from '@/hooks/useUnreadMessages';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useVoiceRecorder, type Recording } from '@/hooks/useVoiceRecorder';
import { ApiError, api, uploadVoice } from '@/lib/api';
import { DEFAULT_CHAT_PRESET, DOODLES_URL, backgroundCss, useAppearance, useIsPortrait } from '@/lib/appearance';
import { displayNameOf } from '@/lib/names';
import { cn } from '@/lib/utils';

interface Conversation {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  last_content: string;
  last_sender_id: string;
  last_at: string;
  last_read?: boolean;
  unread: number;
}

interface ThreadMember { id: string; username: string; display_name: string; avatar_url: string; blocked: boolean }
interface ThreadMessage {
  id: string; sender_id: string; kind: 'text' | 'voice'; content: string; created_at: string; read_at: string | null;
  /** Voice messages only: the recording, its length and the waveform to draw. */
  voice_id?: string | null; duration_ms?: number | null; peaks?: number[] | null;
  /** Replies only: the message this one answers, with its text and author (empty text + reply_voice = a voice message). */
  reply_to_id?: string | null; reply_sender_id?: string | null; reply_content?: string | null; reply_voice?: boolean;
}
interface Features { voice: boolean; replies: boolean }
interface ThreadData { member: ThreadMember; messages: ThreadMessage[]; features: Features; unreadIds: string[] }

const MAX_LENGTH = 2000;
const EMOJIS = ['😀', '😂', '🥰', '😍', '😘', '😎', '🤩', '🥳', '😭', '😡', '🤔', '😴', '👍', '👎', '🙏', '👏', '🙌', '🤝', '👀', '🔥', '💜', '❤️', '💯', '🎉', '🌙', '⭐', '✨', '💫', '🌠', '🚀', '🪐', '☄️', '🌌', '🛸', '👽', '🧑‍🚀'];

// ---------------------------------------------------------------------------------------------
// Opening a conversation should feel instant: remember recent ones (per signed-in member), and warm one
// up when you hover or touch it. A warm-up is a "peek": it never marks anything as read.
const threadCache = new Map<string, { at: number; data: ThreadData }>();
const warming = new Set<string>();
const cacheKey = (me: string, peer: string) => `${me}:${peer}`;
const remember = (me: string, peer: string, data: ThreadData) => {
  threadCache.set(cacheKey(me, peer), { at: Date.now(), data });
  if (threadCache.size > 24) threadCache.delete(threadCache.keys().next().value as string);
};
const warmThread = (me: string, peer: string) => {
  const key = cacheKey(me, peer);
  const hit = threadCache.get(key);
  if ((hit && Date.now() - hit.at < 20_000) || warming.has(key)) return;
  warming.add(key);
  api<ThreadData>(`/api/messages/${peer}?peek=1`)
    .then(data => { if (!threadCache.has(key) || Date.now() - (threadCache.get(key)?.at ?? 0) > 20_000) remember(me, peer, data); })
    .catch(() => undefined)
    .finally(() => warming.delete(key));
};

/** One tick = sent, two = read (as in Telegram). */
const Ticks = ({ read, className }: { read: boolean; className?: string }) =>
  read ? <CheckCheck aria-label="Read" className={cn('h-[15px] w-[15px] text-sky-200', className)} /> : <Check aria-label="Sent" className={cn('h-[15px] w-[15px]', className)} />;

/** The chat wallpaper: a space scene (yours or Nebula), the faint doodle pattern, and a dimming layer for readability. */
const ChatWallpaper = () => {
  const { chat, chatDim, doodles } = useAppearance();
  const portrait = useIsPortrait();
  const css = backgroundCss(chat, DEFAULT_CHAT_PRESET, portrait);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: css ?? undefined }}>
      <div className="absolute inset-0 bg-black" style={{ opacity: chat.kind === 'default' ? 0.18 : chatDim }} />
      {doodles && <div className="absolute inset-0 opacity-[0.075]" style={{ backgroundImage: `url(${DOODLES_URL})`, backgroundSize: '360px 360px' }} />}
    </div>
  );
};

const AppearanceButton = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button type="button" variant="ghost" size="icon" aria-label="Change backgrounds" title="Backgrounds" className="h-9 w-9 rounded-full text-white/75 hover:text-white"><Palette size={18} /></Button>
    </DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl border-white/10 glass-strong text-white sm:max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Backgrounds</DialogTitle>
        <DialogDescription>Choose a space scene for the app and your chats, or use your own picture.</DialogDescription>
      </DialogHeader>
      <AppearancePanel />
    </DialogContent>
  </Dialog>
);

const Person = ({ member, size = 'h-10 w-10' }: { member: { username: string; display_name?: string; avatar_url: string }; size?: string }) => (
  <Avatar className={cn(size, 'shrink-0 ring-1 ring-white/10')}>
    <AvatarImage src={member.avatar_url} className="object-cover" />
    <AvatarFallback className="bg-gradient-to-br from-lune-500 to-lune-800 font-semibold text-white">{displayNameOf(member)[0]?.toUpperCase() || 'U'}</AvatarFallback>
  </Avatar>
);

/** "9:41 AM" today, "Yesterday", the weekday this week, otherwise "12 Nov". */
const listTime = (iso: string) => {
  const date = new Date(iso);
  if (isToday(date)) return format(date, 'p');
  if (isYesterday(date)) return 'Yesterday';
  return differenceInDays(new Date(), date) < 7 ? format(date, 'EEE') : format(date, 'd MMM');
};

/** Left pane: search, All/Unread, and your conversations. */
const ConversationList = ({ conversations, loading, error, activeUsername, myId, onRetry }: {
  conversations: Conversation[]; loading: boolean; error: string; activeUsername?: string; myId: string; onRetry: () => void;
}) => {
  const { searchUsers } = useSocial();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const term = query.trim().replace(/^@/, '');
  const unreadCount = conversations.filter(conversation => conversation.unread > 0).length;
  const shown = filter === 'unread' ? conversations.filter(conversation => conversation.unread > 0) : conversations;

  useEffect(() => {
    if (!term) { setResults([]); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsers(term);
        if (active) setResults(found.filter(person => person.id !== myId));
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [term, searchUsers, myId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-2 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
          <AppearanceButton />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
          <Input value={query} onChange={event => setQuery(event.target.value)} maxLength={64} aria-label="Find someone to message" placeholder="Search people" className="tg-pill h-11 rounded-full pl-10 text-[15px] text-white placeholder:text-white/40" />
        </div>
        {!term && (
          <div role="tablist" aria-label="Filter conversations" className="mt-3 flex gap-1.5">
            {([['all', 'All'], ['unread', 'Unread']] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)}
                className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors', filter === value ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80')}>
                {label}{value === 'unread' && unreadCount > 0 && <span className="ml-1.5 rounded-full bg-lune-500 px-1.5 text-[11px] font-semibold text-white">{unreadCount}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pt-1">
        {term ? (
          <ul aria-label="People" className="px-2">
            {searching && <li className="flex items-center gap-2 px-3 py-3 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</li>}
            {!searching && !results.length && <li className="px-3 py-3 text-sm text-white/45">No one matches “{term}”.</li>}
            {results.map(person => (
              <li key={person.id}>
                <Link to={`/messages/${encodeURIComponent(person.username)}`} onClick={() => setQuery('')} onPointerEnter={() => warmThread(myId, person.id)} onFocus={() => warmThread(myId, person.id)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.07]">
                  <Person member={person as { username: string; display_name?: string; avatar_url: string }} size="h-12 w-12" />
                  <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{displayNameOf(person)} <VerifiedBadge username={person.username} /></p><p className="truncate text-sm text-white/45">@{person.username}</p></div>
                </Link>
              </li>
            ))}
          </ul>
        ) : loading ? (
          <ul aria-hidden className="animate-pulse space-y-1 px-2">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"><span className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-full bg-white/10" /><span className="min-w-0 flex-1 space-y-2"><span className="block h-3.5 w-1/2 rounded bg-white/10" /><span className="block h-3 w-4/5 rounded bg-white/[0.07]" /></span></li>
            ))}
          </ul>
        ) : error ? (
          <div className="space-y-3 p-4"><p role="alert" className="text-sm text-red-200">{error}</p><Button size="sm" variant="outline" onClick={onRetry}>Try again</Button></div>
        ) : shown.length ? (
          <ul aria-label="Conversations" className="space-y-0.5 px-2">
            {shown.map(conversation => {
              const active = activeUsername?.toLowerCase() === conversation.username.toLowerCase();
              const mine = conversation.last_sender_id === myId;
              const warm = () => warmThread(myId, conversation.user_id);
              return (
                <li key={conversation.user_id}>
                  <Link to={`/messages/${encodeURIComponent(conversation.username)}`} aria-current={active ? 'page' : undefined}
                    onPointerEnter={warm} onFocus={warm} onTouchStart={warm}
                    className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors', active ? 'tg-row-active' : 'hover:bg-white/[0.07]')}>
                    <Person member={conversation} size="h-[3.25rem] w-[3.25rem]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-tight">{displayNameOf(conversation)} <VerifiedBadge username={conversation.username} /></p>
                        <time dateTime={conversation.last_at} className={cn('shrink-0 text-xs', active ? 'text-white/80' : conversation.unread ? 'font-medium text-lune-300' : 'text-white/40')}>{listTime(conversation.last_at)}</time>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className={cn('min-w-0 flex-1 truncate text-[14px]', active ? 'text-white/85' : conversation.unread ? 'text-white/80' : 'text-white/50')}>
                          {mine && <span className={active ? 'text-white' : 'text-lune-300'}>You: </span>}{conversation.last_content}
                        </p>
                        {conversation.unread > 0
                          ? <span aria-label={`${conversation.unread} unread`} className={cn('min-w-[1.35rem] shrink-0 rounded-full px-1.5 text-center text-[12px] font-semibold leading-[1.35rem]', active ? 'bg-white text-lune-700' : 'bg-lune-500 text-white')}>{conversation.unread > 99 ? '99+' : conversation.unread}</span>
                          : mine && <Ticks read={!!conversation.last_read} className={cn('shrink-0', active ? 'text-white/90' : conversation.last_read ? 'text-sky-300' : 'text-white/45')} />}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 py-10 text-center text-sm leading-relaxed text-white/45">
            {filter === 'unread' ? 'No unread messages. You’re all caught up ✨' : 'No conversations yet. Search for someone above, or open a profile and tap Message.'}
          </p>
        )}
      </div>
    </div>
  );
};

const MINUTES_5 = 5 * 60 * 1000;
const sameRun = (a?: ThreadMessage, b?: ThreadMessage) =>
  !!a && !!b && a.sender_id === b.sender_id && isSameDay(new Date(a.created_at), new Date(b.created_at)) && new Date(b.created_at).getTime() - new Date(a.created_at).getTime() < MINUTES_5;

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, date.getFullYear() === new Date().getFullYear() ? 'MMMM d' : 'MMMM d, yyyy');
};

const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const signatureOf = (list: ThreadMessage[]) => list.map(message => `${message.id}:${message.read_at ? 1 : 0}`).join(',');

// Web addresses in a message become links (http and https only).
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;
const renderText = (text: string): ReactNode[] =>
  text.split(URL_PATTERN).map((part, index) => {
    if (index % 2 === 0) return part;
    const [, url = part, trailing = ''] = /^(.*?)([.,!?;:)\]]*)$/.exec(part) ?? [];
    return (
      <Fragment key={index}>
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" onClick={event => event.stopPropagation()} className="break-all underline decoration-white/40 underline-offset-2 hover:decoration-white">{url}</a>{trailing}
      </Fragment>
    );
  });

/** One to three emoji and nothing else: shown big, without a bubble (as WhatsApp and Telegram do). */
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}[️‍\u{1F3FB}-\u{1F3FF}\p{Extended_Pictographic}]*){1,3}$/u;
const isEmojiOnly = (text: string) => EMOJI_ONLY.test(text.replace(/\s+/g, ''));

/** A round glass button, as in Telegram's floating controls. */
const CircleButton = ({ label, onClick, disabled, children, className, type = 'button' }: { label: string; onClick?: () => void; disabled?: boolean; children: ReactNode; className?: string; type?: 'button' | 'submit' }) => (
  <button type={type} onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className={cn('tg-pill flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/85 transition-all hover:text-white active:scale-95 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lune-300', className)}>
    {children}
  </button>
);

const REPLY_SWIPE = 52;
const HOLD_MS = 420;

interface RowProps {
  message: ThreadMessage; mine: boolean; startsRun: boolean; endsRun: boolean;
  canReply: boolean; myId: string; peerName: string; flash: boolean;
  onReply: (message: ThreadMessage) => void; onJump: (id: string) => void;
}

/**
 * One message. On a touch screen, swipe it to the right to reply; with a mouse, use the buttons that
 * appear beside it. Tapping a quote jumps to the message it answers.
 */
const MessageRow = memo(({ message, mine, startsRun, endsRun, canReply, myId, peerName, flash, onReply, onJump }: RowProps) => {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [armed, setArmed] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef({ id: -1, x: 0, y: 0, active: false, dx: 0, armed: false });
  const stopHold = () => { if (hold.current) { clearTimeout(hold.current); hold.current = null; } };
  useEffect(() => stopHold, []);

  const voice = message.kind === 'voice' && !!message.voice_id;
  const bare = !voice && !message.reply_to_id && isEmojiOnly(message.content);
  const hasQuote = !!message.reply_to_id && (message.reply_voice || message.reply_content != null);
  const time = format(new Date(message.created_at), 'p');
  const meta = (
    <span className={cn('flex items-center gap-1 text-[11px] leading-none', bare ? 'text-white/60' : mine ? 'text-white/75' : 'text-white/45')} title={new Date(message.created_at).toLocaleString()}>
      {time}{mine && <Ticks read={!!message.read_at} />}
    </span>
  );

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canReply || event.pointerType === 'mouse') return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false, dx: 0, armed: false };
    // Holding a message opens its menu, like on WhatsApp.
    stopHold();
    hold.current = setTimeout(() => { hold.current = null; drag.current.id = -1; navigator.vibrate?.(15); setMenu(true); }, HOLD_MS);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.active) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) stopHold();
      // Clearly vertical: the member is scrolling, leave it to the browser.
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.4) { state.id = -1; return; }
      if (dx <= 8 || dx < Math.abs(dy) * 0.9) return;
      state.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    state.dx = Math.max(0, Math.min(dx, 110));
    const nowArmed = state.dx >= REPLY_SWIPE;
    if (nowArmed !== state.armed) { state.armed = nowArmed; setArmed(nowArmed); if (nowArmed) navigator.vibrate?.(10); }
    setOffset(state.dx * 0.85);
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    stopHold();
    const state = drag.current;
    if (state.id !== event.pointerId) return;
    const triggered = state.active && state.dx >= REPLY_SWIPE && event.type !== 'pointercancel';
    state.id = -1;
    setDragging(false);
    setArmed(false);
    setOffset(0);
    if (triggered) onReply(message);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard unavailable */ }
  };

  const actions = (canReply || !voice) && (
    <div className={cn('flex shrink-0 items-center gap-0.5 self-center [@media(pointer:coarse)]:hidden opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100', mine ? 'order-first' : 'order-last')}>
      {canReply && <button type="button" onClick={() => onReply(message)} aria-label="Reply" title="Reply" className="tg-pill flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white"><CornerUpLeft size={15} /></button>}
      {!voice && <button type="button" onClick={() => void copy()} aria-label={copied ? 'Copied' : 'Copy text'} title={copied ? 'Copied' : 'Copy'} className="tg-pill flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white">{copied ? <Check size={15} /> : <Copy size={14} />}</button>}
    </div>
  );

  const quote = hasQuote && (
    <button type="button" onClick={() => onJump(message.reply_to_id as string)}
      className={cn('mb-1 block w-full min-w-[9rem] rounded-lg border-l-[3px] px-2 py-1 text-left transition-colors', mine ? 'border-white/85 bg-black/15 hover:bg-black/25' : 'border-lune-300 bg-white/[0.06] hover:bg-white/10')}>
      <span className={cn('block truncate text-[13px] font-semibold leading-tight', mine ? 'text-white' : 'text-lune-300')}>{message.reply_sender_id === myId ? 'You' : peerName}</span>
      <span className="line-clamp-2 block text-[13px] leading-snug text-white/75">{message.reply_voice ? '🎤 Voice message' : message.reply_content}</span>
    </button>
  );

  return (
    <div id={`msg-${message.id}`} className={cn('tg-row group/row relative flex px-2.5', mine ? 'justify-end' : 'justify-start', startsRun ? 'mt-2.5' : 'mt-[3px]', flash && 'tg-flash')}
      style={{ touchAction: 'pan-y' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {canReply && (
        <span aria-hidden className={cn('pointer-events-none absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors', armed ? 'bg-lune-500' : 'bg-white/15')}
          style={{ opacity: Math.min(1, offset / 36), transform: `translateY(-50%) scale(${0.6 + 0.4 * Math.min(1, offset / 44) + (armed ? 0.15 : 0)})` }}>
          <CornerUpLeft size={16} />
        </span>
      )}
      <div className={cn('flex max-w-[86%] items-end gap-1.5 sm:max-w-[72%]', mine ? 'flex-row' : 'flex-row')} style={{ transform: `translateX(${offset}px)`, transition: dragging ? 'none' : 'transform 0.2s ease-out' }}>
        {mine && actions}
        {bare ? (
          <div className="px-1">
            <div className="text-[2.7rem] leading-[1.15]">{message.content}</div>
            <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>{meta}</div>
          </div>
        ) : (
          <div className={cn('tg-bubble min-w-0 rounded-[18px]', mine ? 'tg-out' : 'tg-in',
            endsRun ? (mine ? 'tg-tail-out rounded-br-[4px]' : 'tg-tail-in rounded-bl-[4px]') : (mine ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'),
            !startsRun && (mine ? 'rounded-tr-[6px]' : 'rounded-tl-[6px]'),
            voice ? 'px-3 pb-1.5 pt-2.5' : 'selectable whitespace-pre-wrap break-words px-3 pb-[7px] pt-[7px] text-[15.5px] leading-[1.35]')}>
            {quote}
            {voice ? (
              <>
                <VoiceBubble voiceId={message.voice_id as string} durationMs={message.duration_ms ?? 1000} peaks={message.peaks ?? null} mine={mine} />
                <div className="mt-1 flex justify-end">{meta}</div>
              </>
            ) : (
              <>
                {renderText(message.content)}
                {/* Reserves room at the end of the last line; the time sits in it, bottom right. */}
                <span aria-hidden className={cn('inline-block h-0', mine ? 'w-[4.6rem]' : 'w-[3.4rem]')} />
                <span className="absolute bottom-[5px] right-2.5">{meta}</span>
              </>
            )}
          </div>
        )}
        {!mine && actions}
      </div>
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onPointerDown={() => setMenu(false)} />
          <div role="menu" className={cn('absolute z-50 flex overflow-hidden rounded-2xl border border-white/10 bg-[#1b1530]/95 text-sm text-white shadow-xl backdrop-blur-xl', mine ? 'right-3' : 'left-3', startsRun ? '-top-11' : '-top-10')}>
            {canReply && <button role="menuitem" type="button" onClick={() => { setMenu(false); onReply(message); }} className="flex items-center gap-2 px-4 py-2.5 active:bg-white/10"><CornerUpLeft size={15} />Reply</button>}
            {!voice && <button role="menuitem" type="button" onClick={() => { setMenu(false); void copy(); }} className="flex items-center gap-2 px-4 py-2.5 active:bg-white/10"><Copy size={14} />Copy</button>}
          </div>
        </>
      )}
    </div>
  );
});
MessageRow.displayName = 'MessageRow';

/** Placeholder bubbles while a conversation loads for the first time. */
const ThreadSkeleton = () => (
  <div aria-hidden className="animate-pulse space-y-3 px-5 py-4">
    {[['w-44', false], ['w-64', true], ['w-36', false], ['w-56', true], ['w-28', false], ['w-48', true]].map(([width, mine], index) => (
      <div key={index} className={cn('flex', mine ? 'justify-end' : 'justify-start')}><div className={cn('h-10 rounded-[18px]', width as string, mine ? 'bg-lune-500/35' : 'bg-white/[0.09]')} /></div>
    ))}
  </div>
);

interface ComposerProps {
  peerId: string; myId: string; name: string; features: Features;
  replyTo: ThreadMessage | null; onCancelReply: () => void; onSent: (message: ThreadMessage) => void;
}

/**
 * The message box. It owns what you are typing and the voice recorder, so each keystroke (and each
 * tick of a recording) re-renders only this box, never the whole conversation.
 */
const Composer = memo(({ peerId, myId, name, features, replyTo, onCancelReply, onSent }: ComposerProps) => {
  const recorder = useVoiceRecorder();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const replyId = replyTo && features.replies ? replyTo.id : null;

  // Starting a reply puts the cursor in the box.
  useEffect(() => { if (replyTo) { setEmojiOpen(false); box.current?.focus(); } }, [replyTo]);

  // The box grows with what you type, up to about five lines. Done in a frame callback so typing is never blocked.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = box.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
    });
    return () => cancelAnimationFrame(frame);
  }, [draft]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    setEmojiOpen(false);
    try {
      onSent(await api<ThreadMessage>(`/api/messages/${peerId}`, { method: 'POST', body: { content, ...(replyId ? { reply_to: replyId } : {}) } }));
      setDraft('');
      onCancelReply();
      box.current?.focus();
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Your message could not be sent. Please try again.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const sendVoice = async (recording: Recording | null) => {
    if (!recording) { setSendError('That was too short. Keep the mic going a little longer to record a voice message.'); return; }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      onSent(await uploadVoice<ThreadMessage>(peerId, recording.blob, recording.durationMs, recording.peaks, replyId));
      onCancelReply();
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Your voice message could not be sent. Please try again.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const startRecording = () => {
    setSendError('');
    setEmojiOpen(false);
    // At the two-minute limit the recorder stops itself and sends what it has.
    void recorder.start(result => void sendVoice(result));
  };

  const addEmoji = (emoji: string) => {
    const el = box.current;
    const from = el?.selectionStart ?? draft.length;
    const to = el?.selectionEnd ?? draft.length;
    setDraft((draft.slice(0, from) + emoji + draft.slice(to)).slice(0, MAX_LENGTH));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(from + emoji.length, from + emoji.length); });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') { if (replyTo) onCancelReply(); else setEmojiOpen(false); return; }
    // Phone keyboards report Enter as a new line while composing; only a real Enter (not mid-word) sends.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); void send(); }
  };

  const problem = sendError || recorder.error;

  return (
    <form onSubmit={send} className="relative px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5">
      {problem && <p role="alert" className="mb-2 rounded-2xl border border-red-400/25 bg-red-500/20 px-3.5 py-2 text-sm text-red-100 backdrop-blur">{problem}</p>}
      {replyTo && features.replies && !recorder.recording && (
        <div className="tg-pill mb-2 flex items-center gap-3 rounded-2xl py-2 pl-3 pr-2">
          <CornerUpLeft className="h-4 w-4 shrink-0 text-lune-300" aria-hidden />
          <div className="min-w-0 flex-1 border-l-[3px] border-lune-300 pl-2.5">
            <p className="truncate text-[13px] font-semibold text-lune-300">Replying to {replyTo.sender_id === myId ? 'yourself' : name}</p>
            <p className="truncate text-[13px] text-white/70">{replyTo.kind === 'voice' ? '🎤 Voice message' : replyTo.content}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"><X size={17} /></button>
        </div>
      )}
      {emojiOpen && !recorder.recording && (
        <div role="dialog" aria-label="Emoji" className="tg-pill absolute bottom-full left-3 right-3 z-30 mb-2 grid max-h-44 grid-cols-9 gap-0.5 overflow-y-auto rounded-3xl p-2 sm:right-auto sm:w-[22rem]">
          {EMOJIS.map(emoji => <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="flex h-9 items-center justify-center rounded-xl text-xl transition-colors hover:bg-white/10" aria-label={`Insert ${emoji}`}>{emoji}</button>)}
        </div>
      )}
      {recorder.recording ? (
        <div className="flex items-center gap-2">
          <CircleButton label="Cancel recording" onClick={recorder.cancel} className="text-red-300 hover:text-red-200"><Trash2 size={19} /></CircleButton>
          <div className="tg-pill flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full px-4">
            <span role="timer" aria-label="Recording time" className="flex shrink-0 items-center gap-2 text-[15px] font-medium tabular-nums"><span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />{clock(recorder.elapsed)}</span>
            <div aria-hidden className="flex h-7 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden">
              {recorder.live.map((bar, index) => <span key={index} style={{ height: `${Math.max(14, bar)}%` }} className="w-[3px] shrink-0 rounded-full bg-lune-300" />)}
            </div>
          </div>
          <CircleButton label="Send voice message" onClick={() => void recorder.stop().then(sendVoice)} disabled={sending} className="bg-lune-500 text-white hover:bg-lune-600">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal size={19} />}
          </CircleButton>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <CircleButton label="Emoji" onClick={() => setEmojiOpen(open => !open)} className={emojiOpen ? 'text-lune-300' : undefined}><Smile size={21} /></CircleButton>
          <div className="tg-pill flex min-h-[2.75rem] min-w-0 flex-1 items-center rounded-[1.4rem] px-4 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(192,132,252,0.45)]">
            {/* 16px: smaller text makes iPhones zoom the whole page when the box is tapped. */}
            <textarea
              ref={box} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown}
              maxLength={MAX_LENGTH} rows={1} disabled={sending} enterKeyHint="send" autoComplete="off" autoCorrect="on" autoCapitalize="sentences" spellCheck
              aria-label={`Message ${name}`} placeholder={replyTo ? 'Write your reply' : 'Message'}
              className="max-h-[132px] min-h-[2.25rem] w-full resize-none bg-transparent py-[9px] text-[16px] leading-snug text-white outline-none placeholder:text-white/45 disabled:opacity-60"
            />
          </div>
          {draft.trim() ? (
            <CircleButton type="submit" label="Send message" disabled={sending} className="bg-lune-500 text-white hover:bg-lune-600">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal size={19} />}
            </CircleButton>
          ) : features.voice ? (
            <CircleButton label="Record a voice message" onClick={startRecording} disabled={sending}>
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic size={21} />}
            </CircleButton>
          ) : (
            <CircleButton type="submit" label="Send message" disabled className="bg-lune-500/60 text-white"><SendHorizontal size={19} /></CircleButton>
          )}
        </div>
      )}
      {draft.length > MAX_LENGTH - 200 && <p className="mt-1 text-right text-xs tabular-nums text-white/50">{draft.length}/{MAX_LENGTH}</p>}
    </form>
  );
});
Composer.displayName = 'Composer';

/** Right pane: one conversation. Polls for new messages while the tab is visible. */
const Thread = ({ peer, myId, unreadElsewhere, onActivity }: { peer: PublicProfile; myId: string; unreadElsewhere: number; onActivity: () => void }) => {
  const { call, busy: callBusy, startCall } = useCall();
  const cached = threadCache.get(cacheKey(myId, peer.id))?.data;
  const [member, setMember] = useState<ThreadMember | null>(cached?.member ?? null);
  const [messages, setMessages] = useState<ThreadMessage[]>(cached?.messages ?? []);
  const [features, setFeatures] = useState<Features>(cached?.features ?? { voice: true, replies: false });
  const [ready, setReady] = useState(!!cached);
  const [loadError, setLoadError] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [replyTo, setReplyTo] = useState<ThreadMessage | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [divider, setDivider] = useState<{ id: string; count: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastSeen = useRef(cached ? signatureOf(cached.messages) : '');
  const knownCount = useRef(cached?.messages.length ?? 0);
  const dividerSet = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await api<ThreadData>(`/api/messages/${peer.id}`);
      remember(myId, peer.id, data);
      setMember(data.member);
      setFeatures(data.features);
      // Only replace the list when something changed, so polling never jolts the scroll position.
      const signature = signatureOf(data.messages);
      if (signature !== lastSeen.current) {
        lastSeen.current = signature;
        const arrived = data.messages.slice(knownCount.current).filter(message => message.sender_id !== myId).length;
        if (arrived > 0 && knownCount.current > 0 && !stick.current) setNewBelow(count => count + arrived);
        knownCount.current = data.messages.length;
        setMessages(data.messages);
      }
      if (data.unreadIds.length) {
        // The first time you open a conversation with unread messages, mark where they start.
        if (!dividerSet.current) {
          dividerSet.current = true;
          const first = data.messages.find(message => data.unreadIds.includes(message.id));
          if (first) setDivider({ id: first.id, count: data.unreadIds.length });
        }
        announceMessagesChanged();
        onActivity();
      }
      setLoadError('');
    } catch (cause) {
      setLoadError(cause instanceof ApiError && cause.status === 403 ? cause.message : 'This conversation could not be loaded. Check your connection.');
    } finally {
      setReady(true);
    }
  }, [peer.id, myId, onActivity]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 4000);
    return () => clearInterval(timer);
  }, [load]);

  // When the keyboard opens or closes the visible area changes size: stay on the newest message if you were there.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const keepBottom = () => {
      const box = scroller.current;
      if (box && stick.current) requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
    };
    viewport.addEventListener('resize', keepBottom);
    return () => viewport.removeEventListener('resize', keepBottom);
  }, []);

  // Scroll to the newest message before the screen is painted, so the conversation never visibly jumps.
  useLayoutEffect(() => {
    const box = scroller.current;
    if (box && stick.current) box.scrollTop = box.scrollHeight;
  }, [messages, ready]);

  const jumpToLatest = () => {
    const box = scroller.current;
    if (!box) return;
    stick.current = true;
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    setNewBelow(0);
  };

  const startReply = useCallback((message: ThreadMessage) => {
    setReplyTo(message);
  }, []);

  const cancelReply = useCallback(() => setReplyTo(null), []);

  const jumpTo = useCallback((id: string) => {
    const target = document.getElementById(`msg-${id}`);
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlashId(id);
    setTimeout(() => setFlashId(current => (current === id ? null : current)), 1600);
  }, []);

  const appendSent = (sent: ThreadMessage) => {
    stick.current = true;
    setMessages(previous => {
      const next = previous.some(message => message.id === sent.id) ? previous : [...previous, sent];
      lastSeen.current = signatureOf(next);
      knownCount.current = next.length;
      return next;
    });
    announceMessagesChanged();
    onActivity();
  };

  const blocked = !!member?.blocked;
  const shown = member ?? { username: peer.username, display_name: peer.display_name ?? '', avatar_url: peer.avatar_url };
  const name = displayNameOf(shown);
  const canCall = !blocked && !call && !callBusy;
  const callPeer = { id: peer.id, username: peer.username, display_name: shown.display_name, avatar_url: shown.avatar_url };
  const canReply = features.replies && !blocked;

  // Group the messages by day, so each day's date pill can stay at the top while that day scrolls.
  const days = useMemo(() => {
    const groups: { key: string; label: string; items: { message: ThreadMessage; index: number }[] }[] = [];
    messages.forEach((message, index) => {
      const key = format(new Date(message.created_at), 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push({ message, index });
      else groups.push({ key, label: dayLabel(message.created_at), items: [{ message, index }] });
    });
    return groups;
  }, [messages]);

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link to="/messages" aria-label="Back to conversations" className="tg-pill flex h-11 shrink-0 items-center gap-1 rounded-full pl-2.5 pr-3.5 text-white md:hidden">
          <ArrowLeft size={20} />
          {unreadElsewhere > 0 && <span className="rounded-full bg-lune-500 px-1.5 text-[12px] font-semibold leading-5">{unreadElsewhere > 999 ? '999+' : unreadElsewhere}</span>}
        </Link>
        <Link to={`/profile/${encodeURIComponent(peer.username)}`} className="tg-pill flex h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-full px-4 text-center transition-colors hover:bg-white/[0.08]">
          <span className="max-w-full truncate text-[15px] font-semibold leading-tight">{name} <VerifiedBadge username={peer.username} /></span>
          <span className="max-w-full truncate text-[12px] leading-tight text-white/55">@{peer.username}</span>
        </Link>
        <div className="tg-pill flex h-11 shrink-0 items-center rounded-full px-1">
          <button type="button" disabled={!canCall} onClick={() => void startCall(callPeer, 'audio')} aria-label={`Voice call ${name}`} title="Voice call" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"><Phone size={18} /></button>
          <button type="button" disabled={!canCall} onClick={() => void startCall(callPeer, 'video')} aria-label={`Video call ${name}`} title="Video call" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"><Video size={19} /></button>
        </div>
        <Link to={`/profile/${encodeURIComponent(peer.username)}`} aria-label={`${name}’s profile`} className="shrink-0 rounded-full ring-2 ring-white/15 transition-shadow hover:ring-lune-300/60"><Person member={shown} size="h-11 w-11" /></Link>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scroller}
          onScroll={event => {
            const box = event.currentTarget;
            const near = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
            stick.current = near;
            setAtBottom(near);
            if (near) setNewBelow(0);
          }}
          className="tg-fade h-full overflow-y-auto overscroll-contain px-3 py-3 sm:px-5" aria-live="polite" aria-label={`Conversation with ${name}`}>
          {!ready && <ThreadSkeleton />}
          {ready && loadError && !messages.length && <p role="alert" className="py-10 text-center text-sm text-red-200">{loadError}</p>}
          {ready && !loadError && !messages.length && (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Person member={shown} size="h-20 w-20" />
              <p className="tg-pill rounded-full px-4 py-1.5 text-sm text-white/75">No messages yet. Say hi to {name} 👋</p>
            </div>
          )}
          {days.map(day => (
            <section key={day.key} aria-label={day.label}>
              <div className="sticky top-1 z-10 flex justify-center py-1.5"><span className="tg-pill rounded-full px-3 py-1 text-[12px] font-medium text-white/85">{day.label}</span></div>
              {day.items.map(({ message, index }) => (
                <Fragment key={message.id}>
                  {divider?.id === message.id && (
                    <div role="separator" className="my-3 flex items-center gap-3 px-2 text-[12px] font-semibold text-lune-200">
                      <span className="h-px flex-1 bg-lune-300/35" />{divider.count} unread message{divider.count === 1 ? '' : 's'}<span className="h-px flex-1 bg-lune-300/35" />
                    </div>
                  )}
                  <MessageRow message={message} mine={message.sender_id === myId}
                    startsRun={!sameRun(messages[index - 1], message)} endsRun={!sameRun(message, messages[index + 1])}
                    canReply={canReply} myId={myId} peerName={name} flash={flashId === message.id} onReply={startReply} onJump={jumpTo} />
                </Fragment>
              ))}
            </section>
          ))}
        </div>

        {!atBottom && (
          <button type="button" onClick={jumpToLatest} aria-label={newBelow ? `Jump to latest, ${newBelow} new` : 'Jump to latest message'}
            className="tg-pill absolute bottom-3 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105">
            <ChevronDown size={22} />
            {newBelow > 0 && <span className="absolute -top-1.5 -right-1 min-w-[1.25rem] rounded-full bg-lune-500 px-1 text-center text-[11px] font-semibold leading-5">{newBelow}</span>}
          </button>
        )}
      </div>

      {blocked ? (
        <p role="status" className="tg-pill mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] mt-1 rounded-full px-4 py-3 text-center text-sm text-white/65">You can’t message this account.</p>
      ) : (
        <Composer peerId={peer.id} myId={myId} name={name} features={features} replyTo={replyTo} onCancelReply={cancelReply} onSent={appendSent} />
      )}
    </div>
  );
};

/** A chat on a phone takes the whole visible screen (above the keyboard), over the bottom bar. */
const MobileChatShell = ({ children }: { children: ReactNode }) => {
  const box = useVisualViewport();
  // The page behind must not scroll while the chat is open, or iPhones slide it when the keyboard opens.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = before; };
  }, []);
  return createPortal(
    <div className="fixed inset-x-0 z-[60] flex flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]" style={{ top: box.top, height: box.height }}>
      <ChatWallpaper />{children}
    </div>,
    document.body,
  );
};

const toProfile = (conversation: Conversation): PublicProfile => ({
  id: conversation.user_id, username: conversation.username, display_name: conversation.display_name,
  avatar_url: conversation.avatar_url, wallet_address: null, bio: '',
});

const MessagesView = ({ username, myId }: { username?: string; myId: string }) => {
  const { getProfileByUsername } = useSocial();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [fetched, setFetched] = useState<PublicProfile | null>(null);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');

  const loadList = useCallback(async () => {
    try {
      const data = await api<{ items: Conversation[] }>('/api/messages');
      setConversations(data.items);
      setListError('');
    } catch {
      setListError('Your conversations could not be loaded. Check your connection.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void loadList(); }, 15000);
    return () => clearInterval(timer);
  }, [loadList]);

  // Someone you already talk to is known from the list, so their chat opens at once. Anyone else
  // (a new conversation from a profile or a search) is looked up by username.
  const known = username ? conversations.find(conversation => conversation.username.toLowerCase() === username.toLowerCase()) : undefined;
  const knownPeer = useMemo(() => (known ? toProfile(known) : null), [known?.user_id, known?.username, known?.display_name, known?.avatar_url]); // eslint-disable-line react-hooks/exhaustive-deps
  const lookedUp = fetched && username && fetched.username.toLowerCase() === username.toLowerCase() ? fetched : null;
  const peer = knownPeer ?? lookedUp;

  useEffect(() => {
    if (!username || knownPeer) { setFetchState('idle'); return; }
    if (lookedUp) return;
    let active = true;
    setFetchState('loading');
    getProfileByUsername(username)
      .then(profile => { if (!active) return; setFetched(profile); setFetchState(profile ? 'idle' : 'missing'); })
      .catch(() => { if (active) setFetchState('error'); });
    return () => { active = false; };
  }, [username, knownPeer, lookedUp, getProfileByUsername]);

  const showThread = !!username;
  const isMobile = useIsMobile();
  const unreadElsewhere = conversations.reduce((total, conversation) => total + (conversation.user_id === peer?.id ? 0 : conversation.unread), 0);
  const threadContent = (
    <>
      {!showThread ? (
        <div className="flex flex-1 items-center justify-center p-6"><div className="tg-pill rounded-3xl px-8 py-10"><EmptyState icon={MessageCircle} title="Your messages">Pick a conversation, or search for someone to start a new one.</EmptyState></div></div>
      ) : peer ? (
        peer.id === myId
          ? <div className="flex flex-1 items-center justify-center p-6"><div className="tg-pill rounded-3xl px-8 py-10"><EmptyState icon={MessageCircle} title="That’s you">You can’t message yourself. Pick someone else from the list.</EmptyState></div></div>
          : <Thread key={peer.id} peer={peer} myId={myId} unreadElsewhere={unreadElsewhere} onActivity={loadList} />
      ) : fetchState === 'missing' || fetchState === 'error' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="tg-pill rounded-3xl px-8 py-8"><EmptyState icon={MessageCircle} title={fetchState === 'missing' ? 'Member not found' : 'Couldn’t load this member'}>{fetchState === 'missing' ? `No account uses @${username}.` : 'Check your connection and try again.'}</EmptyState></div>
          <Button asChild variant="outline" className="rounded-full"><Link to="/messages">Back to messages</Link></Button>
        </div>
      ) : (
        <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-white/55"><Loader2 className="h-4 w-4 animate-spin" /> Opening…</div>
      )}
    </>
  );

  return (
    <div className="relative isolate mx-auto grid h-[calc(100dvh-10rem)] min-h-[30rem] max-w-6xl grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl border border-white/15 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] md:grid-cols-[22rem_minmax(0,1fr)]">
      <ChatWallpaper />
      <aside className={cn('relative z-10 flex min-h-0 min-w-0 flex-col border-white/10 bg-[rgba(12,8,24,0.55)] backdrop-blur-2xl md:border-r', showThread && 'hidden md:flex')}>
        <ConversationList conversations={conversations} loading={listLoading} error={listError} activeUsername={username} myId={myId} onRetry={() => void loadList()} />
      </aside>
      {showThread && isMobile
        // On phones an open chat takes the whole visible screen, above the bottom bar and the keyboard.
        ? <MobileChatShell>{threadContent}</MobileChatShell>
        : <section className={cn('relative z-10 flex min-h-0 min-w-0 flex-col', !showThread && 'hidden md:flex')}>{threadContent}</section>}
    </div>
  );
};

const Messages = () => {
  const { username } = useParams();
  const { user, loading } = useWallet();

  return (
    <Layout>
      {loading ? (
        <div role="status" className="flex items-center justify-center gap-3 py-20 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      ) : !user ? (
        <div className="lune-card mx-auto mt-10 max-w-lg">
          <EmptyState icon={MessageCircle} title="Log in to send messages">Messages are private between you and the person you’re talking to.</EmptyState>
          <div className="flex justify-center gap-3 pb-8"><Button asChild className="lune-btn"><Link to="/signin">Log in</Link></Button><Button asChild variant="outline"><Link to="/signup">Create account</Link></Button></div>
        </div>
      ) : (
        <MessagesView key={user.id} username={username} myId={user.id} />
      )}
    </Layout>
  );
};

export default Messages;
