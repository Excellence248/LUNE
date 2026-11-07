import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

/*
 * Audio spaces without a media server: WebRTC peer connections between participants,
 * signalled over Supabase Realtime (broadcast + presence). Speakers/host send mic audio;
 * listeners only receive. Rooms are ephemeral – a space is "live" while its host is present.
 *
 * Scale note: this is a mesh (every speaker <-> every participant), good for ~8 speakers and
 * a few dozen listeners. Strict NATs need a TURN server: set VITE_TURN_URL / _USERNAME / _CREDENTIAL.
 */

export type SpaceRole = 'host' | 'speaker' | 'listener';
export interface SpaceMember { id: string; name: string; avatar: string; role: SpaceRole; hand: boolean; muted: boolean; title?: string; }
export type SpaceStatus = 'connecting' | 'live' | 'ended' | 'error';
export const LOBBY_TOPIC = 'lune-spaces-lobby';
export interface LobbySpace { id: string; title: string; hostName: string; hostAvatar: string; startedAt: number; listeners: number; }

const iceServers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const turn = import.meta.env.VITE_TURN_URL as string | undefined;
if (turn) iceServers.push({ urls: turn, username: import.meta.env.VITE_TURN_USERNAME as string | undefined, credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined });

interface Peer {
  pc: RTCPeerConnection; polite: boolean; making: boolean; ignore: boolean;
  sender: RTCRtpSender | null; queue: Promise<void>; audio?: HTMLAudioElement;
}
interface Me { id: string; name: string; avatar: string; }
interface Options { host: boolean; title?: string; }
interface Controls { toggleMute: () => void; raiseHand: () => void; control: (type: string, to?: string) => void; leave: () => void; resume: () => void; }

export const useSpaceRoom = (spaceId: string, me: Me | null, { host, title = '' }: Options, enabled: boolean) => {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [status, setStatus] = useState<SpaceStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<SpaceRole>(host ? 'host' : 'listener');
  const [muted, setMuted] = useState(false);
  const [hand, setHand] = useState(false);
  const [speaking, setSpeaking] = useState<string[]>([]);
  const [roomTitle, setRoomTitle] = useState(title);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const api = useRef<Controls>();
  const meId = me?.id; const meName = me?.name; const meAvatar = me?.avatar;

  useEffect(() => {
    if (!enabled || !meId) return;
    let closed = false;
    const startedAt = Date.now();
    const peers = new Map<string, Peer>();
    let channel: RealtimeChannel | undefined;
    let lobby: RealtimeChannel | undefined;
    let mic: MediaStream | null = null;
    let myRole: SpaceRole = host ? 'host' : 'listener';
    let myMuted = false, myHand = false, current: SpaceMember[] = [];
    let hostSeen = host;
    let ctx: AudioContext | null = null;
    const levels = new Map<string, () => number>();
    let endTimer: ReturnType<typeof setTimeout> | undefined;

    const canSend = () => myRole !== 'listener';
    const meta = (): SpaceMember => ({ id: meId, name: meName || 'Guest', avatar: meAvatar || '', role: myRole, hand: myHand, muted: myMuted, title: host ? title : undefined });
    const lobbyMeta = (): LobbySpace => ({ id: spaceId, title, hostName: meName || 'Host', hostAvatar: meAvatar || '', startedAt, listeners: Math.max(0, current.length - 1) });
    const publish = () => { if (!closed && channel) void channel.track(meta()); };
    const sendSignal = (to: string, data: object) => { void channel?.send({ type: 'broadcast', event: 'signal', payload: { from: meId, to, ...data } }); };

    const watch = (id: string, stream: MediaStream) => {
      try {
        ctx ??= new AudioContext();
        const analyser = ctx.createAnalyser(); analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        levels.set(id, () => { analyser.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; return Math.sqrt(s / buf.length) / 128; });
      } catch { /* the speaking indicator is cosmetic */ }
    };

    const acquireMic = async () => {
      if (mic) return true;
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        mic.getAudioTracks().forEach(t => { t.enabled = !myMuted; });
        watch(meId, mic);
        return true;
      } catch {
        setError('Microphone access was blocked. Allow the microphone in your browser to speak.');
        return false;
      }
    };
    const releaseMic = () => { mic?.getTracks().forEach(t => t.stop()); mic = null; levels.delete(meId); };

    const syncSender = (peer: Peer) => {
      const track = mic?.getAudioTracks()[0];
      if (canSend() && track && mic && !peer.sender) peer.sender = peer.pc.addTrack(track, mic);
      else if (!canSend() && peer.sender) { try { peer.pc.removeTrack(peer.sender); } catch { /* connection closed */ } peer.sender = null; }
    };

    const closePeer = (id: string) => {
      const p = peers.get(id); if (!p) return;
      peers.delete(id); levels.delete(id);
      if (p.audio) { p.audio.pause(); p.audio.srcObject = null; }
      p.pc.close();
    };

    const createPeer = (id: string, initiator: boolean): Peer => {
      const pc = new RTCPeerConnection({ iceServers });
      const peer: Peer = { pc, polite: meId > id, making: false, ignore: false, sender: null, queue: Promise.resolve() };
      peers.set(id, peer);
      pc.onicecandidate = e => { if (e.candidate) sendSignal(id, { candidate: e.candidate.toJSON() }); };
      pc.onnegotiationneeded = async () => {
        try {
          peer.making = true;
          await pc.setLocalDescription();
          if (pc.localDescription) sendSignal(id, { description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
        } catch (e) { console.warn('negotiation failed', e); } finally { peer.making = false; }
      };
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') pc.restartIce(); };
      pc.ontrack = ({ streams, track }) => {
        const stream = streams[0] ?? new MediaStream([track]);
        if (!peer.audio) { peer.audio = new Audio(); peer.audio.autoplay = true; watch(id, stream); }
        peer.audio.srcObject = stream;
        peer.audio.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
      };
      syncSender(peer);
      // An initiating listener has nothing to send but must still ask to receive.
      if (initiator && !canSend()) pc.addTransceiver('audio', { direction: 'recvonly' });
      return peer;
    };

    const reconcile = () => {
      for (const id of [...peers.keys()]) {
        const m = current.find(x => x.id === id);
        if (!m || (!canSend() && m.role === 'listener')) closePeer(id);
      }
      for (const m of current) {
        if (m.id === meId) continue;
        if (!canSend() && m.role === 'listener') continue; // listeners never connect to each other
        const existing = peers.get(m.id);
        if (existing) syncSender(existing);
        else if (meId < m.id) createPeer(m.id, true); // the lower id initiates; the other side answers
      }
    };

    const meter = setInterval(() => {
      const active: string[] = [];
      levels.forEach((read, id) => { if (read() > 0.04 && !(id === meId && myMuted)) active.push(id); });
      setSpeaking(prev => (prev.length === active.length && prev.every(x => active.includes(x)) ? prev : active));
    }, 200);

    let lobbyTimer: ReturnType<typeof setInterval> | undefined;
    const teardown = () => {
      closed = true;
      if (endTimer) clearTimeout(endTimer);
      clearInterval(meter); clearInterval(lobbyTimer);
      [...peers.keys()].forEach(closePeer);
      releaseMic();
      void ctx?.close();
      if (lobby) void supabase.removeChannel(lobby);
      const ch = channel;
      if (ch) void ch.untrack().finally(() => supabase.removeChannel(ch));
    };
    const endRoom = (message?: string) => {
      if (closed) return;
      teardown();
      if (message) setError(message);
      setStatus('ended');
    };

    const onSync = () => {
      if (!channel) return;
      current = Object.values(channel.presenceState<SpaceMember>()).map(metas => metas[metas.length - 1]).filter(Boolean);
      setMembers(current);
      const h = current.find(m => m.role === 'host');
      if (h) {
        hostSeen = true;
        if (h.title) setRoomTitle(h.title);
        if (endTimer) { clearTimeout(endTimer); endTimer = undefined; }
        setStatus(s => (s === 'connecting' ? 'live' : s));
      } else if (hostSeen && !host && !endTimer) {
        endTimer = setTimeout(() => endRoom('The host left, so this space has ended.'), 8000);
      }
      reconcile();
    };

    const handleSignal = (payload: { from: string; to: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      if (closed || payload.to !== meId) return;
      const peer = peers.get(payload.from) ?? createPeer(payload.from, false);
      peer.queue = peer.queue.then(async () => {
        const { pc } = peer;
        try {
          if (payload.description) {
            const collision = payload.description.type === 'offer' && (peer.making || pc.signalingState !== 'stable');
            peer.ignore = !peer.polite && collision;
            if (peer.ignore) return;
            await pc.setRemoteDescription(payload.description);
            if (payload.description.type === 'offer') {
              await pc.setLocalDescription();
              if (pc.localDescription) sendSignal(payload.from, { description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
            }
          } else if (payload.candidate) {
            try { await pc.addIceCandidate(payload.candidate); } catch (e) { if (!peer.ignore) throw e; }
          }
        } catch (e) { console.warn('signal failed', e); }
      });
    };

    const becomeListener = () => {
      myRole = 'listener'; myHand = false; setRole('listener'); setHand(false);
      releaseMic(); peers.forEach(syncSender); reconcile(); publish();
    };

    const handleControl = async (p: { from: string; type: string; to?: string }) => {
      if (closed || current.find(m => m.id === p.from)?.role !== 'host') return; // only the host may moderate
      if (p.type === 'end' && !host) { endRoom('The host ended this space.'); return; }
      if (p.to !== meId) return;
      if (p.type === 'promote' && myRole === 'listener') {
        myMuted = false;
        if (!(await acquireMic())) return;
        myRole = 'speaker'; myHand = false; setRole('speaker'); setHand(false); setMuted(false);
        reconcile(); peers.forEach(syncSender); publish();
      } else if (p.type === 'demote' && myRole === 'speaker') {
        becomeListener();
      } else if (p.type === 'mute' && myRole !== 'listener') {
        myMuted = true; setMuted(true); mic?.getAudioTracks().forEach(t => { t.enabled = false; }); publish();
      }
    };

    api.current = {
      toggleMute: () => {
        if (myRole === 'listener') return;
        myMuted = !myMuted; setMuted(myMuted);
        mic?.getAudioTracks().forEach(t => { t.enabled = !myMuted; });
        publish();
      },
      raiseHand: () => { if (myRole !== 'listener') return; myHand = !myHand; setHand(myHand); publish(); },
      control: (type, to) => {
        if (myRole !== 'host') return;
        void channel?.send({ type: 'broadcast', event: 'control', payload: { from: meId, type, to } });
        if (type === 'end') setTimeout(() => endRoom(), 300); // let the broadcast leave first
      },
      leave: () => endRoom(),
      resume: () => { peers.forEach(p => { void p.audio?.play().then(() => setAudioBlocked(false)); }); void ctx?.resume(); },
    };

    (async () => {
      if (host && !(await acquireMic())) { if (!closed) setStatus('error'); return; }
      if (closed) { releaseMic(); return; }
      const ch = supabase.channel(`space:${spaceId}`, { config: { presence: { key: meId }, broadcast: { self: false } } });
      channel = ch;
      ch.on('presence', { event: 'sync' }, onSync)
        .on('broadcast', { event: 'signal' }, ({ payload }) => handleSignal(payload))
        .on('broadcast', { event: 'control' }, ({ payload }) => void handleControl(payload))
        .subscribe(s => {
          if (s === 'SUBSCRIBED') {
            publish();
            if (!host) endTimer = setTimeout(() => { if (!hostSeen) endRoom('This space is not live right now.'); }, 7000);
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
            setError('Could not connect to the audio service. Check your connection.'); setStatus('error');
          }
        });
      if (host) {
        const l = supabase.channel(LOBBY_TOPIC, { config: { presence: { key: spaceId } } });
        lobby = l;
        l.subscribe(s => { if (s === 'SUBSCRIBED') void l.track(lobbyMeta()); });
        // keep the public listing's listener count fresh
        lobbyTimer = setInterval(() => { if (!closed) void l.track(lobbyMeta()); }, 10000);
      }
    })();

    return () => { if (!closed) teardown(); api.current = undefined; };
  }, [spaceId, meId, meName, meAvatar, host, title, enabled]);

  return {
    members, status, error, role, muted, hand, speaking, roomTitle, audioBlocked,
    toggleMute: useCallback(() => api.current?.toggleMute(), []),
    raiseHand: useCallback(() => api.current?.raiseHand(), []),
    promote: useCallback((id: string) => api.current?.control('promote', id), []),
    demote: useCallback((id: string) => api.current?.control('demote', id), []),
    forceMute: useCallback((id: string) => api.current?.control('mute', id), []),
    end: useCallback(() => api.current?.control('end'), []),
    leave: useCallback(() => api.current?.leave(), []),
    resumeAudio: useCallback(() => api.current?.resume(), []),
  };
};

/** Live spaces, discovered through presence on a shared lobby channel. */
export const useSpacesLobby = () => {
  const [spaces, setSpaces] = useState<LobbySpace[]>([]);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const channel = supabase.channel(LOBBY_TOPIC);
    channel.on('presence', { event: 'sync' }, () => {
      const list = Object.values(channel.presenceState<LobbySpace>()).map(m => m[m.length - 1]).filter(Boolean);
      setSpaces(list.sort((a, b) => b.startedAt - a.startedAt));
    }).subscribe(s => setConnected(s === 'SUBSCRIBED'));
    return () => { void supabase.removeChannel(channel); };
  }, []);
  return { spaces, connected };
};
