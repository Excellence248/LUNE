import { Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal = ({ isOpen, onClose }: WalletModalProps) => (
  <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="bg-popover/95 backdrop-blur-2xl border-white/10 text-white rounded-3xl max-w-sm">
      <DialogHeader className="items-center text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-lune-500/15 border border-lune-400/20 flex items-center justify-center text-lune-300">
          <Wallet size={22} />
        </div>
        <DialogTitle className="font-display text-xl">Wallet connection unavailable</DialogTitle>
        <DialogDescription className="text-white/50 leading-relaxed">
          No wallet provider is integrated. This app cannot connect a wallet, read on-chain balances, sign transactions, or transfer funds.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default WalletModal;
