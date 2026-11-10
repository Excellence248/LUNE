import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/context/WalletContext';
import { api } from '@/lib/api';
import { showSuccess } from '@/utils/toast';

/** Permanently deletes the member's account after they type their username. */
const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useWallet();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/me/delete', { method: 'POST', body: { confirm } });
      // The sign-in itself is gone too; clear its cookie if Neon Auth still has one.
      await api('/api/auth/sign-out', { method: 'POST', body: {} }).catch(() => undefined);
      await refreshProfile();
      showSuccess('Your account was deleted.');
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your account could not be deleted. Try again.');
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" className="w-full border-red-400/30 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => setOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" />Delete account
      </Button>
      <Dialog open={open} onOpenChange={next => { if (!busy) { setOpen(next); setConfirm(''); setError(''); } }}>
        <DialogContent className="border-white/10 bg-card sm:max-w-md">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes your profile, posts, replies, likes, follows and images, and your sign-in. It can’t be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Type <span className="font-mono text-white">{user.username}</span> to confirm</Label>
              <Input id="delete-confirm" autoComplete="off" value={confirm} onChange={event => setConfirm(event.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={busy || confirm !== user.username}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete forever
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteAccount;
