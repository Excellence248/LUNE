import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal = ({ isOpen, onClose }: WalletModalProps) => (
  <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="bg-[#050505] border-white/10 text-white rounded-3xl">
      <DialogHeader>
        <DialogTitle>Wallet connection unavailable</DialogTitle>
        <DialogDescription className="text-gray-400">
          No wallet provider is integrated. This app cannot connect a wallet, read on-chain balances, sign transactions, or transfer funds.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default WalletModal;
