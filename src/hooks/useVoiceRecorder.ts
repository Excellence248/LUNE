import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_VOICE_MS = 120_000;
export const MIN_VOICE_MS = 600;
const SAMPLE_MS = 100;
const LIVE_BARS = 36;
const SAVED_BARS = 48;

export interface Recording { blob: Blob; durationMs: number; peaks: number[] }

/** Safari records MP4, Chrome and Edge WebM, Firefox Ogg. Picks the first one this browser can make. */
const pickMimeType = () => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type));
};

const micErrorMessage = (error: unknown) => {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Allow microphone access in your browser to record a voice message.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'Your microphone is being used by another app.';
  return error instanceof Error && error.message ? error.message : 'Your microphone could not be started.';
};

/** Turns the loudness samples taken while recording into up to 48 bars from 0 to 100 for the waveform. */
export const toPeaks = (samples: number[]): number[] => {
  if (!samples.length) return [];
  const bars = Math.min(SAVED_BARS, samples.length);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const from = Math.floor((i * samples.length) / bars);
    const to = Math.max(from + 1, Math.floor(((i + 1) * samples.length) / bars));
    const slice = samples.slice(from, to);
    out.push(Math.max(...slice));
  }
  const loudest = Math.max(...out, 1);
  // Scale so the loudest bar is full height, and keep every bar visible.
  return out.map(value => Math.max(6, Math.min(100, Math.round((value / loudest) * 100))));
};

/**
 * Records a voice message with the microphone. start() asks for the microphone and begins; stop() ends
 * and resolves the recording (null if it was too short); cancel() throws it away. At two minutes it
 * stops by itself and hands the recording to the callback given to start().
 */
export const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState<number[]>([]);
  const [error, setError] = useState('');

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const chunks = useRef<Blob[]>([]);
  const samples = useRef<number[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startedAt = useRef(0);
  const limitHandler = useRef<((recording: Recording | null) => void) | undefined>(undefined);
  const mimeType = useRef<string | undefined>(undefined);

  const release = useCallback(() => {
    clearInterval(timer.current);
    timer.current = undefined;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    void context.current?.close().catch(() => undefined);
    context.current = null;
    recorder.current = null;
    setRecording(false);
    setElapsed(0);
    setLive([]);
  }, []);

  /** Stops the recorder and builds the result. */
  const finish = useCallback((keep: boolean): Promise<Recording | null> => new Promise(resolve => {
    const active = recorder.current;
    if (!active || active.state === 'inactive') { release(); resolve(null); return; }
    const durationMs = Date.now() - startedAt.current;
    const peaks = toPeaks(samples.current);
    active.onstop = () => {
      const blob = new Blob(chunks.current, { type: mimeType.current?.split(';')[0] || 'audio/webm' });
      chunks.current = [];
      samples.current = [];
      release();
      resolve(keep && durationMs >= MIN_VOICE_MS && blob.size > 0 ? { blob, durationMs: Math.min(durationMs, MAX_VOICE_MS), peaks } : null);
    };
    active.stop();
  }), [release]);

  const start = useCallback(async (onLimit?: (recording: Recording | null) => void) => {
    if (recorder.current) return false;
    setError('');
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice messages need a secure (HTTPS) connection and a browser that can record audio.');
      return false;
    }
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      stream.current = mic;
      mimeType.current = pickMimeType();
      const media = new MediaRecorder(mic, { ...(mimeType.current ? { mimeType: mimeType.current } : {}), audioBitsPerSecond: 32000 });
      recorder.current = media;
      chunks.current = [];
      samples.current = [];
      media.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };

      // Loudness for the live waveform and the saved one.
      const audio = new AudioContext();
      context.current = audio;
      const analyser = audio.createAnalyser();
      analyser.fftSize = 512;
      audio.createMediaStreamSource(mic).connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);

      limitHandler.current = onLimit;
      startedAt.current = Date.now();
      media.start(250);
      setRecording(true);
      timer.current = setInterval(() => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (const value of buffer) sum += ((value - 128) / 128) ** 2;
        const level = Math.min(100, Math.round(Math.sqrt(sum / buffer.length) * 320));
        samples.current.push(level);
        const ms = Date.now() - startedAt.current;
        setElapsed(ms);
        setLive(previous => [...previous.slice(-(LIVE_BARS - 1)), Math.max(6, level)]);
        if (ms >= MAX_VOICE_MS) void finish(true).then(result => limitHandler.current?.(result));
      }, SAMPLE_MS);
      return true;
    } catch (cause) {
      release();
      setError(micErrorMessage(cause));
      return false;
    }
  }, [finish, release]);

  const stop = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => { void finish(false); }, [finish]);

  // Leaving the page must never leave the microphone on.
  useEffect(() => () => { void finish(false); }, [finish]);

  return { recording, elapsed, live, error, clearError: () => setError(''), start, stop, cancel };
};
