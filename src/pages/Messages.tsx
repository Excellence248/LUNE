import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle, Search, SendHorizontal } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Layout from '@/components/lune/Layout';
import VerifiedBadge from '@/components/lune/VerifiedBadge';
import { EmptyState } from '@/components/lune/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSocial, type PublicProfile } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { announceMessagesChanged } from '@/hooks/useUnreadMessages';
import { ApiError, api } from '@/lib/api';
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
interface ThreadMessage { id: string; sender_id: string; content: string; created_at: string; read_at: string | null }

const MAX_LENGTH = 2000;

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
      <div className="border-b border-white/10 p-4">
        <h1 className="mb-3 font-display text-xl font-bold">Messages</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden="true" />
          <Input value={query} onChange={event => setQuery(event.target.value)} maxLength={64} aria-label="Find someone to message" placeholder="Find someone to message" className="h-10 rounded-full border-white/10 bg-white/[0.03] pl-9" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {term ? (
          <ul aria-label="People">
            {searching && <li className="flex items-center gap-2 px-4 py-3 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</li>}
            {!searching && !results.length && <li className="px-4 py-3 text-sm text-white/40">No one matches “{term}”.</li>}
            {results.map(person => (
              <li key={person.id}>
                <Link to={`/messages/${encodeURIComponent(person.username)}`} onClick={() => setQuery('')} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]">
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
                  <Link to={`/messages/${encodeURIComponent(conversation.username)}`} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]', active && 'bg-white/[0.06]')}>
                    <Person member={conversation} size="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{displayNameOf(conversation)} <VerifiedBadge username={conversation.username} /></p>
                        <time dateTime={conversation.last_at} className="shrink-0 text-xs text-white/35">{shortAgo(conversation.last_at)}</time>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn('min-w-0 flex-1 truncate text-sm', conversation.unread ? 'font-medium text-white/85' : 'text-white/45')}>{mine && 'You: '}{conversation.last_content}</p>
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

/** Right pane: one conversation. Polls for new messages while the tab is visible. */
const Thread = ({ peer, myId, onActivity }: { peer: PublicProfile; myId: string; onActivity: () => void }) => {
  const [member, setMember] = useState<ThreadMember | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const sendingRef = useRef(false);
  const lastSeen = useRef('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ member: ThreadMember; messages: ThreadMessage[] }>(`/api/messages/${peer.id}`);
      setMember(data.member);
      // Only replace the list when something changed, so polling never jolts the scroll position.
      const signature = data.messages.map(message => `${message.id}:${message.read_at ? 1 : 0}`).join(',');
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

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      const sent = await api<ThreadMessage>(`/api/messages/${peer.id}`, { method: 'POST', body: { content } });
      setDraft('');
      stick.current = true;
      setMessages(previous => {
        const next = previous.some(message => message.id === sent.id) ? previous : [...previous, sent];
        lastSeen.current = next.map(message => `${message.id}:${message.read_at ? 1 : 0}`).join(',');
        return next;
      });
      announceMessagesChanged();
      onActivity();
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Your message could not be sent. Please try again.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
  };

  const blocked = !!member?.blocked;
  const lastMineIndex = messages.reduce((found, message, index) => (message.sender_id === myId ? index : found), -1);
  const shown = member ?? { username: peer.username, display_name: peer.display_name ?? '', avatar_url: peer.avatar_url };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="rounded-full md:hidden"><Link to="/messages" aria-label="Back to conversations"><ArrowLeft size={18} /></Link></Button>
        <Link to={`/profile/${encodeURIComponent(peer.username)}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
          <Person member={shown} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayNameOf(shown)} <VerifiedBadge username={peer.username} /></p><p className="truncate text-xs text-white/40">@{peer.username}</p></div>
        </Link>
      </header>

      <div ref={scroller} onScroll={event => { const box = event.currentTarget; stick.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80; }} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4" aria-live="polite" aria-label={`Conversation with ${displayNameOf(shown)}`}>
        {!ready && <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {ready && loadError && !messages.length && <p role="alert" className="py-10 text-center text-sm text-red-200">{loadError}</p>}
        {ready && !loadError && !messages.length && <p className="py-10 text-center text-sm text-white/40">No messages yet. Say hi to {displayNameOf(shown)} 👋</p>}
        {messages.map((message, index) => {
          const mine = message.sender_id === myId;
          return (
            <div key={message.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
              <div className={cn('selectable max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug sm:max-w-[70%]', mine ? 'rounded-br-md bg-lune-500 text-white' : 'rounded-bl-md bg-white/[0.07] text-white/90')}>{message.content}</div>
              <time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString()} className="mt-0.5 px-1 text-[11px] text-white/30">
                {format(new Date(message.created_at), 'p')}{mine && index === lastMineIndex && message.read_at ? ' · Seen' : ''}
              </time>
            </div>
          );
        })}
      </div>

      {blocked ? (
        <p role="status" className="border-t border-white/10 px-4 py-3 text-center text-sm text-white/50">You can’t message this account.</p>
      ) : (
        <form onSubmit={send} className="border-t border-white/10 p-3">
          {sendError && <p role="alert" className="mb-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{sendError}</p>}
          <div className="flex items-end gap-2">
            <Textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown} maxLength={MAX_LENGTH} rows={1} disabled={sending} aria-label={`Message ${displayNameOf(shown)}`} placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)" className="max-h-32 min-h-[2.75rem] resize-none rounded-2xl border-white/10 bg-white/[0.03] py-2.5" />
            <Button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="h-11 w-11 shrink-0 rounded-full bg-lune-500 p-0 hover:bg-lune-600">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </Button>
          </div>
          {draft.length > MAX_LENGTH - 200 && <p className="mt-1 text-right text-xs tabular-nums text-white/40">{draft.length}/{MAX_LENGTH}</p>}
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
  return (
    <div className="mx-auto grid h-[calc(100dvh-10rem)] min-h-[30rem] max-w-5xl overflow-hidden rounded-3xl border border-white/10 glass-soft md:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className={cn('flex min-h-0 flex-col border-white/10 md:border-r', showThread && 'hidden md:flex')}>
        <ConversationList conversations={conversations} loading={listLoading} error={listError} activeUsername={username} myId={myId} onRetry={() => void loadList()} />
      </aside>
      <section className={cn('flex min-h-0 flex-col', !showThread && 'hidden md:flex')}>
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
      </section>
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
