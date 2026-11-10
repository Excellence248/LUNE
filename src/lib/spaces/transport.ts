import { ApiError, api } from '@/lib/api';

/*
 * Space signalling over plain HTTP. About once a second the browser reports its presence and
 * receives who is in the room plus any connection messages addressed to it. The server stamps the
 * sender and decides who the host is, so neither can be faked.
 */

export interface SpaceMessage {
  from: string;
  to: string | null;
  event: 'signal' | 'control';
  payload: Record<string, unknown>;
}

interface PollResult<M> {
  members: M[];
  signals: { id: number; from_id: string; to_id: string | null; event: SpaceMessage['event']; payload: Record<string, unknown> }[];
  last: number;
}

interface TransportOptions<M> {
  /** Extra listing details while hosting, read on every poll so the listener count stays fresh. */
  lobby?: () => object;
  onMembers: (members: M[]) => void;
  onMessage: (message: SpaceMessage) => void;
  onReady: () => void;
  onError: (message: string) => void;
}

const POLL_MS = 1000;
const PAGE = 200;

export const createSpaceTransport = <M>(spaceId: string, { lobby, onMembers, onMessage, onReady, onError }: TransportOptions<M>) => {
  const base = `/api/spaces/${encodeURIComponent(spaceId)}`;
  let meta: object | null = null;
  let after = 0;
  let ready = false;
  let closed = false;
  let failures = 0;
  let inFlight = false;
  let rerun = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastMembers = '';

  const poll = async () => {
    if (closed || !meta) return;
    if (inFlight) { rerun = true; return; }
    inFlight = true;
    clearTimeout(timer);
    try {
      const data = await api<PollResult<M>>(`${base}/poll`, { method: 'POST', body: { meta, lobby: lobby?.(), after } });
      if (closed) return;
      failures = 0;
      // A full page means more are waiting; continue from the last one received.
      after = data.signals.length === PAGE ? data.signals[PAGE - 1].id : data.last;
      const members = JSON.stringify(data.members);
      if (members !== lastMembers) { lastMembers = members; onMembers(data.members); }
      // Messages from before we joined were never meant for us.
      if (ready) for (const s of data.signals) onMessage({ from: s.from_id, to: s.to_id, event: s.event, payload: s.payload });
      if (!ready) { ready = true; onReady(); }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 401)) { closed = true; onError(error.message); return; }
      if (++failures === 5) onError('Could not connect to the audio service. Check your connection.');
    } finally {
      inFlight = false;
      if (!closed) timer = setTimeout(poll, rerun ? 0 : POLL_MS);
      rerun = false;
    }
  };

  return {
    /** Sets this member's presence details and sends them right away. */
    track: (next: object) => { meta = next; void poll(); },
    send: (event: SpaceMessage['event'], payload: object, to?: string) => {
      if (closed) return;
      void api(`${base}/send`, { method: 'POST', body: { event, payload, to } }).catch(() => undefined);
    },
    close: () => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      void api(`${base}/leave`, { method: 'POST', body: {} }).catch(() => undefined);
    },
  };
};

export type SpaceTransport = ReturnType<typeof createSpaceTransport>;
