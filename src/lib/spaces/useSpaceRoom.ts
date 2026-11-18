import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { createSpaceTransport, type SpaceMessage, type SpaceTransport } from '@/lib/spaces/transport';

/*
 * Audio spaces over the Cloudflare Realtime SFU: every member keeps one WebRTC connection to it. Speakers
 * send their mic there once and the SFU forwards it to each listener, so a host's upload stays the same
 * however big the audience is. The server brokers every SFU call (media.post.ts) and decides who may speak.
 * Presence, hands and host controls still travel over the polling transport (transport.ts).
 * Rooms are ephemeral – a space is "live" while its host is present.
 */

export type SpaceRole = 'host' | 'speaker' | 'listener';
export interface SpaceMember {
  id: string; name: string; avatar: string; role: SpaceRole; hand: boolean; muted: boolean; title?: string;
  /** Set by the server: the member's SFU session, and whether their mic is being sent. */
  media?: { session: string; mic: boolean } | null;
}
export type SpaceStatus = 'connecting' | 'live' | 'ended' | 'error';
export interface LobbySpace { id: string; title: string; hostName: string; hostAvatar: string; startedAt: number; listeners: number; }

interface TracksResponse {
  sessionDescription?: RTCSessionDescriptionInit; requiresImmediateRenegotiation?: boolean;
  tracks?: { mid?: string; errorCode?: string; errorDescription?: string }[];
}
/** A speaker's mic this member receives. `mid` is set once the SFU has added it to our connection. */
interface Pulled { session: string; mid?: string; audio?: HTMLAudioElement }
interface Me { id: string; name: string; avatar: string; }
interface Options { host: boolean; title?: string; }
interface Controls { toggleMute: () => void; raiseHand: () => void; control: (type: string, to?: string) => void; leave: () => void; resume: () => void; }

/** The SFU takes no trickled candidates, so wait (briefly) until they are all in the local description. */
const gathered = (pc: RTCPeerConnection) => new Promise<void>(resolve => {
  if (pc.iceGatheringState === 'complete') return resolve();
  const finish = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve(); };
  const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
  const timer = setTimeout(finish, 3000);
  pc.addEventListener('icegatheringstatechange', check);
});

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

  const controls = useRef<Controls>();
  const meId = me?.id; const meName = me?.name; const meAvatar = me?.avatar;

  useEffect(() => {
    if (!enabled || !meId) return;
    let closed = false;
    const startedAt = Date.now();
    let transport: SpaceTransport | undefined;
    let mic: MediaStream | null = null;
    let myRole: SpaceRole = host ? 'host' : 'listener';
    let myMuted = false, myHand = false, current: SpaceMember[] = [];
    let hostSeen = host;
    let ctx: AudioContext | null = null;
    const levels = new Map<string, () => number>();
    let endTimer: ReturnType<typeof setTimeout> | undefined;

    let pc: RTCPeerConnection | null = null; // our one connection to the SFU
    let micTx: RTCRtpTransceiver | null = null; // our mic on it, while we speak
    const pulled = new Map<string, Pulled>(); // member id -> their mic
    let ops = Promise.resolve(); // the SFU accepts one change per session at a time

    const canSend = () => myRole !== 'listener';
    const meta = (): SpaceMember => ({ id: meId, name: meName || 'Guest', avatar: meAvatar || '', role: myRole, hand: myHand, muted: myMuted, title: host ? title : undefined });
    const lobbyMeta = (): LobbySpace => ({ id: spaceId, title, hostName: meName || 'Host', hostAvatar: meAvatar || '', startedAt, listeners: Math.max(0, current.length - 1) });
    const publish = () => { if (!closed) transport?.track(meta()); };
    const media = <T,>(op: string, body: object = {}) => api<T>(`/api/spaces/${encodeURIComponent(spaceId)}/media`, { method: 'POST', body: { op, ...body } });
    const queue = (job: () => Promise<void>) => { ops = ops.then(job).catch(e => console.warn('space audio', e)); };

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

    const silence = (p: Pulled) => { if (p.audio) { p.audio.pause(); p.audio.srcObject = null; } };

    /** Starts over with a new SFU session, e.g. after the network dropped. */
    const resetMedia = () => {
      const old = pc; pc = null; micTx = null;
      pulled.forEach((p, id) => { silence(p); levels.delete(id); });
      pulled.clear();
      old?.close();
      setTimeout(() => { if (!closed) reconcile(); }, 2000);
    };

    const connection = async () => {
      if (pc) return pc;
      const { iceServers } = await media<{ iceServers: RTCIceServer[] }>('connect').catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : 'Could not connect to the audio service. Check your connection.');
        throw e;
      });
      if (closed) throw new Error('left the space');
      const next = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' });
      next.ontrack = ({ transceiver, track }) => {
        const entry = [...pulled.entries()].find(([, p]) => p.mid && p.mid === transceiver.mid);
        if (!entry) return;
        const [id, p] = entry;
        // Each renegotiation re-fires ontrack for tracks already playing; re-attaching would glitch the audio.
        if ((p.audio?.srcObject as MediaStream | null)?.getTracks().includes(track)) return;
        const stream = new MediaStream([track]);
        p.audio ??= new Audio();
        p.audio.autoplay = true; p.audio.srcObject = stream; watch(id, stream);
        p.audio.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
      };
      next.onconnectionstatechange = () => { if (next.connectionState === 'failed' && pc === next) resetMedia(); };
      pc = next;
      return next;
    };

    const pushMic = () => queue(async () => {
      const track = mic?.getAudioTracks()[0];
      if (closed || !canSend() || !mic || !track || micTx) return;
      const conn = await connection();
      const tx = conn.addTransceiver(track, { direction: 'sendonly', streams: [mic] });
      micTx = tx;
      try {
        await conn.setLocalDescription(await conn.createOffer());
        await gathered(conn);
        const res = await media<TracksResponse>('push', { sdp: conn.localDescription?.sdp, mid: tx.mid });
        if (!res.sessionDescription || res.tracks?.some(t => t.errorCode)) throw new Error(res.tracks?.[0]?.errorDescription || 'mic not accepted');
        await conn.setRemoteDescription(res.sessionDescription);
      } catch (e) {
        if (micTx === tx) { micTx = null; tx.stop(); }
        setError('Your microphone could not be connected. Leave and rejoin to try again.');
        throw e;
      }
    });

    const stopMic = () => {
      const tx = micTx; micTx = null;
      if (!tx) return;
      const mid = tx.mid;
      queue(async () => { tx.stop(); await media('close', { mic: true, mids: mid ? [mid] : [] }); });
    };

    const pull = (id: string, session: string) => {
      const entry: Pulled = { session };
      pulled.set(id, entry);
      queue(async () => {
        if (closed || pulled.get(id) !== entry) return;
        try {
          const conn = await connection();
          const res = await media<TracksResponse>('pull', { sessions: [session] });
          const track = res.tracks?.[0];
          if (!track?.mid || track.errorCode || !res.sessionDescription) throw new Error(track?.errorDescription || 'speaker not available');
          entry.mid = track.mid; // before the offer is applied, so ontrack can find whose mic it is
          await conn.setRemoteDescription(res.sessionDescription);
          await conn.setLocalDescription(await conn.createAnswer());
          await gathered(conn);
          await media('answer', { sdp: conn.localDescription?.sdp });
          // They stopped speaking while this was in flight.
          if (pulled.get(id) !== entry) await media('close', { mids: [track.mid] });
        } catch (e) {
          if (pulled.get(id) === entry) { pulled.delete(id); setTimeout(reconcile, 3000); } // try again shortly
          throw e;
        }
      });
    };

    const dropPull = (id: string) => {
      const p = pulled.get(id); if (!p) return;
      pulled.delete(id); levels.delete(id); silence(p);
      const mid = p.mid;
      if (mid) queue(async () => { await media('close', { mids: [mid] }); });
    };

    /** Brings our connection in line with who is speaking: send our mic while we may, receive every live mic. */
    const reconcile = () => {
      if (closed) return;
      const live = current.filter(m => m.id !== meId && m.role !== 'listener' && m.media?.mic && m.media.session);
      for (const [id, p] of [...pulled]) if (!live.some(m => m.id === id && m.media?.session === p.session)) dropPull(id);
      for (const m of live) if (!pulled.has(m.id) && m.media) pull(m.id, m.media.session);
      if (canSend() && mic && !micTx) pushMic();
    };

    const meter = setInterval(() => {
      const active: string[] = [];
      levels.forEach((read, id) => { if (read() > 0.04 && !(id === meId && myMuted)) active.push(id); });
      setSpeaking(prev => (prev.length === active.length && prev.every(x => active.includes(x)) ? prev : active));
    }, 200);

    const teardown = () => {
      closed = true;
      if (endTimer) clearTimeout(endTimer);
      clearInterval(meter);
      pulled.forEach(silence); pulled.clear();
      pc?.close(); pc = null;
      releaseMic();
      void ctx?.close();
      transport?.close();
    };
    const endRoom = (message?: string) => {
      if (closed) return;
      teardown();
      if (message) setError(message);
      setStatus('ended');
    };

    const onSync = (members: SpaceMember[]) => {
      current = members;
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

    const becomeListener = () => {
      myRole = 'listener'; myHand = false; setRole('listener'); setHand(false);
      stopMic(); releaseMic(); publish();
    };

    const handleControl = async (p: { from: string; type: string; to?: string }) => {
      if (closed || current.find(m => m.id === p.from)?.role !== 'host') return; // only the host may moderate
      if (p.type === 'end' && !host) { endRoom('The host ended this space.'); return; }
      if (p.to !== meId) return;
      if (p.type === 'promote' && myRole === 'listener') {
        myMuted = false;
        if (!(await acquireMic())) return;
        myRole = 'speaker'; myHand = false; setRole('speaker'); setHand(false); setMuted(false);
        publish(); reconcile();
      } else if (p.type === 'demote' && myRole === 'speaker') {
        becomeListener();
      } else if (p.type === 'mute' && myRole !== 'listener') {
        myMuted = true; setMuted(true); mic?.getAudioTracks().forEach(t => { t.enabled = false; }); publish();
      }
    };

    controls.current = {
      toggleMute: () => {
        if (myRole === 'listener') return;
        myMuted = !myMuted; setMuted(myMuted);
        mic?.getAudioTracks().forEach(t => { t.enabled = !myMuted; });
        publish();
      },
      raiseHand: () => { if (myRole !== 'listener') return; myHand = !myHand; setHand(myHand); publish(); },
      control: (type, to) => {
        if (myRole !== 'host') return;
        transport?.send('control', { type }, to);
        if (type === 'end') setTimeout(() => endRoom(), 300); // let the broadcast leave first
      },
      leave: () => endRoom(),
      resume: () => { pulled.forEach(p => { void p.audio?.play().then(() => setAudioBlocked(false)); }); void ctx?.resume(); },
    };

    (async () => {
      if (host && !(await acquireMic())) { if (!closed) setStatus('error'); return; }
      if (closed) { releaseMic(); return; }
      const onMessage = ({ from, to, event, payload }: SpaceMessage) => {
        if (event === 'control') void handleControl({ from, type: String(payload.type), to: to ?? undefined });
      };
      transport = createSpaceTransport<SpaceMember>(spaceId, {
        lobby: host ? lobbyMeta : undefined,
        onMembers: onSync,
        onMessage,
        onReady: () => {
          if (!host) endTimer = setTimeout(() => { if (!hostSeen) endRoom('This space is not live right now.'); }, 7000);
        },
        onError: message => { if (!closed) { setError(message); setStatus('error'); } },
      });
      publish();
    })();

    return () => { if (!closed) teardown(); controls.current = undefined; };
  }, [spaceId, meId, meName, meAvatar, host, title, enabled]);

  return {
    members, status, error, role, muted, hand, speaking, roomTitle, audioBlocked,
    toggleMute: useCallback(() => controls.current?.toggleMute(), []),
    raiseHand: useCallback(() => controls.current?.raiseHand(), []),
    promote: useCallback((id: string) => controls.current?.control('promote', id), []),
    demote: useCallback((id: string) => controls.current?.control('demote', id), []),
    forceMute: useCallback((id: string) => controls.current?.control('mute', id), []),
    end: useCallback(() => controls.current?.control('end'), []),
    leave: useCallback(() => controls.current?.leave(), []),
    resumeAudio: useCallback(() => controls.current?.resume(), []),
  };
};

/** Live spaces: those whose host is still polling. Refreshed every few seconds. */
export const useSpacesLobby = () => {
  const [spaces, setSpaces] = useState<LobbySpace[]>([]);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => api<LobbySpace[]>('/api/spaces').then(
      list => { if (active) { setSpaces(list.sort((a, b) => b.startedAt - a.startedAt)); setConnected(true); } },
      () => { if (active) setConnected(false); },
    );
    void load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return { spaces, connected };
};
