import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, X, UserRound, Loader2, Plus, ListTree } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSocial, type PostPart } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';
import { hasPostedFirst, markPostedFirst } from '@/lib/onboarding';
import { MAX_PICTURES, PICTURE_TYPES } from '@/lib/images';

const MAX_PARTS = 10;

interface Draft { key: number; content: string; images: File[] }

const Thumb = ({ file, disabled, onRemove }: { file: File; disabled: boolean; onRemove: () => void }) => {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
      <img src={url} alt="Picture to post" className="h-full w-full object-cover" />
      <button type="button" disabled={disabled} onClick={onRemove} aria-label="Remove picture" className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white"><X size={14} /></button>
    </div>
  );
};

/** Composer for the home feed and for communities. Up to 10 pictures per post; "Add another post" makes a thread. */
const CreatePost = ({ community, onPosted, placeholder }: { community?: string; onPosted?: () => void; placeholder?: string }) => {
  const [drafts, setDrafts] = useState<Draft[]>([{ key: 0, content: '', images: [] }]);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef(0);
  const nextKey = useRef(1);
  const busy = useRef(false);
  const { publish, posts } = useSocial();
  const { session, user, loading, authError, refreshProfile } = useWallet();
  const isFirstPost = !!user && !community && !hasPostedFirst(user.id) && !posts.some(post => post.user_id === user.id);

  const change = (key: number, patch: Partial<Draft>) => setDrafts(previous => previous.map(draft => draft.key === key ? { ...draft, ...patch } : draft));
  const ready = drafts.every(draft => draft.content.trim() || draft.images.length) && drafts.some(draft => draft.content.trim() || draft.images.length);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!picked.length) return;
    const target = drafts.find(draft => draft.key === pickFor.current);
    if (!target) return;
    const good = picked.filter(file => PICTURE_TYPES.includes(file.type));
    if (good.length < picked.length) showError('Only JPG, PNG, WebP and GIF pictures can be posted.');
    const room = MAX_PICTURES - target.images.length;
    if (good.length > room) showError(`A post can have up to ${MAX_PICTURES} pictures.`);
    if (room > 0 && good.length) change(target.key, { images: [...target.images, ...good.slice(0, room)] });
  };

  const handlePost = async () => {
    if (!user || busy.current || !ready) return;
    busy.current = true;
    setPosting(true);
    try {
      const parts: PostPart[] = drafts.map(draft => ({ content: draft.content, images: draft.images }));
      await publish(parts, { community, onProgress: (done, total) => setProgress(total ? { done, total } : null) });
      if (!community) markPostedFirst(user.id);
      setDrafts([{ key: nextKey.current++, content: '', images: [] }]);
      showSuccess(parts.length > 1 ? 'Your thread was posted.' : community ? 'Your post is in the community.' : 'Your public post was saved.');
      onPosted?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Post could not be saved. Please retry.');
    } finally { busy.current = false; setPosting(false); setProgress(null); }
  };

  if (loading && !user) {
    return <div className="p-5 flex items-center gap-3 text-sm text-white/45" role="status"><Loader2 className="animate-spin" size={18} />Loading your account…</div>;
  }

  if (!user) {
    return (
      <div className="px-4 md:px-6 py-5 space-y-3">
        <div className="flex items-start gap-3 text-sm text-white/50">
          <UserRound size={20} className="text-lune-300 shrink-0 mt-1" />
          <div className="space-y-3">
            <p>{session ? 'You’re logged in, but your profile could not be loaded.' : 'Join the conversation. Create an account to post, follow people, like, repost, and reply. No wallet required.'}</p>
            {session ? <Button onClick={() => void refreshProfile()} className="rounded-full">Retry loading profile</Button> : <div className="flex gap-2"><Button asChild className="rounded-full bg-lune-500 hover:bg-lune-600"><Link to="/signup">Create account</Link></Button><Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent"><Link to="/signin">Log in</Link></Button></div>}
          </div>
        </div>
        {authError && <p className="text-xs text-red-300" role="alert">{authError}</p>}
      </div>
    );
  }

  const isThread = drafts.length > 1;
  return (
    <div className="px-4 md:px-6 pt-5 pb-3">
      <input type="file" ref={fileInputRef} onChange={handleFiles} multiple accept={PICTURE_TYPES.join(',')} className="hidden" aria-label="Choose pictures" />
      {drafts.map((draft, index) => (
        <div key={draft.key} className="flex gap-3.5">
          <div className="flex flex-col items-center">
            <Avatar className="w-11 h-11 ring-1 ring-white/10 shrink-0">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-lune-500 to-lune-800 text-white text-sm font-semibold">{user.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {isThread && index < drafts.length - 1 && <span className="mt-1 w-0.5 flex-1 rounded-full bg-white/15" aria-hidden />}
          </div>
          <div className={`flex-1 min-w-0 ${index < drafts.length - 1 ? 'pb-4' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/35 mb-1">{index === 0 ? (community ? 'Posting in this community' : 'Public · visible to everyone') : `Post ${index + 1} of the thread`}</p>
              {isThread && <button type="button" disabled={posting} onClick={() => setDrafts(previous => previous.filter(row => row.key !== draft.key))} aria-label={`Remove post ${index + 1}`} className="text-xs text-white/35 hover:text-red-300">Remove</button>}
            </div>
            <textarea
              aria-label={index === 0 ? 'Write a public post' : `Write post ${index + 1} of the thread`}
              value={draft.content}
              disabled={posting}
              maxLength={2000}
              onChange={event => change(draft.key, { content: event.target.value })}
              onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void handlePost(); } }}
              placeholder={index > 0 ? 'Continue your thread…' : placeholder ?? (isFirstPost ? 'Say hello to Lune 👋' : "What's the alpha today?")}
              rows={2}
              className="w-full bg-transparent border-none text-[17px] text-white placeholder:text-white/30 focus:outline-none focus:ring-0 resize-none min-h-[64px] pt-2 leading-relaxed"
            />
            {isFirstPost && index === 0 && !draft.content && (
              <div className="mb-3 flex flex-wrap gap-2" aria-label="First post ideas">
                {['👋 Hey Lune, I just joined!', '🌙 Hello from a brand new moon', 'What should I follow first?'].map(idea => (
                  <button key={idea} type="button" onClick={() => change(draft.key, { content: idea })} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 transition-colors hover:border-lune-300/40 hover:text-white">{idea}</button>
                ))}
              </div>
            )}
            {draft.images.length > 0 && (
              <div className="mt-2 mb-3 grid max-w-md grid-cols-3 gap-1.5 sm:grid-cols-4">
                {draft.images.map((file, at) => <Thumb key={`${file.name}-${file.size}-${at}`} file={file} disabled={posting} onRemove={() => change(draft.key, { images: draft.images.filter((_, i) => i !== at) })} />)}
              </div>
            )}
            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
              <div className="flex items-center gap-1">
                <button type="button" disabled={posting || draft.images.length >= MAX_PICTURES} onClick={() => { pickFor.current = draft.key; fileInputRef.current?.click(); }} aria-label="Add pictures" className="h-9 w-9 flex items-center justify-center text-lune-300 hover:bg-lune-500/10 rounded-full disabled:opacity-40"><ImageIcon size={18} /></button>
                {draft.images.length > 0 && <span className="text-xs text-white/40 tabular-nums">{draft.images.length}/{MAX_PICTURES}</span>}
              </div>
              <span className="text-xs text-white/35 tabular-nums">{draft.content.length}/2000</span>
            </div>
          </div>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" disabled={posting || drafts.length >= MAX_PARTS} onClick={() => setDrafts(previous => [...previous, { key: nextKey.current++, content: '', images: [] }])} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 hover:border-lune-400/40 hover:text-white disabled:opacity-40">
          {isThread ? <Plus size={13} /> : <ListTree size={13} />}{isThread ? `Add another post (${drafts.length}/${MAX_PARTS})` : 'Make it a thread'}
        </button>
        <button onClick={() => void handlePost()} disabled={posting || !ready} className="lune-btn h-9 text-sm">
          {posting ? (progress && progress.total > 0 ? `Uploading ${progress.done}/${progress.total}…` : 'Posting…') : isThread ? 'Post thread' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
