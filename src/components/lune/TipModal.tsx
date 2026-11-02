import { Coins } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
}

const TipModal = ({ isOpen, onClose, recipient }: TipModalProps) => (
  <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="bg-popover/95 backdrop-blur-2xl border-white/10 text-white rounded-3xl max-w-sm">
      <DialogHeader className="items-center text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-amber-300/10 border border-amber-300/20 flex items-center justify-center text-amber-300">
          <Coins size={22} />
        </div>
        <DialogTitle className="font-display text-xl">Tipping unavailable</DialogTitle>
        <DialogDescription className="text-white/50 leading-relaxed">
          Tips to {recipient} can't be sent. Wallet signing and a verified recipient address are not connected. No funds have been transferred.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default TipModal;
