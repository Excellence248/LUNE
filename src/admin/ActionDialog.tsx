import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BadgeTier } from './api';

export interface ActionValues {
  reason: string;
  until: string | null;
  tier: BadgeTier | null;
}

interface ActionDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Show an optional end date ("until"), e.g. for suspensions and badges. */
  withUntil?: string;
  withTier?: boolean;
  onConfirm: (values: ActionValues) => Promise<void>;
  onClose: () => void;
}

/** Every admin action asks for a reason, which is stored in the audit log. */
const ActionDialog = ({ title, description, confirmLabel, destructive, withUntil, withTier, onConfirm, onClose }: ActionDialogProps) => {
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [tier, setTier] = useState<BadgeTier | 'none'>('blue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return setError('Give a reason. It is saved in the audit log.');
    setBusy(true);
    setError('');
    try {
      await onConfirm({ reason: reason.trim(), until: until ? new Date(`${until}T23:59:59`).toISOString() : null, tier: withTier && tier !== 'none' ? tier : null });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {withTier && (
            <div className="space-y-2">
              <Label>Badge</Label>
              <div className="flex gap-2" role="radiogroup">
                {(['blue', 'gold', 'none'] as const).map(option => (
                  <Button key={option} type="button" role="radio" aria-checked={tier === option} variant={tier === option ? 'default' : 'outline'} size="sm" className="flex-1 capitalize" onClick={() => setTier(option)}>
                    {option === 'none' ? 'Remove badge' : option}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {withUntil && (!withTier || tier !== 'none') && (
            <div className="space-y-2">
              <Label htmlFor="action-until">{withUntil} <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="action-until" type="date" min={today} value={until} onChange={event => setUntil(event.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="action-reason">Reason</Label>
            <Textarea id="action-reason" autoFocus maxLength={500} rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Why are you doing this?" />
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActionDialog;
