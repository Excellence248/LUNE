import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { displayNameOf } from '@/lib/names';
import { useWallet } from '@/context/WalletContext';

/*
 * One-to-one voice and video calls. Audio and video go straight between the two browsers (WebRTC); the
 * server only keeps the call record and passes the small connection messages (offer, answer, ICE
 * candidates), which each browser polls for: every few seconds while idle (to notice incoming calls) and
 * about once a second while on a call. Strict networks need a TURN server: set VITE_TURN_URL, _USERNAME
 * and _CREDENTIAL, as for Spaces.
 */

export type CallKind = 'audio' | 'video';
export interface CallPeer { id: string; username: string; display_name: string; avatar_url: string }
export interface CallInfo {
  id: string; kind: CallKind; status: 'ringing' | 'active' | 'ended';
  end_reason: 'hangup' | 'declined' | 'missed' | 'cancelled' | 'failed' | 'dropped' | null;
  caller_id: string; callee_id: string; created_at: string; answered_at: string | null; ended_at: string | null;
  peer: CallPeer;
}
export type Connection = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface PollData { call: CallInfo | null; signals: { id: number; from_id: string; kind: 'offer' | 'answer' | 'candidate'; payload: RTCSessionDescriptionInit & RTCIceCandidateInit }[] }

interface CallContextValue {
  /** The call this browser is on, or is being rung for. */
  call: CallInfo | null;
  /** True once this browser has joined the call (has its microphone/camera and is signalling). */
  joined: boolean;
  /** Someone is ringing you and you have not answered yet. */
  ringing: boolean;
  connection: Connection;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  busy: boolean;
  startCall: (peer: CallPeer, kind: CallKind) => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const iceServers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const turn = import.meta.env.VITE_TURN_URL as string | undefined;
if (turn) iceServers.push({ urls: turn, username: import.meta.env.VITE_TURN_USERNAME as string | undefined, credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined });

const CallContext = createContext<CallContextValue | undefined>(undefined);

const mediaErrorMessage = (error: unknown, kind: CallKind) => {
  const name = (error as { name?: string })?.name;
  const what = kind === 'video' ? 'microphone and camera' : 'microphone';
  if (name === 'NotAllowedError' || name === 'SecurityError') return `Allow ${what} access in your browser to make calls.`;
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return `No ${what} was found on this device.`;
  if (name === 'NotReadableError' || name === 'AbortError') return `Your ${what} is being used by another app.`;
  return error instanceof Error && error.message ? error.message : `Your ${what} could not be started.`;
};

const getMedia = async (kind: CallKind) => {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Calls need a secure (HTTPS) connection and a browser that supports them.');
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: kind === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
  } catch (error) {
    throw new Error(mediaErrorMessage(error, kind));
  }
};

/** What to tell the member when a call they were part of ends. */
const endNotice = (call: CallInfo, myId: string) => {
  const name = displayNameOf(call.peer);
  const iCalled = call.caller_id === myId;
  switch (call.end_reason) {
    case 'declined': return iCalled ? `${name} declined the call.` : 'Call declined.';
    case 'missed': return iCalled ? `${name} didn’t answer.` : `Missed call from ${name}.`;
    case 'cancelled': return `Missed call from ${name}.`;
    case 'failed':
    case 'dropped': return 'The call was lost. Check your connection.';
    default: return 'Call ended.';
  }
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useWallet();
  const myId = user?.id;

  const [call, setCall] = useState<CallInfo | null>(null);
  const [joined, setJoined] = useState(false);
  const [connection, setConnection] = useState<Connection>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [busy, setBusy] = useState(false);

  // Refs hold the live values the polling loop and WebRTC callbacks need, so they never see stale state.
  const callRef = useRef<CallInfo | null>(null);
  const joinedRef = useRef(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const afterRef = useRef(0);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const signalQueue = useRef<Promise<unknown>>(Promise.resolve());
  const polling = useRef(false);
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

  const setCurrent = (next: CallInfo | null) => { callRef.current = next; setCall(next); };

  const sendSignal = (kind: 'offer' | 'answer' | 'candidate', payload: unknown) => {
    const id = callRef.current?.id;
    if (!id) return Promise.resolve();
    // One at a time, in order, so an offer always arrives before the candidates that follow it.
    signalQueue.current = signalQueue.current.then(() => api(`/api/calls/${id}/signal`, { method: 'POST', body: { kind, payload } }).catch(() => undefined));
    return signalQueue.current;
  };

  /** Stops the microphone, camera and connection and forgets the call. Optionally tells the member why. */
  const teardown = useCallback((message?: string) => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach(track => track.stop());
    localRef.current = null;
    remoteRef.current = null;
    pendingCandidates.current = [];
    afterRef.current = 0;
    joinedRef.current = false;
    callRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setJoined(false);
    setCall(null);
    setConnection('idle');
    setMuted(false);
    setCameraOff(false);
    if (message) toast(message);
  }, []);

  const flushCandidates = async (pc: RTCPeerConnection) => {
    const queued = pendingCandidates.current;
    pendingCandidates.current = [];
    for (const candidate of queued) await pc.addIceCandidate(candidate).catch(() => undefined);
  };

  const createPeer = () => {
    const pc = new RTCPeerConnection({ iceServers });
    localRef.current?.getTracks().forEach(track => pc.addTrack(track, localRef.current as MediaStream));
    pc.ontrack = event => {
      const stream = remoteRef.current ?? new MediaStream();
      if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track);
      if (!remoteRef.current) { remoteRef.current = stream; setRemoteStream(stream); }
    };
    pc.onicecandidate = event => { if (event.candidate) void sendSignal('candidate', event.candidate.toJSON()); };
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      const state = pc.connectionState;
      if (state === 'connected') setConnection('connected');
      else if (state === 'disconnected') setConnection('reconnecting');
      else if (state === 'failed') {
        setConnection('failed');
        const id = callRef.current?.id;
        teardown('The call could not connect. Check your connection and try again.');
        if (id) void api(`/api/calls/${id}/end`, { method: 'POST', body: { reason: 'failed' } }).catch(() => undefined);
      } else if (state === 'connecting' || state === 'new') setConnection('connecting');
    };
    return pc;
  };

  /** The caller starts the connection once the other side has accepted. */
  const beginNegotiation = async () => {
    if (pcRef.current) return;
    const pc = createPeer();
    pcRef.current = pc;
    setConnection('connecting');
    try {
      await pc.setLocalDescription(await pc.createOffer());
      await sendSignal('offer', pc.localDescription);
    } catch {
      /* the connection state handler reports a failure */
    }
  };

  const handleSignal = async (signal: PollData['signals'][number]) => {
    const current = callRef.current;
    if (!current) return;
    try {
      if (signal.kind === 'offer') {
        if (current.caller_id === myIdRef.current) return;
        const pc = pcRef.current ?? createPeer();
        pcRef.current = pc;
        setConnection('connecting');
        await pc.setRemoteDescription(signal.payload);
        await flushCandidates(pc);
        await pc.setLocalDescription(await pc.createAnswer());
        await sendSignal('answer', pc.localDescription);
      } else if (signal.kind === 'answer') {
        const pc = pcRef.current;
        if (pc && pc.signalingState === 'have-local-offer') { await pc.setRemoteDescription(signal.payload); await flushCandidates(pc); }
      } else if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(signal.payload).catch(() => undefined);
      } else {
        pendingCandidates.current.push(signal.payload);
      }
    } catch {
      /* a bad message from the other side must not break the call */
    }
  };

  const applyPoll = async (data: PollData) => {
    const next = data.call;
    const current = callRef.current;
    const me = myIdRef.current;
    if (!me) return;
    if (!next) {
      // The call we were ringing for (or on) is gone.
      if (current) teardown(current.status === 'ringing' && !joinedRef.current ? `Missed call from ${displayNameOf(current.peer)}.` : 'Call ended.');
      return;
    }
    if (!current) {
      // A new call from the server. Only an incoming ring is for this browser; anything else belongs to another tab.
      if (next.status === 'ringing' && next.callee_id === me) setCurrent(next);
      return;
    }
    if (next.id !== current.id) {
      if (joinedRef.current) teardown('Call ended.');
      else if (next.status === 'ringing' && next.callee_id === me) setCurrent(next);
      else teardown();
      return;
    }
    if (next.status === 'ended') { teardown(endNotice(next, me)); return; }
    if (next.status !== current.status) setCurrent(next);
    if (!joinedRef.current) return;
    if (next.status === 'active' && next.caller_id === me && !pcRef.current) void beginNegotiation();
    for (const signal of data.signals) {
      afterRef.current = Math.max(afterRef.current, signal.id);
      await handleSignal(signal);
    }
  };

  const poll = useCallback(async () => {
    if (!myIdRef.current || polling.current) return;
    polling.current = true;
    try {
      const data = await api<PollData>('/api/calls/poll', { method: 'POST', body: { callId: joinedRef.current ? callRef.current?.id ?? null : null, after: afterRef.current } });
      await applyPoll(data);
    } catch {
      /* offline or a hiccup: try again on the next tick */
    } finally {
      polling.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Idle: look for incoming calls every few seconds. On a call: about once a second.
  useEffect(() => {
    if (!myId) { if (callRef.current) teardown(); return; }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      await poll();
      if (stopped) return;
      timer = setTimeout(tick, joinedRef.current ? 1000 : document.visibilityState === 'visible' ? 4000 : 8000);
    };
    void tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [myId, poll, teardown]);

  // Closing the tab hangs up, so the other person is not left on a dead call.
  useEffect(() => {
    const leave = () => {
      const id = callRef.current?.id;
      if (id && joinedRef.current) navigator.sendBeacon?.(`/api/calls/${id}/end`, new Blob(['{}'], { type: 'application/json' }));
    };
    window.addEventListener('pagehide', leave);
    return () => window.removeEventListener('pagehide', leave);
  }, []);

  const startCall = async (peer: CallPeer, kind: CallKind) => {
    if (callRef.current || busy) { toast('You’re already on a call.'); return; }
    setBusy(true);
    try {
      const stream = await getMedia(kind);
      localRef.current = stream;
      try {
        const created = await api<CallInfo>('/api/calls', { method: 'POST', body: { to: peer.id, kind } });
        afterRef.current = 0;
        joinedRef.current = true;
        setLocalStream(stream);
        setJoined(true);
        setConnection('connecting');
        setCurrent(created);
        void poll();
      } catch (error) {
        stream.getTracks().forEach(track => track.stop());
        localRef.current = null;
        throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The call could not be started.');
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    const current = callRef.current;
    if (!current || joinedRef.current || busy) return;
    setBusy(true);
    try {
      let stream: MediaStream;
      try {
        stream = await getMedia(current.kind);
      } catch (error) {
        // No microphone: tell the caller it was declined rather than leaving them ringing.
        await api(`/api/calls/${current.id}/answer`, { method: 'POST', body: { accept: false } }).catch(() => undefined);
        teardown();
        toast.error(error instanceof Error ? error.message : 'Your microphone could not be started.');
        return;
      }
      const updated = await api<CallInfo>(`/api/calls/${current.id}/answer`, { method: 'POST', body: { accept: true } });
      if (updated.status !== 'active') {
        stream.getTracks().forEach(track => track.stop());
        teardown(updated.status === 'ended' ? endNotice(updated, myIdRef.current ?? '') : undefined);
        return;
      }
      localRef.current = stream;
      afterRef.current = 0;
      joinedRef.current = true;
      setLocalStream(stream);
      setJoined(true);
      setConnection('connecting');
      setCurrent(updated);
      void poll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The call could not be answered.');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    const current = callRef.current;
    if (!current) return;
    teardown();
    await api(`/api/calls/${current.id}/answer`, { method: 'POST', body: { accept: false } }).catch(() => undefined);
  };

  const hangup = async () => {
    const current = callRef.current;
    if (!current) return;
    teardown();
    await api(`/api/calls/${current.id}/end`, { method: 'POST', body: {} }).catch(() => undefined);
  };

  const toggleMute = () => {
    const tracks = localRef.current?.getAudioTracks() ?? [];
    const next = !muted;
    tracks.forEach(track => { track.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = () => {
    const tracks = localRef.current?.getVideoTracks() ?? [];
    const next = !cameraOff;
    tracks.forEach(track => { track.enabled = !next; });
    setCameraOff(next);
  };

  const ringing = !!call && !joined && call.status === 'ringing' && call.callee_id === myId;

  return (
    <CallContext.Provider value={{ call, joined, ringing, connection, localStream, remoteStream, muted, cameraOff, busy, startCall, accept, decline, hangup, toggleMute, toggleCamera }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
