import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api, uploadImage } from '@/lib/api';
import { prepareImage } from '@/lib/images';
import type { CommunityDetails } from '@/lib/communities';
import { showSuccess } from '@/utils/toast';

const Picture = ({ label, current, file, onPick, wide }: { label: string; current: string; file: File | null; onPick: (file: File) => void; wide?: boolean }) => {
  const ref = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const shown = url || current;
  return (
    <button type="button" onClick={() => ref.current?.click()} aria-label={`Change ${label}`} className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 text-white/50 hover:border-lune-400/50 ${wide ? 'h-24 w-full' : 'h-16 w-16'}`}>
      {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-2 text-xs"><ImagePlus size={18} />{wide ? `Add a ${label}` : ''}</span>}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { const picked = event.target.files?.[0]; if (picked) onPick(picked); event.target.value = ''; }} />
    </button>
  );
};

/** The owner's form for changing a community's name, description, rules, picture and cover. */
const EditCommunity = ({ community, open, onClose, onSaved }: { community: CommunityDetails; open: boolean; onClose: () => void; onSaved: (next: CommunityDetails) => void }) => {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [rules, setRules] = useState(community.rules);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = { name, description, rules };
      if (avatar) body.avatar_url = await uploadImage(await prepareImage(avatar));
      if (cover) body.cover_url = await uploadImage(await prepareImage(cover));
      const next = await api<CommunityDetails>(`/api/communities/${community.slug}`, { method: 'PATCH', body });
      showSuccess('Community updated.');
      onSaved(next);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The changes could not be saved. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit community</DialogTitle>
          <DialogDescription>The web address stays the same so existing links keep working.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Picture label="cover picture" current={community.cover_url} file={cover} onPick={setCover} wide />
          <div className="flex items-center gap-3">
            <Picture label="picture" current={community.avatar_url} file={avatar} onPick={setAvatar} />
            <label className="block flex-1 text-xs text-white/50">Name
              <input value={name} maxLength={60} required onChange={event => setName(event.target.value)} className="lune-input mt-1 w-full text-[16px]" />
            </label>
          </div>
          <label className="block text-xs text-white/50">What is it about?
            <textarea value={description} maxLength={500} rows={3} onChange={event => setDescription(event.target.value)} className="lune-input mt-1 w-full resize-none text-[16px]" />
          </label>
          <label className="block text-xs text-white/50">Rules
            <textarea value={rules} maxLength={1000} rows={3} onChange={event => setRules(event.target.value)} className="lune-input mt-1 w-full resize-none text-[16px]" />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={saving || name.trim().length < 3} className="lune-btn h-10 px-5 text-sm">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCommunity;
