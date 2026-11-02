import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, X, UserRound, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const { addPost } = useSocial();
  const { session, user, loading, authError, refreshProfile } = useWallet();

  useEffect(() => {
    if (!image) { setPreview(null); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        showError('Choose a JPG, PNG, WebP, or GIF image up to 5MB.');
      } else setImage(file);
    }
    event.target.value = '';
  };

  const handlePost = async () => {
    if (!user || busy.current || (!content.trim() && !image)) return;
    busy.current = true;
    setPosting(true);
    try {
      await addPost(content, image || undefined);
      setContent('');
      setImage(null);
      showSuccess('Your public post was saved.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Post could not be saved. Please retry.');
    } finally { busy.current = false; setPosting(false); }
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

  return (
    <div className="px-4 md:px-6 pt-5 pb-3">
      <div className="flex gap-3.5">
        <Avatar className="w-11 h-11 ring-1 ring-white/10 shrink-0">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-lune-500 to-lune-800 text-white text-sm font-semibold">{user.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/35 mb-1">Public · visible to everyone</p>
          <textarea
            aria-label="Write a public post"
            value={content}
            disabled={posting}
            maxLength={2000}
            onChange={event => setContent(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); handlePost(); } }}
            placeholder="What's the alpha today?"
            rows={2}
            className="w-full bg-transparent border-none text-[17px] text-white placeholder:text-white/30 focus:outline-none focus:ring-0 resize-none min-h-[64px] pt-2 leading-relaxed"
          />
          {preview && (
            <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-white/10 max-w-md">
              <img src={preview} alt="Attachment preview" className="w-full h-auto max-h-80 object-cover" />
              <button disabled={posting} onClick={() => setImage(null)} aria-label="Remove image" className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white"><X size={16} /></button>
            </div>
          )}
          <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />
            <button disabled={posting} onClick={() => fileInputRef.current?.click()} aria-label="Add image" className="h-9 w-9 flex items-center justify-center text-lune-300 hover:bg-lune-500/10 rounded-full"><ImageIcon size={18} /></button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/35 tabular-nums">{content.length}/2000</span>
              <button onClick={handlePost} disabled={posting || (!content.trim() && !image)} className="lune-btn h-9 text-sm">{posting ? 'Posting…' : 'Post'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
