import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
}

const TipModal = ({ isOpen, onClose, recipient }: TipModalProps) => (
  <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="bg-[#050505] border-white/10 text-white rounded-3xl">
      <DialogHeader>
        <DialogTitle>Tipping unavailable</DialogTitle>
        <DialogDescription className="text-gray-400">
          Tips to {recipient} cannot be sent. Wallet signing and a verified recipient address are not connected. No funds have been transferred.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default TipModal;
