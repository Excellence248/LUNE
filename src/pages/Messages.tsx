import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, ChevronDown, Loader2, MessageCircle, Mic, Palette, Phone, Search, SendHorizontal, Smile, Trash2, Video } from 'lucide-react';
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
import { announceMessagesChanged, useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useVoiceRecorder, type Recording } from '@/hooks/useVoiceRecorder';
import { ApiError, api, uploadVoice } from '@/lib/api';
import { DEFAULT_CHAT_PRESET, DOODLES_URL, backgroundCss, useAppearance } from '@/lib/appearance';
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
}

const MAX_LENGTH = 2000;
const EMOJIS = ['😀', '😂', '🥰', '😍', '😘', '😎', '🤩', '🥳', '😭', '😡', '🤔', '😴', '👍', '👎', '🙏', '👏', '🙌', '🤝', '👀', '🔥', '💜', '❤️', '💯', '🎉', '🌙', '⭐', '✨', '💫', '🌠', '🚀', '🪐', '☄️', '🌌', '🛸', '👽', '🧑‍🚀'];

/** One tick = sent, two = read (as in Telegram). */
const Ticks = ({ read, className }: { read: boolean; className?: string }) =>
  read ? <CheckCheck aria-label="Read" className={cn('h-[15px] w-[15px] text-sky-200', className)} /> : <Check aria-label="Sent" className={cn('h-[15px] w-[15px]', className)} />;

/** The chat wallpaper: a space scene (yours or Nebula), the faint doodle pattern, and a dimming layer for readability. */
const ChatWallpaper = () => {
  const { chat, chatDim, doodles } = useAppearance();
  const css = backgroundCss(chat, DEFAULT_CHAT_PRESET);
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
                <Link to={`/messages/${encodeURIComponent(person.username)}`} onClick={() => setQuery('')} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.07]">
                  <Person member={person as { username: string; display_name?: string; avatar_url: string }} size="h-12 w-12" />
                  <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{displayNameOf(person)} <VerifiedBadge username={person.username} /></p><p className="truncate text-sm text-white/45">@{person.username}</p></div>
                </Link>
              </li>
            ))}
          </ul>
        ) : loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="space-y-3 p-4"><p role="alert" className="text-sm text-red-200">{error}</p><Button size="sm" variant="outline" onClick={onRetry}>Try again</Button></div>
        ) : shown.length ? (
          <ul aria-label="Conversations" className="space-y-0.5 px-2">
            {shown.map(conversation => {
              const active = activeUsername?.toLowerCase() === conversation.username.toLowerCase();
              const mine = conversation.last_sender_id === myId;
              return (
                <li key={conversation.user_id}>
                  <Link to={`/messages/${encodeURIComponent(conversation.username)}`} aria-current={active ? 'page' : undefined}
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

/** A round glass button, as in Telegram's floating controls. */
const CircleButton = ({ label, onClick, disabled, children, className, type = 'button' }: { label: string; onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string; type?: 'button' | 'submit' }) => (
  <button type={type} onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className={cn('tg-pill flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/85 transition-all hover:text-white active:scale-95 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lune-300', className)}>
    {children}
  </button>
);

/** Right pane: one conversation. Polls for new messages while the tab is visible. */
const Thread = ({ peer, myId, onActivity }: { peer: PublicProfile; myId: string; onActivity: () => void }) => {
  const { call, busy: callBusy, startCall } = useCall();
  const recorder = useVoiceRecorder();
  const unreadTotal = useUnreadMessages();
  const [member, setMember] = useState<ThreadMember | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const sendingRef = useRef(false);
  const lastSeen = useRef('');
  const knownCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await api<{ member: ThreadMember; messages: ThreadMessage[] }>(`/api/messages/${peer.id}`);
      setMember(data.member);
      // Only replace the list when something changed, so polling never jolts the scroll position.
      const signature = signatureOf(data.messages);
      if (signature !== lastSeen.current) {
        lastSeen.current = signature;
        const arrived = data.messages.slice(knownCount.current).filter(message => message.sender_id !== myId).length;
        if (arrived > 0 && knownCount.current > 0 && !stick.current) setNewBelow(count => count + arrived);
        knownCount.current = data.messages.length;
        setMessages(data.messages);
        if (data.messages.some(message => message.sender_id !== myId)) { announceMessagesChanged(); onActivity(); }
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

  useEffect(() => {
    const box = scroller.current;
    if (box && stick.current) box.scrollTop = box.scrollHeight;
  }, [messages]);

  // The message box grows with what you type, up to about five lines.
  useEffect(() => {
    const box = composer.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 132)}px`;
  }, [draft]);

  const jumpToLatest = () => {
    const box = scroller.current;
    if (!box) return;
    stick.current = true;
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    setNewBelow(0);
  };

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

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    setEmojiOpen(false);
    try {
      appendSent(await api<ThreadMessage>(`/api/messages/${peer.id}`, { method: 'POST', body: { content } }));
      setDraft('');
      composer.current?.focus();
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
      appendSent(await uploadVoice<ThreadMessage>(peer.id, recording.blob, recording.durationMs, recording.peaks));
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
    const box = composer.current;
    const from = box?.selectionStart ?? draft.length;
    const to = box?.selectionEnd ?? draft.length;
    const next = (draft.slice(0, from) + emoji + draft.slice(to)).slice(0, MAX_LENGTH);
    setDraft(next);
    requestAnimationFrame(() => { box?.focus(); box?.setSelectionRange(from + emoji.length, from + emoji.length); });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
  };

  const blocked = !!member?.blocked;
  const shown = member ?? { username: peer.username, display_name: peer.display_name ?? '', avatar_url: peer.avatar_url };
  const name = displayNameOf(shown);
  const canCall = !blocked && !call && !callBusy;
  const callPeer = { id: peer.id, username: peer.username, display_name: shown.display_name, avatar_url: shown.avatar_url };
  const problem = sendError || recorder.error;

  // Group the messages by day, so each day's date pill can stay at the top while that day scrolls.
  const days: { key: string; label: string; items: { message: ThreadMessage; index: number }[] }[] = [];
  messages.forEach((message, index) => {
    const key = format(new Date(message.created_at), 'yyyy-MM-dd');
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push({ message, index });
    else days.push({ key, label: dayLabel(message.created_at), items: [{ message, index }] });
  });

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link to="/messages" aria-label="Back to conversations" className="tg-pill flex h-11 shrink-0 items-center gap-1 rounded-full pl-2.5 pr-3.5 text-white md:hidden">
          <ArrowLeft size={20} />
          {unreadTotal > 0 && <span className="rounded-full bg-lune-500 px-1.5 text-[12px] font-semibold leading-5">{unreadTotal > 999 ? '999+' : unreadTotal}</span>}
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
          {!ready && <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-white/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
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
              {day.items.map(({ message, index }) => {
                const mine = message.sender_id === myId;
                const startsRun = !sameRun(messages[index - 1], message);
                const endsRun = !sameRun(message, messages[index + 1]);
                const voice = message.kind === 'voice' && message.voice_id;
                const time = format(new Date(message.created_at), 'p');
                const meta = (
                  <span className={cn('flex items-center gap-1 text-[11px] leading-none', mine ? 'text-white/75' : 'text-white/45')} title={new Date(message.created_at).toLocaleString()}>
                    {time}{mine && <Ticks read={!!message.read_at} />}
                  </span>
                );
                return (
                  <div key={message.id} className={cn('flex px-2.5', mine ? 'justify-end' : 'justify-start', startsRun ? 'mt-2.5' : 'mt-[3px]')}>
                    <div className={cn('tg-bubble max-w-[80%] rounded-[18px] sm:max-w-[68%]',
                      mine ? 'tg-out' : 'tg-in',
                      endsRun ? (mine ? 'tg-tail-out rounded-br-[4px]' : 'tg-tail-in rounded-bl-[4px]') : (mine ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'),
                      !startsRun && (mine ? 'rounded-tr-[6px]' : 'rounded-tl-[6px]'),
                      voice ? 'px-3 pb-1.5 pt-2.5' : 'selectable whitespace-pre-wrap break-words px-3 pb-[7px] pt-[7px] text-[15.5px] leading-[1.35]')}>
                      {voice ? (
                        <>
                          <VoiceBubble voiceId={message.voice_id as string} durationMs={message.duration_ms ?? 1000} peaks={message.peaks ?? null} mine={mine} />
                          <div className="mt-1 flex justify-end">{meta}</div>
                        </>
                      ) : (
                        <>
                          {message.content}
                          {/* Reserves room at the end of the last line; the time sits in it, bottom right. */}
                          <span aria-hidden className={cn('inline-block h-0', mine ? 'w-[4.6rem]' : 'w-[3.4rem]')} />
                          <span className="absolute bottom-[5px] right-2.5">{meta}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
        <form onSubmit={send} className="relative px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5">
          {problem && <p role="alert" className="mb-2 rounded-2xl border border-red-400/25 bg-red-500/20 px-3.5 py-2 text-sm text-red-100 backdrop-blur">{problem}</p>}
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
                <textarea
                  ref={composer} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown}
                  maxLength={MAX_LENGTH} rows={1} disabled={sending} enterKeyHint="send" autoComplete="off"
                  aria-label={`Message ${name}`} placeholder="Message"
                  className="max-h-[132px] min-h-[2.25rem] w-full resize-none bg-transparent py-[9px] text-[15.5px] leading-snug text-white outline-none placeholder:text-white/45 disabled:opacity-60"
                />
              </div>
              {draft.trim() ? (
                <CircleButton type="submit" label="Send message" disabled={sending} className="bg-lune-500 text-white hover:bg-lune-600">
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal size={19} />}
                </CircleButton>
              ) : (
                <CircleButton label="Record a voice message" onClick={startRecording} disabled={sending}>
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic size={21} />}
                </CircleButton>
              )}
            </div>
          )}
          {draft.length > MAX_LENGTH - 200 && <p className="mt-1 text-right text-xs tabular-nums text-white/50">{draft.length}/{MAX_LENGTH}</p>}
        </form>
      )}
    </div>
  );
};

const MessagesView = ({ username, myId }: { username?: string; myId: string }) => {
  const { getProfileByUsername } = useSocial();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [peer, setPeer] = useState<PublicProfile | null>(null);
  const [peerState, setPeerState] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');

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

  useEffect(() => {
    setPeer(null);
    if (!username) { setPeerState('idle'); return; }
    let active = true;
    setPeerState('loading');
    getProfileByUsername(username)
      .then(profile => { if (!active) return; setPeer(profile); setPeerState(profile ? 'ready' : 'missing'); })
      .catch(() => { if (active) setPeerState('error'); });
    return () => { active = false; };
  }, [username, getProfileByUsername]);

  const showThread = !!username;
  const isMobile = useIsMobile();
  const threadContent = (
    <>
      {!showThread ? (
        <div className="flex flex-1 items-center justify-center p-6"><div className="tg-pill rounded-3xl px-8 py-10"><EmptyState icon={MessageCircle} title="Your messages">Pick a conversation, or search for someone to start a new one.</EmptyState></div></div>
      ) : peerState === 'ready' && peer ? (
        peer.id === myId
          ? <div className="flex flex-1 items-center justify-center p-6"><div className="tg-pill rounded-3xl px-8 py-10"><EmptyState icon={MessageCircle} title="That’s you">You can’t message yourself. Pick someone else from the list.</EmptyState></div></div>
          : <Thread key={peer.id} peer={peer} myId={myId} onActivity={loadList} />
      ) : peerState === 'loading' || peerState === 'idle' ? (
        <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-white/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="tg-pill rounded-3xl px-8 py-8"><EmptyState icon={MessageCircle} title={peerState === 'missing' ? 'Member not found' : 'Couldn’t load this member'}>{peerState === 'missing' ? `No account uses @${username}.` : 'Check your connection and try again.'}</EmptyState></div>
          <Button asChild variant="outline" className="rounded-full"><Link to="/messages">Back to messages</Link></Button>
        </div>
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
        // On phones an open chat takes the whole screen, above the bottom bar, so the message box is never covered.
        ? createPortal(<div className="fixed inset-0 z-[60] flex h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]"><ChatWallpaper />{threadContent}</div>, document.body)
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
