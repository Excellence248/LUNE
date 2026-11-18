import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const RATES = [1, 1.5, 2];
const FLAT_BARS = Array.from({ length: 30 }, (_, i) => 28 + ((i * 37) % 40));

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// Only one voice message plays at a time: starting one stops the one before it.
let nowPlaying: HTMLAudioElement | null = null;

interface VoiceBubbleProps {
  voiceId: string;
  durationMs: number;
  peaks: number[] | null;
  /** Your own message (purple bubble) or theirs (glass bubble); only changes the colours. */
  mine: boolean;
}

/** A voice message: play/pause, a waveform you can tap to jump around in, the time, and 1x/1.5x/2x speed. */
const VoiceBubble = ({ voiceId, durationMs, peaks, mine }: VoiceBubbleProps) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const total = Math.max(0.5, durationMs / 1000);
  const bars = peaks && peaks.length ? peaks : FLAT_BARS;
  const progress = Math.min(1, position / total);

  // Created on first use so a long chat does not open dozens of audio connections at once.
  const element = () => {
    if (audio.current) return audio.current;
    const created = new Audio(`/api/voice/${voiceId}`);
    created.preload = 'metadata';
    created.addEventListener('timeupdate', () => setPosition(created.currentTime));
    created.addEventListener('playing', () => { setPlaying(true); setLoading(false); });
    created.addEventListener('waiting', () => setLoading(true));
    created.addEventListener('pause', () => setPlaying(false));
    created.addEventListener('ended', () => { setPlaying(false); setPosition(0); created.currentTime = 0; });
    created.addEventListener('error', () => { setFailed(true); setPlaying(false); setLoading(false); });
    audio.current = created;
    return created;
  };

  useEffect(() => () => {
    audio.current?.pause();
    if (nowPlaying === audio.current) nowPlaying = null;
    audio.current = null;
  }, []);

  const toggle = async () => {
    const current = element();
    if (!current.paused) { current.pause(); return; }
    if (nowPlaying && nowPlaying !== current) nowPlaying.pause();
    nowPlaying = current;
    setFailed(false);
    setLoading(true);
    current.playbackRate = rate;
    try { await current.play(); } catch { setFailed(true); setLoading(false); }
  };

  const seek = (ratio: number) => {
    const current = element();
    const to = Math.max(0, Math.min(1, ratio)) * total;
    current.currentTime = to;
    setPosition(to);
  };

  const onWaveClick = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    seek((event.clientX - box.left) / box.width);
  };
  const onWaveKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); seek(progress + 0.05); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek(progress - 0.05); }
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  return (
    <div className="flex w-[15.5rem] max-w-full items-center gap-2.5 sm:w-64">
      <button
        type="button" onClick={() => void toggle()} aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
          mine ? 'bg-white text-lune-700' : 'bg-lune-500 text-white')}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="translate-x-px" />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          role="slider" tabIndex={0} aria-label="Voice message position" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(position)}
          aria-valuetext={`${clock(position)} of ${clock(total)}`} onClick={onWaveClick} onKeyDown={onWaveKey}
          className="flex h-9 cursor-pointer items-center gap-[2px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {bars.map((bar, index) => {
            const played = (index + 0.5) / bars.length <= progress;
            return <span key={index} aria-hidden style={{ height: `${Math.max(12, bar)}%` }} className={cn('w-[3px] flex-1 rounded-full transition-colors', played ? (mine ? 'bg-white' : 'bg-lune-300') : (mine ? 'bg-white/40' : 'bg-white/30'))} />;
          })}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[11px] tabular-nums">
          <span className={mine ? 'text-white/80' : 'text-white/55'}>{failed ? 'Couldn’t play' : clock(playing || position > 0 ? position : total)}</span>
          <button type="button" onClick={cycleRate} aria-label={`Playback speed ${rate}x`} className={cn('rounded-full px-1.5 font-semibold transition-colors', mine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white/10 text-white/70 hover:bg-white/20')}>{rate}x</button>
        </div>
      </div>
    </div>
  );
};

export default VoiceBubble;
