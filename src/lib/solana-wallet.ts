export type WalletName = 'Phantom' | 'Solflare';

export interface SolanaPublicKey {
  toBase58: () => string;
}

export interface SolanaWallet {
  publicKey: SolanaPublicKey | null;
  connect: () => Promise<{ publicKey: SolanaPublicKey } | void>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<Uint8Array | { signature: Uint8Array }>;
  on?: (event: 'accountChanged' | 'disconnect', listener: (key?: SolanaPublicKey | null) => void) => void;
  removeListener?: (event: 'accountChanged' | 'disconnect', listener: (key?: SolanaPublicKey | null) => void) => void;
}

type WalletWindow = Window & {
  phantom?: { solana?: SolanaWallet };
  solflare?: SolanaWallet;
};

export const getSolanaWallet = (name: WalletName): SolanaWallet | undefined => {
  const browser = window as WalletWindow;
  return name === 'Phantom' ? browser.phantom?.solana : browser.solflare;
};

export const shortWalletAddress = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;
