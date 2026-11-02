import { useEffect, useState } from 'react';
import { Wallet, Loader2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { getSolanaWallet, WalletName } from '@/lib/solana-wallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const wallets: { name: WalletName; url: string }[] = [
  { name: 'Phantom', url: 'https://phantom.com/download' },
  { name: 'Solflare', url: 'https://www.solflare.com/download/' },
];

const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { connectWallet, connecting, authError } = useWallet();
  const [installed, setInstalled] = useState<WalletName[]>([]);
  const [selected, setSelected] = useState<WalletName | null>(null);
  useEffect(() => {
    if (isOpen) setInstalled(wallets.filter(wallet => !!getSolanaWallet(wallet.name)).map(wallet => wallet.name));
  }, [isOpen]);

  const connect = async (name: WalletName) => {
    setSelected(name);
    try {
      await connectWallet(name);
      onClose();
    } catch {
      // The context exposes the real authentication failure in this dialog.
    } finally { setSelected(null); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !connecting) onClose(); }}>
      <DialogContent className="bg-popover/95 backdrop-blur-2xl border-white/10 text-white rounded-3xl max-w-sm">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-lune-500/15 border border-lune-400/20 flex items-center justify-center text-lune-300"><Wallet size={22} /></div>
          <DialogTitle className="font-display text-xl">Connect your Solana wallet</DialogTitle>
          <DialogDescription className="text-white/50 leading-relaxed">
            Read freely. Sign a wallet sign-in message to post, like, and reply. No password, email, transaction, or transfer is requested.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {wallets.map(wallet => installed.includes(wallet.name) ? (
            <Button key={wallet.name} disabled={connecting} onClick={() => connect(wallet.name)} variant="outline" className="w-full h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-white justify-between">
              {wallet.name}
              {connecting && selected === wallet.name ? <Loader2 size={18} className="animate-spin" /> : <span className="text-xs text-lune-300">Connect & sign in</span>}
            </Button>
          ) : (
            <a key={wallet.name} href={wallet.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 border border-white/10 rounded-xl text-sm text-white/50 hover:text-white">
              {wallet.name} not detected <span className="inline-flex items-center gap-1 text-xs">Get wallet <ExternalLink size={12} /></span>
            </a>
          ))}
        </div>
        {!installed.length && <p className="text-xs text-white/45">Wallet extensions may not be exposed inside this preview. Open the app as a full browser page with Phantom or Solflare installed, or use your wallet’s in-app browser.</p>}
        {authError && <p role="alert" className="text-sm text-red-300 break-words">{authError}</p>}
        <p className="text-xs text-white/40">Your wallet address and public posts will be visible to everyone. Never share a seed phrase or private key.</p>
      </DialogContent>
    </Dialog>
  );
};

export default WalletModal;
