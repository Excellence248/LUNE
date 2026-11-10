import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { showError } from '@/utils/toast';

/** A destructive action waiting for the member to confirm it. */
export interface Confirm { title: string; description: string; action: string; run: () => Promise<void> }

/** Asks before a destructive action and shows an error toast if it fails. */
const ConfirmDialog = ({ confirm, onClose }: { confirm: Confirm; onClose: () => void }) => {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <AlertDialogContent className="border-white/10 bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-red-500 text-white hover:bg-red-600"
            onClick={event => {
              event.preventDefault();
              setBusy(true);
              confirm.run().then(onClose, error => showError(error instanceof Error ? error.message : 'That could not be done. Try again.')).finally(() => setBusy(false));
            }}
          >
            {confirm.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
