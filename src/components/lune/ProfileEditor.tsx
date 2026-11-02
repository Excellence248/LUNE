import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Edit3, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/context/WalletContext';
import { showSuccess } from '@/utils/toast';

const ProfileEditor = () => {
  const { user, updateProfile } = useWallet();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ username: '', bio: '', avatar: '' });
  const fileInput = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  if (!user) return null;
  const busy = saving || readingImage;

  const handleOpenChange = (nextOpen: boolean) => {
    if (busy) return;
    if (nextOpen) {
      setDraft({ username: user.username, bio: user.bio, avatar: user.avatar });
      setError('');
    }
    setOpen(nextOpen);
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Your avatar must be 2 MB or smaller.');
      return;
    }
    setError('');
    setReadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const avatar = reader.result as string;
      setDraft(previous => ({ ...previous, avatar }));
      setReadingImage(false);
    };
    reader.onerror = () => {
      setError('This image could not be read. Please choose another image.');
      setReadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current || readingImage) return;
    setError('');
    savingRef.current = true;
    setSaving(true);
    try {
      await updateProfile({ ...draft, username: draft.username.trim() });
      setOpen(false);
      showSuccess('Profile updated!');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your profile could not be saved. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full border-white/15 bg-white/[0.03] hover:bg-white/[0.08]">
          <Edit3 className="mr-2 h-4 w-4" /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl border-white/10 bg-popover text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Make it yours</DialogTitle>
          <DialogDescription>Your avatar, handle, and bio are visible on your public profile.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-6 pt-2" aria-busy={busy}>
          <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
            <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Choose profile avatar" className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lune-400">
                <Avatar className="h-20 w-20 ring-2 ring-lune-400/30">
                  <AvatarImage src={draft.avatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-lune-400 to-lune-800 text-2xl font-bold">{draft.username[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 rounded-full border-4 border-popover bg-lune-500 p-2"><Camera size={14} /></span>
              </button>
              <div className="space-y-1">
                <Button type="button" variant="ghost" className="h-auto p-0 text-sm hover:bg-transparent hover:text-lune-300" onClick={() => fileInput.current?.click()}>Change photo</Button>
                <p className="text-xs text-white/40">JPG, PNG, WebP, or GIF · max 2 MB</p>
                {draft.avatar && <button type="button" onClick={() => setDraft(previous => ({ ...previous, avatar: '' }))} className="text-xs text-white/50 hover:text-white">Remove photo</button>}
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageSelect} className="hidden" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-username">Username</Label>
              <Input id="profile-username" value={draft.username} onChange={event => setDraft(previous => ({ ...previous, username: event.target.value }))} required minLength={3} maxLength={64} pattern="[A-Za-z0-9_]{3,64}" aria-describedby="username-help" autoComplete="username" className="h-12 border-white/10 bg-white/[0.03]" />
              <p id="username-help" className="text-xs text-white/40">3–64 letters, numbers, or underscores. Must be unique.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label htmlFor="profile-bio">Bio</Label><span className="text-xs tabular-nums text-white/40">{draft.bio.length}/500</span></div>
              <Textarea id="profile-bio" value={draft.bio} onChange={event => setDraft(previous => ({ ...previous, bio: event.target.value }))} maxLength={500} placeholder="A little about you and what you're here for…" className="min-h-28 resize-none border-white/10 bg-white/[0.03]" />
            </div>
          </fieldset>
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="rounded-full bg-lune-500 px-6 text-white hover:bg-lune-600">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Saving…' : readingImage ? 'Reading image…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditor;
