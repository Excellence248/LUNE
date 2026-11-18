import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCall } from '@/context/CallContext';
import { useWallet } from '@/context/WalletContext';
import { displayNameOf } from '@/lib/names';
import { cn } from '@/lib/utils';

/** A repeating soft tone while a call is ringing. Browsers may keep it silent until the page has been used. */
const useRingtone = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    let context: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      context = new AudioContext();
      void context.resume().catch(() => undefined);
      const beep = () => {
        if (!context) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 520;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.65);
      };
      beep();
      timer = setInterval(beep, 2200);
      navigator.vibrate?.([300, 150, 300]);
    } catch {
      /* no audio available: the card still shows */
    }
    const title = document.title;
    document.title = '📞 Incoming call';
    return () => { clearInterval(timer); void context?.close().catch(() => undefined); document.title = title; navigator.vibrate?.(0); };
  }, [active]);
};

const Person = ({ peer, size }: { peer: { username: string; display_name: string; avatar_url: string }; size: string }) => (
  <Avatar className={cn(size, 'ring-2 ring-white/15')}>
    <AvatarImage src={peer.avatar_url} className="object-cover" />
    <AvatarFallback className="bg-gradient-to-br from-lune-500 to-lune-800 font-display text-3xl font-bold text-white">{displayNameOf(peer)[0]?.toUpperCase() || 'U'}</AvatarFallback>
  </Avatar>
);

const ControlButton = ({ label, onClick, active, danger, children }: { label: string; onClick: () => void; active?: boolean; danger?: boolean; children: React.ReactNode }) => (
  <button
    type="button" onClick={onClick} aria-label={label} aria-pressed={active} title={label}
    className={cn('flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
      danger ? 'bg-red-500 hover:bg-red-600' : active ? 'bg-white text-black hover:bg-white/90' : 'bg-white/15 hover:bg-white/25')}
  >
    {children}
  </button>
);

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Incoming-call card, and the full-screen call view. Rendered once, near the root of the app. */
const CallOverlay = () => {
  const { user } = useWallet();
  const { call, joined, ringing, connection, localStream, remoteStream, muted, cameraOff, busy, accept, decline, hangup, toggleMute, toggleCamera } = useCall();
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(() => Date.now());

  useRingtone(ringing);

  useEffect(() => {
    if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
    if (remoteAudio.current) remoteAudio.current.srcObject = remoteStream;
    void remoteVideo.current?.play().catch(() => undefined);
    void remoteAudio.current?.play().catch(() => undefined);
  }, [remoteStream, joined]);

  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localStream;
  }, [localStream, joined, cameraOff]);

  useEffect(() => {
    if (connection !== 'connected') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [connection]);

  if (!call || !user) return null;
  const name = displayNameOf(call.peer);
  const video = call.kind === 'video';

  if (ringing) {
    return (
      <div role="alertdialog" aria-label={`Incoming ${video ? 'video' : 'voice'} call from ${name}`} className="fixed inset-x-0 top-0 z-[100] flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex w-full max-w-md items-center gap-3 rounded-3xl border border-white/10 glass-strong p-4 shadow-2xl">
          <Person peer={call.peer} size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-sm text-white/55">Incoming {video ? 'video' : 'voice'} call…</p>
          </div>
          <button type="button" onClick={() => void decline()} disabled={busy} aria-label="Decline call" className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 disabled:opacity-50"><PhoneOff size={20} /></button>
          <button type="button" onClick={() => void accept()} disabled={busy} aria-label="Accept call" className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50">{video ? <Video size={20} /> : <Phone size={20} />}</button>
        </div>
      </div>
    );
  }

  if (!joined) return null;

  const iCalled = call.caller_id === user.id;
  const seconds = call.answered_at ? Math.max(0, Math.floor((now - new Date(call.answered_at).getTime()) / 1000)) : 0;
  const status =
    call.status === 'ringing' && iCalled ? 'Calling…'
    : connection === 'connected' ? formatDuration(seconds)
    : connection === 'reconnecting' ? 'Reconnecting…'
    : 'Connecting…';
  const showRemoteVideo = video && connection === 'connected';

  return (
    <div role="dialog" aria-modal="true" aria-label={`${video ? 'Video' : 'Voice'} call with ${name}`} className="fixed inset-0 z-[100] flex flex-col bg-[#07040f] text-white">
      {video && <video ref={remoteVideo} autoPlay playsInline className={cn('absolute inset-0 h-full w-full object-cover', !showRemoteVideo && 'invisible')} />}
      {!video && <audio ref={remoteAudio} autoPlay />}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

      <header className="relative z-10 flex flex-col items-center gap-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        {!showRemoteVideo && <div className="mb-3 mt-10"><Person peer={call.peer} size="h-28 w-28" /></div>}
        <h2 className="max-w-full truncate font-display text-2xl font-bold drop-shadow">{name}</h2>
        <p role="status" className="text-sm tabular-nums text-white/70 drop-shadow">{status}</p>
      </header>

      <div className="relative z-10 flex-1" />

      {video && (
        <div className="absolute bottom-32 right-4 z-10 h-36 w-24 overflow-hidden rounded-2xl border border-white/20 bg-black/60 shadow-xl sm:h-44 sm:w-32">
          {cameraOff ? <div className="flex h-full w-full items-center justify-center text-white/60"><VideoOff size={22} /></div>
            : <video ref={localVideo} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />}
        </div>
      )}

      <footer className="relative z-10 flex items-center justify-center gap-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
        <ControlButton label={muted ? 'Unmute microphone' : 'Mute microphone'} active={muted} onClick={toggleMute}>{muted ? <MicOff size={22} /> : <Mic size={22} />}</ControlButton>
        {video && <ControlButton label={cameraOff ? 'Turn camera on' : 'Turn camera off'} active={cameraOff} onClick={toggleCamera}>{cameraOff ? <VideoOff size={22} /> : <Video size={22} />}</ControlButton>}
        <ControlButton label={call.status === 'ringing' && iCalled ? 'Cancel call' : 'End call'} danger onClick={() => void hangup()}><PhoneOff size={22} /></ControlButton>
      </footer>
    </div>
  );
};

export default CallOverlay;
