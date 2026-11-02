import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getSolanaWallet, SolanaWallet, WalletName } from '@/lib/solana-wallet';
import { authErrorMessage } from '@/lib/auth-errors';

interface User {
  id: string;
  email: string;
  walletAddress: string;
  username: string;
  bio: string;
  avatar: string;
}

interface WalletContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  connecting: boolean;
  authError: string | null;
  connectWallet: (name: WalletName) => Promise<void>;
  disconnect: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'username' | 'bio' | 'avatar'>>) => Promise<void>;
}

interface WalletProfile {
  id: string;
  wallet_address: string;
  username: string;
  bio: string;
  avatar_url: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const mapProfile = (profile: WalletProfile, email: string): User => ({
  id: profile.id, email, walletAddress: profile.wallet_address,
  username: profile.username, bio: profile.bio, avatar: profile.avatar_url,
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [provider, setProvider] = useState<SolanaWallet | null>(null);
  const connectionInProgress = useRef(false);

  useEffect(() => {
    localStorage.removeItem('lune_balance');
    let active = true;
    let changed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      changed = true;
      if (active) {
        setSession(nextSession);
        if (!nextSession) {
          setUser(null);
          setAuthError(null);
          setLoading(false);
        }
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || changed) return;
      if (error) setAuthError(authErrorMessage(error));
      setSession(data.session);
      if (!data.session) setLoading(false);
    }).catch(error => {
      if (active) {
        setAuthError(authErrorMessage(error));
        setLoading(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session) return;
    setUser(previous => previous?.id === session.user.id ? previous : null);
    setLoading(true);
    // Keep database calls outside onAuthStateChange to avoid the auth client's lock.
    supabase.rpc('ensure_wallet_profile').then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setUser(null);
        setAuthError(authErrorMessage(error));
      } else {
        setUser(mapProfile(data as WalletProfile, session.user.email || ''));
        setAuthError(null);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!provider || !user) return;
    const signedAddress = user.walletAddress;
    const invalidate = () => {
      setUser(null);
      setProvider(null);
      supabase.auth.signOut().then(({ error }) => { if (error) setAuthError(authErrorMessage(error)); });
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
  }, [provider, user?.walletAddress]);

  const connectWallet = async (name: WalletName) => {
    if (connectionInProgress.current) return;
    connectionInProgress.current = true;
    setConnecting(true);
    setAuthError(null);
    try {
      const wallet = getSolanaWallet(name);
      if (!wallet) throw new Error(`${name} was not detected. Open the app in a browser with the wallet extension installed or in the wallet’s in-app browser.`);
      await wallet.connect();
      if (!wallet.publicKey) throw new Error('The wallet did not return a public key.');
      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        wallet: {
          publicKey: wallet.publicKey,
          signMessage: async (message: Uint8Array) => {
            const signed = await wallet.signMessage(message, 'utf8');
            return signed instanceof Uint8Array ? signed : signed.signature;
          },
        },
        statement: 'Sign in to the Lune public feed. This proves wallet ownership only; it does not authorize a transaction or transfer funds.',
      });
      if (error) throw error;
      if (!data.session) throw new Error('Wallet authentication did not return a session.');
      const { data: profile, error: profileError } = await supabase.rpc('ensure_wallet_profile');
      if (profileError) throw profileError;
      if ((profile as WalletProfile).wallet_address !== wallet.publicKey?.toBase58()) {
        await supabase.auth.signOut();
        throw new Error('The selected wallet changed during sign-in. Please reconnect.');
      }
      setProvider(wallet);
      setUser(mapProfile(profile as WalletProfile, data.session.user.email || ''));
    } catch (error) {
      setAuthError(authErrorMessage(error));
      throw error;
    } finally {
      connectionInProgress.current = false;
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(authErrorMessage(error));
      throw error;
    }
    setUser(null);
    setAuthError(null);
    if (provider) await provider.disconnect();
    setProvider(null);
  };

  const updateProfile = async (data: Partial<Pick<User, 'username' | 'bio' | 'avatar'>>) => {
    if (!user) throw new Error('Connect and sign in with a wallet to edit your profile.');
    const changes = {
      username: (data.username ?? user.username).trim(),
      bio: data.bio ?? user.bio,
      avatar_url: data.avatar ?? user.avatar,
    };
    if (!/^[A-Za-z0-9_]{3,64}$/.test(changes.username)) throw new Error('Use 3–64 letters, numbers, or underscores for your display handle.');
    if (changes.bio.length > 500) throw new Error('Your bio must be 500 characters or fewer.');
    if (changes.avatar_url.length > 3000000) throw new Error('Your avatar must be 2 MB or smaller.');
    const { data: profile, error } = await supabase.from('profiles').update(changes).eq('id', user.id).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('That username is already taken. Please choose another.');
      if (error.code === '42501' || error.code === 'PGRST116') throw new Error('Your wallet session could not authorize this update. Reconnect your wallet and try again.');
      throw new Error('Your profile could not be saved. Check your connection and try again.');
    }
    setUser(previous => previous?.id === user.id ? mapProfile(profile as WalletProfile, previous.email) : previous);
  };

  return (
    <WalletContext.Provider value={{ isAuthenticated: !!user, user, loading, connecting, authError, connectWallet, disconnect, updateProfile }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};
