"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, ChevronRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { showSuccess } from '@/utils/toast';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { connect } = useWallet();
  const [connecting, setConnecting] = React.useState<string | null>(null);
  
  const wallets = [
    { name: 'Phantom', icon: '👻', color: 'bg-purple-500/10' },
    { name: 'Solflare', icon: '☀️', color: 'bg-orange-500/10' },
    { name: 'Backpack', icon: '🎒', color: 'bg-red-500/10' },
    { name: 'Ledger', icon: '🛡️', color: 'bg-blue-500/10' },
  ];

  const handleConnect = (walletName: string) => {
    setConnecting(walletName);
    // Simulate wallet extension handshake
    setTimeout(() => {
      connect();
      showSuccess(`${walletName} connected successfully!`);
      setConnecting(null);
      onClose();
    }, 1200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#050505] border-white/10 text-white rounded-[2.5rem] max-w-sm p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
            Connect Wallet <Wallet className="text-purple-500" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              disabled={!!connecting}
              onClick={() => handleConnect(wallet.name)}
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-white/10 transition-all flex items-center justify-between group disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${wallet.color} flex items-center justify-center text-xl`}>
                  {wallet.icon}
                </div>
                <span className="font-bold">{wallet.name}</span>
              </div>
              {connecting === wallet.name ? (
                <Loader2 size={18} className="animate-spin text-purple-500" />
              ) : (
                <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex gap-3">
          <ShieldCheck className="text-purple-400 shrink-0" size={18} />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            By connecting your wallet, you agree to Lune's Terms of Service. Your private keys never leave your device.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletModal;