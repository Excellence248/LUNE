import VerifiedBadge from '@/components/lune/VerifiedBadge';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Hand, Loader2, LogOut, Mic, MicOff, Volume2, X } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import { EmptyState } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useSpaceRoom, type SpaceMember } from '@/lib/spaces/useSpaceRoom';
import { SpaceAvatar } from './Spaces';

const Person = ({ m, speaking, isHost, onPromote, onDemote, onMute }: {
  m: SpaceMember; speaking: boolean; isHost: boolean;
  onPromote?: () => void; onDemote?: () => void; onMute?: () => void;
}) => (
  <li className="flex flex-col items-center gap-2 text-center">
    <div className={`relative rounded-full p-1 transition-all ${speaking ? 'bg-lune-400/40 shadow-[0_0_24px_4px_hsl(271_91%_65%/0.55)]' : 'bg-transparent'}`}>
      <SpaceAvatar name={m.name} src={m.avatar} className="h-16 w-16 sm:h-20 sm:w-20" />
      {m.role !== 'listener' && m.muted && <span className="absolute -bottom-1 -right-1 rounded-full bg-black/70 p-1.5 text-white/80"><MicOff size={12} /></span>}
      {m.hand && <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 p-1.5 text-black"><Hand size={12} /></span>}
    </div>
    <p className="max-w-[6rem] truncate text-sm font-medium">{m.name} <VerifiedBadge username={m.name} /></p>
    {m.role === 'host' && <p className="-mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-lune-300">Host</p>}
    {isHost && m.role === 'listener' && m.hand && <Button size="sm" className="h-7 rounded-full bg-lune-500 px-3 text-xs hover:bg-lune-600" onClick={onPromote}>Invite to speak</Button>}
    {isHost && m.role === 'speaker' && (
      <div className="flex gap-1">
        {!m.muted && <Button size="sm" variant="outline" className="h-7 rounded-full px-2 text-xs" onClick={onMute}>Mute</Button>}
        <Button size="sm" variant="outline" className="h-7 rounded-full px-2 text-xs" onClick={onDemote}>Remove</Button>
      </div>
    )}
  </li>
);

const LiveSpace = () => {
  const { id = '' } = useParams();
  const { state } = useLocation() as { state: { host?: boolean; title?: string } | null };
  const navigate = useNavigate();
  const { user, loading } = useWallet();
  const host = !!state?.host;
  const [joined, setJoined] = useState(host); // joining needs a click so the browser allows audio playback
  const me = user ? { id: user.id, name: user.username, avatar: user.avatar } : null;
  const room = useSpaceRoom(id, me, { host, title: state?.title }, joined && !!me);

  if (loading && !user) return <Layout><div role="status" className="flex items-center justify-center gap-2 py-24 text-white/60"><Loader2 className="animate-spin" size={18} /> Loading your account…</div></Layout>;
  if (!user) return (
    <Layout><div className="lune-card mx-auto max-w-md"><EmptyState icon={Mic} title="Log in to join this space">
      <div className="mt-4 flex justify-center gap-2"><Button asChild className="rounded-full bg-lune-500 hover:bg-lune-600"><Link to="/signin">Log in</Link></Button><Button asChild variant="outline" className="rounded-full"><Link to="/signup">Sign up</Link></Button></div>
    </EmptyState></div></Layout>
  );

  if (!joined) return (
    <Layout><div className="lune-card mx-auto max-w-md"><EmptyState icon={Volume2} title="Join this space">
      <p>You’ll join as a listener. Raise your hand to ask the host to let you speak.</p>
      <Button className="mt-5 rounded-full bg-lune-500 px-8 hover:bg-lune-600" onClick={() => setJoined(true)}>Join now</Button>
    </EmptyState></div></Layout>
  );

  if (room.status === 'ended' || room.status === 'error') return (
    <Layout><div className="lune-card mx-auto max-w-md"><EmptyState icon={Volume2} title={room.status === 'error' ? 'Couldn’t start the space' : 'Space ended'}>
      <p>{room.error || 'Thanks for tuning in.'}</p>
      <Button className="mt-5 rounded-full bg-lune-500 hover:bg-lune-600" onClick={() => navigate('/spaces', { replace: true })}>Back to spaces</Button>
    </EmptyState></div></Layout>
  );

  const speakers = room.members.filter(m => m.role !== 'listener').sort((a, b) => (a.role === 'host' ? -1 : b.role === 'host' ? 1 : 0));
  const listeners = room.members.filter(m => m.role === 'listener');
  const isHost = room.role === 'host';
  const isSpeaker = room.role !== 'listener';
  const leave = () => { room.leave(); navigate('/spaces', { replace: true }); };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl pb-24">
        <p className="lune-eyebrow mb-2 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${room.status === 'live' ? 'animate-pulse bg-red-400' : 'bg-white/30'}`} />{room.status === 'live' ? 'Live' : 'Connecting…'}</p>
        <h1 className="mb-8 font-display text-2xl font-bold sm:text-4xl">{room.roomTitle || 'Audio space'}</h1>

        {room.error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{room.error}</p>}
        {room.audioBlocked && <button onClick={room.resumeAudio} className="mb-4 w-full rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">Tap to enable audio</button>}

        <section className="lune-card p-5 sm:p-8" aria-label="Speakers">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">Speakers</h2>
          <ul className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4">
            {speakers.map(m => <Person key={m.id} m={m} speaking={room.speaking.includes(m.id)} isHost={isHost && m.id !== user.id} onDemote={() => room.demote(m.id)} onMute={() => room.forceMute(m.id)} />)}
          </ul>
        </section>

        <section className="lune-card mt-4 p-5 sm:p-8" aria-label="Listeners">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">Listeners · {listeners.length}</h2>
          {listeners.length === 0 ? <p className="text-sm text-white/40">No listeners yet.</p> : (
            <ul className="grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-5">
              {listeners.map(m => <Person key={m.id} m={m} speaking={false} isHost={isHost} onPromote={() => room.promote(m.id)} />)}
            </ul>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-6 lg:pl-72">
        <div className="glass-strong flex items-center gap-2 rounded-full p-2">
          {isSpeaker ? (
            <Button onClick={room.toggleMute} variant="outline" aria-pressed={!room.muted} className={`h-12 rounded-full px-5 ${room.muted ? '' : 'bg-lune-500/30'}`}>
              {room.muted ? <><MicOff className="mr-2 h-4 w-4" /> Unmute</> : <><Mic className="mr-2 h-4 w-4" /> Mute</>}
            </Button>
          ) : (
            <Button onClick={room.raiseHand} variant="outline" aria-pressed={room.hand} className={`h-12 rounded-full px-5 ${room.hand ? 'bg-amber-400/20 text-amber-100' : ''}`}>
              <Hand className="mr-2 h-4 w-4" /> {room.hand ? 'Lower hand' : 'Request to speak'}
            </Button>
          )}
          {isHost
            ? <Button onClick={() => { room.end(); navigate('/spaces', { replace: true }); }} className="h-12 rounded-full bg-red-500/80 px-5 hover:bg-red-500"><X className="mr-2 h-4 w-4" /> End space</Button>
            : <Button onClick={leave} variant="outline" className="h-12 rounded-full px-5"><LogOut className="mr-2 h-4 w-4" /> Leave</Button>}
        </div>
      </div>
    </Layout>
  );
};

export default LiveSpace;
