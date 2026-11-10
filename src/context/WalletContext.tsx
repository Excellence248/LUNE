import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { getSolanaWallet, type SolanaWallet, type WalletName } from '@/lib/solana-wallet';
import { authErrorMessage } from '@/lib/auth-errors';
import { useSession } from '@/context/SessionContext';

interface WalletContextType extends ReturnType<typeof useSession> {
  connecting: boolean;
  connectWallet: (name: WalletName) => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const account = useSession();
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [provider, setProvider] = useState<SolanaWallet | null>(null);
  const connectionInProgress = useRef(false);

  useEffect(() => {
    setWalletError(null);
    if (!account.user) setProvider(null);
  }, [account.user?.id]);

  useEffect(() => {
    if (!provider || !account.user?.walletAddress) return;
    const signedAddress = account.user.walletAddress;
    const invalidate = () => {
      setProvider(null);
      void account.signOut().catch(error => setWalletError(authErrorMessage(error)));
    };
    const changed = (key?: { toBase58: () => string } | null) => {
      if (!key || key.toBase58() !== signedAddress) invalidate();
    };
    provider.on?.('accountChanged', changed);
    provider.on?.('disconnect', invalidate);
    return () => {
      provider.removeListener?.('accountChanged', changed);
      provider.removeListener?.('disconnect', invalidate);
    };
  }, [provider, account.user?.walletAddress]);

  // Sign-in with Solana: the wallet signs a one-time message from the server (no transaction, no funds),
  // and the server checks the signature before starting a session.
  const connectWallet = async (name: WalletName) => {
    if (connectionInProgress.current) return;
    connectionInProgress.current = true;
    setConnecting(true);
    setWalletError(null);
    try {
      const wallet = getSolanaWallet(name);
      if (!wallet) throw new Error(`${name} was not detected. Use a browser with the wallet extension installed or the wallet’s in-app browser.`);
      await wallet.connect();
      if (!wallet.publicKey) throw new Error('The wallet did not return a public key.');
      const address = wallet.publicKey.toBase58();
      const { nonce, message } = await api<{ nonce: string; message: string }>('/api/wallet/nonce', { method: 'POST', body: { address } });
      const signed = await wallet.signMessage(new TextEncoder().encode(message), 'utf8');
      const signature = signed instanceof Uint8Array ? signed : signed.signature;
      if (wallet.publicKey?.toBase58() !== address) throw new Error('The selected wallet changed during sign-in. Please reconnect.');
      await api('/api/wallet/verify', { method: 'POST', body: { address, nonce, signature: toBase64(signature) } });
      await account.refreshProfile();
      setProvider(wallet);
    } catch (error) {
      setWalletError(authErrorMessage(error));
      throw error;
    } finally {
      connectionInProgress.current = false;
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await account.signOut();
    const wallet = provider;
    setProvider(null);
    setWalletError(null);
    if (wallet) await wallet.disconnect();
  };

  return <WalletContext.Provider value={{ ...account, authError: walletError || account.authError, connecting, connectWallet, disconnect }}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};
