import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSocial, type ReportTarget } from '@/context/SocialContext';
import { showSuccess } from '@/utils/toast';

const REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Something else' },
];

const NOUNS: Record<ReportTarget['type'], string> = { post: 'post', reply: 'reply', profile: 'account' };

/** Sends a report to the Lune admins. Reporting is private: the reported member is not told who reported them. */
const ReportDialog = ({ target, onClose }: { target: ReportTarget; onClose: () => void }) => {
  const { report } = useSocial();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) return setError('Choose a reason.');
    setBusy(true);
    setError('');
    try {
      await report(target, reason, details);
      showSuccess('Thanks. The Lune admins will review your report.');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your report could not be sent. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="border-white/10 bg-card sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Report this {NOUNS[target.type]}</DialogTitle>
            <DialogDescription>{target.label ? `${target.label}. ` : ''}Admins review every report. The member won’t see who reported them.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">Reason</legend>
            {REASONS.map(option => (
              <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${reason === option.value ? 'border-lune-400/60 bg-lune-500/15 text-white' : 'border-white/10 text-white/70 hover:bg-white/5'}`}>
                <input type="radio" name="report-reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} className="accent-lune-400" />
                {option.label}
              </label>
            ))}
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="report-details">Details <span className="text-white/40">(optional)</span></Label>
            <Textarea id="report-details" rows={3} maxLength={1000} value={details} onChange={event => setDetails(event.target.value)} placeholder="Anything that helps the admins understand" />
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send report</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
