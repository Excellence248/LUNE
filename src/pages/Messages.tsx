import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle, Mic, Palette, Phone, Search, SendHorizontal, Trash2, Video } from 'lucide-react';
import { format, formatDistanceToNowStrict, isSameDay, isToday, isYesterday } from 'date-fns';
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
import { useVoiceRecorder, type Recording } from '@/hooks/useVoiceRecorder';
import { ApiError, api, uploadVoice } from '@/lib/api';
import { DEFAULT_CHAT_PRESET, backgroundCss, useAppearance } from '@/lib/appearance';
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
  unread: number;
}

interface ThreadMember { id: string; username: string; display_name: string; avatar_url: string; blocked: boolean }
interface ThreadMessage {
  id: string; sender_id: string; kind: 'text' | 'voice'; content: string; created_at: string; read_at: string | null;
  /** Voice messages only: the recording, its length and the waveform to draw. */
  voice_id?: string | null; duration_ms?: number | null; peaks?: number[] | null;
}

const MAX_LENGTH = 2000;

/** The chat wallpaper: the member's own choice, or the Aurora look, darkened a little so glass text stays readable. */
const ChatWallpaper = () => {
  const { chat, chatDim } = useAppearance();
  const css = backgroundCss(chat, DEFAULT_CHAT_PRESET);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: css ?? undefined }}>
      {chat.kind === 'default' && <div className="lune-stars absolute inset-0 opacity-70" />}
      <div className="absolute inset-0 bg-black" style={{ opacity: chat.kind === 'default' ? 0.12 : chatDim }} />
    </div>
  );
};

const AppearanceButton = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button type="button" variant="ghost" size="icon" aria-label="Change backgrounds" title="Backgrounds" className="rounded-full text-white/70 hover:text-white"><Palette size={18} /></Button>
    </DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl border-white/10 glass-strong text-white sm:max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Backgrounds</DialogTitle>
        <DialogDescription>Choose a look for the app and your chats, or use your own picture.</DialogDescription>
      </DialogHeader>
      <AppearancePanel />
    </DialogContent>
  </Dialog>
);

const shortAgo = (date: string) =>
  formatDistanceToNowStrict(new Date(date))
    .replace(/ seconds?/, 's').replace(/ minutes?/, 'm').replace(/ hours?/, 'h')
    .replace(/ days?/, 'd').replace(/ months?/, 'mo').replace(/ years?/, 'y');

const Person = ({ member, size = 'h-10 w-10' }: { member: { username: string; display_name?: string; avatar_url: string }; size?: string }) => (
  <Avatar className={cn(size, 'shrink-0 ring-1 ring-white/10')}>
    <AvatarImage src={member.avatar_url} className="object-cover" />
    <AvatarFallback className="bg-gradient-to-br from-lune-600/70 to-lune-900 text-sm font-semibold text-lune-100">{displayNameOf(member)[0]?.toUpperCase() || 'U'}</AvatarFallback>
  </Avatar>
);

/** Left pane: find someone to message, and your conversations. */
const ConversationList = ({ conversations, loading, error, activeUsername, myId, onRetry }: {
  conversations: Conversation[]; loading: boolean; error: string; activeUsername?: string; myId: string; onRetry: () => void;
}) => {
  const { searchUsers } = useSocial();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const term = query.trim().replace(/^@/, '');

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
      <div className="chat-glass-bar border-b border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">Messages</h1>
          <AppearanceButton />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
          <Input value={query} onChange={event => setQuery(event.target.value)} maxLength={64} aria-label="Find someone to message" placeholder="Search people" className="chat-field h-10 rounded-full pl-10 text-white placeholder:text-white/40" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {term ? (
          <ul aria-label="People">
            {searching && <li className="flex items-center gap-2 px-4 py-3 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</li>}
            {!searching && !results.length && <li className="px-4 py-3 text-sm text-white/40">No one matches “{term}”.</li>}
            {results.map(person => (
              <li key={person.id}>
                <Link to={`/messages/${encodeURIComponent(person.username)}`} onClick={() => setQuery('')} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.07]">
                  <Person member={person as { username: string; display_name?: string; avatar_url: string }} />
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayNameOf(person)} <VerifiedBadge username={person.username} /></p><p className="truncate text-xs text-white/40">@{person.username}</p></div>
                </Link>
              </li>
            ))}
          </ul>
        ) : loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="space-y-3 p-4"><p role="alert" className="text-sm text-red-200">{error}</p><Button size="sm" variant="outline" onClick={onRetry}>Try again</Button></div>
        ) : conversations.length ? (
          <ul aria-label="Conversations">
            {conversations.map(conversation => {
              const active = activeUsername?.toLowerCase() === conversation.username.toLowerCase();
              const mine = conversation.last_sender_id === myId;
              return (
                <li key={conversation.user_id}>
                  <Link to={`/messages/${encodeURIComponent(conversation.username)}`} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.07]', active && 'chat-row-active')}>
                    <Person member={conversation} size="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{displayNameOf(conversation)} <VerifiedBadge username={conversation.username} /></p>
                        <time dateTime={conversation.last_at} className="shrink-0 text-xs text-white/35">{shortAgo(conversation.last_at)}</time>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn('min-w-0 flex-1 truncate text-sm', conversation.unread ? 'font-medium text-white/90' : 'text-white/50')}>{mine && 'You: '}{conversation.last_content}</p>
                        {conversation.unread > 0 && <span aria-label={`${conversation.unread} unread`} className="min-w-[1.25rem] shrink-0 rounded-full bg-lune-500 px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{conversation.unread > 99 ? '99+' : conversation.unread}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm leading-relaxed text-white/40">No conversations yet. Search for someone above, or open a profile and tap Message.</p>
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
  return format(date, date.getFullYear() === new Date().getFullYear() ? 'EEEE, d MMM' : 'd MMM yyyy');
};

const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const signatureOf = (list: ThreadMessage[]) => list.map(message => `${message.id}:${message.read_at ? 1 : 0}`).join(',');

/** Right pane: one conversation. Polls for new messages while the tab is visible. */
const Thread = ({ peer, myId, onActivity }: { peer: PublicProfile; myId: string; onActivity: () => void }) => {
  const { call, busy: callBusy, startCall } = useCall();
  const recorder = useVoiceRecorder();
  const [member, setMember] = useState<ThreadMember | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const sendingRef = useRef(false);
  const lastSeen = useRef('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ member: ThreadMember; messages: ThreadMessage[] }>(`/api/messages/${peer.id}`);
      setMember(data.member);
      // Only replace the list when something changed, so polling never jolts the scroll position.
      const signature = signatureOf(data.messages);
      if (signature !== lastSeen.current) {
        lastSeen.current = signature;
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

  const appendSent = (sent: ThreadMessage) => {
    stick.current = true;
    setMessages(previous => {
      const next = previous.some(message => message.id === sent.id) ? previous : [...previous, sent];
      lastSeen.current = signatureOf(next);
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
    // At the two-minute limit the recorder stops itself and sends what it has.
    void recorder.start(result => void sendVoice(result));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
  };

  const blocked = !!member?.blocked;
  const lastMineIndex = messages.reduce((found, message, index) => (message.sender_id === myId ? index : found), -1);
  const shown = member ?? { username: peer.username, display_name: peer.display_name ?? '', avatar_url: peer.avatar_url };
  const name = displayNameOf(shown);
  const canCall = !blocked && !call && !callBusy;
  const callPeer = { id: peer.id, username: peer.username, display_name: shown.display_name, avatar_url: shown.avatar_url };
  const problem = sendError || recorder.error;

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <header className="chat-glass-bar flex items-center gap-2 border-b border-white/10 px-2 py-2.5 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0 rounded-full md:hidden"><Link to="/messages" aria-label="Back to conversations"><ArrowLeft size={20} /></Link></Button>
        <Link to={`/profile/${encodeURIComponent(peer.username)}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pr-2 hover:opacity-90">
          <Person member={shown} />
          <div className="min-w-0"><p className="truncate text-[15px] font-semibold leading-tight">{name} <VerifiedBadge username={peer.username} /></p><p className="truncate text-xs text-white/50">@{peer.username}</p></div>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon" disabled={!canCall} onClick={() => void startCall(callPeer, 'audio')} aria-label={`Voice call ${name}`} title="Voice call" className="rounded-full text-white/75 hover:text-white"><Phone size={18} /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={!canCall} onClick={() => void startCall(callPeer, 'video')} aria-label={`Video call ${name}`} title="Video call" className="rounded-full text-white/75 hover:text-white"><Video size={19} /></Button>
          <AppearanceButton />
        </div>
      </header>

      <div ref={scroller} onScroll={event => { const box = event.currentTarget; stick.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80; }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5" aria-live="polite" aria-label={`Conversation with ${name}`}>
        {!ready && <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-white/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {ready && loadError && !messages.length && <p role="alert" className="py-10 text-center text-sm text-red-200">{loadError}</p>}
        {ready && !loadError && !messages.length && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Person member={shown} size="h-16 w-16" />
            <p className="chat-bubble-them rounded-full px-4 py-1.5 text-sm text-white/70">No messages yet. Say hi to {name} 👋</p>
          </div>
        )}
        {messages.map((message, index) => {
          const mine = message.sender_id === myId;
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const startsRun = !sameRun(previous, message);
          const endsRun = !sameRun(message, next);
          const newDay = !previous || !isSameDay(new Date(previous.created_at), new Date(message.created_at));
          const voice = message.kind === 'voice' && message.voice_id;
          return (
            <div key={message.id}>
              {newDay && <div className="my-4 flex justify-center"><span className="chat-bubble-them rounded-full px-3 py-1 text-[11px] font-medium text-white/70">{dayLabel(message.created_at)}</span></div>}
              <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start', startsRun && !newDay ? 'mt-3' : 'mt-0.5')}>
                <div className={cn('max-w-[82%] rounded-[1.25rem] text-[15px] leading-snug sm:max-w-[70%]',
                  voice ? 'px-3 py-2' : 'selectable whitespace-pre-wrap break-words px-3.5 py-2',
                  mine ? 'chat-bubble-me text-white' : 'chat-bubble-them text-white/95',
                  mine ? 'rounded-br-md' : 'rounded-bl-md',
                  !startsRun && (mine ? 'rounded-tr-md' : 'rounded-tl-md'))}>
                  {voice ? <VoiceBubble voiceId={message.voice_id as string} durationMs={message.duration_ms ?? 1000} peaks={message.peaks ?? null} mine={mine} /> : message.content}
                </div>
                {endsRun && (
                  <time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString()} className="mt-1 px-1 text-[11px] text-white/45">
                    {format(new Date(message.created_at), 'p')}{mine && index === lastMineIndex && message.read_at ? ' · Seen' : ''}
                  </time>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {blocked ? (
        <p role="status" className="chat-glass-bar border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-white/60">You can’t message this account.</p>
      ) : (
        <form onSubmit={send} className="chat-glass-bar border-t border-white/10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
          {problem && <p role="alert" className="mb-2 rounded-xl border border-red-400/25 bg-red-500/15 px-3 py-2 text-sm text-red-100 backdrop-blur">{problem}</p>}
          {recorder.recording ? (
            <div className="chat-field flex items-center gap-2 rounded-[1.6rem] p-1.5">
              <Button type="button" onClick={recorder.cancel} aria-label="Cancel recording" title="Cancel" className="h-9 w-9 shrink-0 rounded-full bg-white/10 p-0 text-red-300 hover:bg-white/20"><Trash2 className="h-4 w-4" /></Button>
              <span role="timer" aria-label="Recording time" className="flex shrink-0 items-center gap-2 text-sm font-medium tabular-nums"><span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />{clock(recorder.elapsed)}</span>
              <div aria-hidden className="flex h-8 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden">
                {recorder.live.map((bar, index) => <span key={index} style={{ height: `${Math.max(12, bar)}%` }} className="w-[3px] shrink-0 rounded-full bg-lune-300" />)}
              </div>
              <Button type="button" onClick={() => void recorder.stop().then(sendVoice)} disabled={sending} aria-label="Send voice message" title="Send" className="h-9 w-9 shrink-0 rounded-full bg-lune-500 p-0 hover:bg-lune-600">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="chat-field flex items-end gap-2 rounded-[1.6rem] py-1.5 pl-4 pr-1.5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(192,132,252,0.45)]">
              <textarea
                ref={composer} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown}
                maxLength={MAX_LENGTH} rows={1} disabled={sending} enterKeyHint="send" autoComplete="off"
                aria-label={`Message ${name}`} placeholder="Message…"
                className="max-h-[132px] min-h-[2.25rem] flex-1 resize-none self-center bg-transparent py-1.5 text-[15px] leading-snug text-white outline-none placeholder:text-white/45 disabled:opacity-60"
              />
              {draft.trim() ? (
                <Button type="submit" disabled={sending} aria-label="Send message" className="h-9 w-9 shrink-0 rounded-full bg-lune-500 p-0 hover:bg-lune-600">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </Button>
              ) : (
                <Button type="button" onClick={startRecording} disabled={sending} aria-label="Record a voice message" title="Record a voice message" className="h-9 w-9 shrink-0 rounded-full bg-white/10 p-0 text-white hover:bg-lune-500">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                </Button>
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
          <div className="flex flex-1 items-center justify-center p-6"><EmptyState icon={MessageCircle} title="Your messages">Pick a conversation, or search for someone to start a new one.</EmptyState></div>
        ) : peerState === 'ready' && peer ? (
          peer.id === myId
            ? <div className="flex flex-1 items-center justify-center p-6"><EmptyState icon={MessageCircle} title="That’s you">You can’t message yourself. Pick someone else from the list.</EmptyState></div>
            : <Thread key={peer.id} peer={peer} myId={myId} onActivity={loadList} />
        ) : peerState === 'loading' || peerState === 'idle' ? (
          <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <EmptyState icon={MessageCircle} title={peerState === 'missing' ? 'Member not found' : 'Couldn’t load this member'}>{peerState === 'missing' ? `No account uses @${username}.` : 'Check your connection and try again.'}</EmptyState>
            <Button asChild variant="outline"><Link to="/messages">Back to messages</Link></Button>
          </div>
        )}
    </>
  );

  return (
    <div className="relative isolate mx-auto grid h-[calc(100dvh-10rem)] min-h-[30rem] max-w-5xl overflow-hidden rounded-3xl border border-white/15 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] md:grid-cols-[19rem_minmax(0,1fr)]">
      <ChatWallpaper />
      <aside className={cn('chat-glass-bar relative z-10 flex min-h-0 flex-col border-white/10 md:border-r', showThread && 'hidden md:flex')}>
        <ConversationList conversations={conversations} loading={listLoading} error={listError} activeUsername={username} myId={myId} onRetry={() => void loadList()} />
      </aside>
      {showThread && isMobile
        // On phones an open chat takes the whole screen, above the bottom bar, so the message box is never covered.
        ? createPortal(<div className="fixed inset-0 z-[60] flex h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]"><ChatWallpaper />{threadContent}</div>, document.body)
        : <section className={cn('relative z-10 flex min-h-0 flex-col', !showThread && 'hidden md:flex')}>{threadContent}</section>}
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
