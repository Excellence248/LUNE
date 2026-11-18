import { useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_CHAT_PRESET, PRESETS, backgroundCss, prepareBackground, resetAppearance, setAppearance, useAppearance, type Background } from '@/lib/appearance';
import { cn } from '@/lib/utils';

type Area = 'app' | 'chat';

const AREAS: { area: Area; title: string; hint: string; dim: 'appDim' | 'chatDim' }[] = [
  { area: 'app', title: 'App background', hint: 'Behind every page of Lune.', dim: 'appDim' },
  { area: 'chat', title: 'Chat wallpaper', hint: 'Behind your conversations.', dim: 'chatDim' },
];

const sameChoice = (a: Background, b: Background) =>
  a.kind === b.kind && (a.kind === 'preset' ? a.id === (b as typeof a).id : a.kind === 'image' ? a.data === (b as typeof a).data : true);

const Tile = ({ selected, label, onClick, style, children }: { selected: boolean; label: string; onClick: () => void; style?: React.CSSProperties; children?: React.ReactNode }) => (
  <button
    type="button" onClick={onClick} aria-label={label} aria-pressed={selected} title={label} style={style}
    className={cn('relative flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl border text-xs font-medium text-white/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lune-400',
      selected ? 'border-lune-300 ring-2 ring-lune-400/60' : 'border-white/15 hover:border-white/40')}
  >
    {children}
    {selected && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-lune-500 text-white shadow"><Check size={12} strokeWidth={3} /></span>}
  </button>
);

/** Pick a preset or upload a picture for the app and for the chat. Saved on this device. */
const AppearancePanel = () => {
  const appearance = useAppearance();
  const [busy, setBusy] = useState<Area | null>(null);
  const [error, setError] = useState('');
  const files = useRef<Record<Area, HTMLInputElement | null>>({ app: null, chat: null });

  const choose = (area: Area, choice: Background) => {
    setError('');
    try { setAppearance({ [area]: choice }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'That could not be saved.'); }
  };

  const upload = async (area: Area, file: File | undefined) => {
    if (!file) return;
    setError('');
    setBusy(area);
    try {
      choose(area, { kind: 'image', data: await prepareBackground(file) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That picture could not be used.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {AREAS.map(({ area, title, hint, dim }) => {
        const current = appearance[area];
        return (
          <section key={area} aria-label={title} className="space-y-3">
            <div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="text-sm text-white/45">{hint}</p>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Space</p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              <Tile label="Default" selected={current.kind === 'default'} onClick={() => choose(area, { kind: 'default' })} style={{ background: PRESETS.find(preset => preset.id === (area === 'chat' ? DEFAULT_CHAT_PRESET : 'midnight'))?.css }}>Default</Tile>
              {PRESETS.filter(preset => preset.group === 'space').map(preset => (
                <Tile key={preset.id} label={preset.name} selected={sameChoice(current, { kind: 'preset', id: preset.id })} onClick={() => choose(area, { kind: 'preset', id: preset.id })} style={{ background: preset.css }}>
                  <span className="rounded-full bg-black/45 px-2 py-0.5 backdrop-blur">{preset.name}</span>
                </Tile>
              ))}
              <Tile label="Upload your own picture" selected={current.kind === 'image'} onClick={() => files.current[area]?.click()} style={current.kind === 'image' ? { background: backgroundCss(current) ?? undefined } : undefined}>
                <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 backdrop-blur">
                  {busy === area ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}{current.kind === 'image' ? 'Change' : 'Your picture'}
                </span>
              </Tile>
              <input ref={element => { files.current[area] = element; }} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(area, file); }} />
            </div>
            <p className="pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Colours</p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {PRESETS.filter(preset => preset.group === 'color').map(preset => (
                <Tile key={preset.id} label={preset.name} selected={sameChoice(current, { kind: 'preset', id: preset.id })} onClick={() => choose(area, { kind: 'preset', id: preset.id })} style={{ background: preset.css }}>
                  <span className="rounded-full bg-black/40 px-2 py-0.5 backdrop-blur">{preset.name}</span>
                </Tile>
              ))}
            </div>

            {current.kind !== 'default' && (
              <label className="flex items-center gap-3 text-sm text-white/60">
                <span className="w-24 shrink-0">Darken</span>
                <input
                  type="range" min={0} max={80} step={5} value={Math.round(appearance[dim] * 100)} aria-label={`${title} darkness`}
                  onChange={event => { try { setAppearance({ [dim]: Number(event.target.value) / 100 }); } catch { /* storage full */ } }}
                  className="h-1.5 flex-1 cursor-pointer accent-purple-400"
                />
                <span className="w-10 text-right tabular-nums text-white/45">{Math.round(appearance[dim] * 100)}%</span>
              </label>
            )}
            {area === 'chat' && (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                <span><span className="font-medium text-white/85">Space doodles</span><span className="block text-xs text-white/40">A faint pattern of moons, stars, planets and rockets over the wallpaper.</span></span>
                <input type="checkbox" checked={appearance.doodles} onChange={event => { try { setAppearance({ doodles: event.target.checked }); } catch { /* storage full */ } }} className="h-5 w-5 shrink-0 cursor-pointer accent-purple-400" aria-label="Show space doodles on chats" />
              </label>
            )}
          </section>
        );
      })}

      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-white/35">Saved on this device only. Your pictures are never uploaded.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => { setError(''); resetAppearance(); }} className="rounded-full border-white/15 bg-transparent"><RotateCcw className="mr-2 h-3.5 w-3.5" />Reset to default</Button>
      </div>
    </div>
  );
};

export default AppearancePanel;
