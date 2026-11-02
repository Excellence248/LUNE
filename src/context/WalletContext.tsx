import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  username?: string;
  bio?: string;
  avatar?: string;
}

interface WalletContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  disconnect: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const mapUser = (user: SupabaseUser): User => ({
  id: user.id,
  email: user.email || '',
  username: user.user_metadata?.username,
  bio: user.user_metadata?.bio,
  avatar: user.user_metadata?.avatar,
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Discard the previous simulated balance, including values saved before this cleanup.
    localStorage.removeItem('lune_balance');
    let active = true;
    let authChanged = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (active) {
        setUser(session?.user ? mapUser(session.user) : null);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authChanged) return;
      setUser(!error && data.session?.user ? mapUser(data.session.user) : null);
      setLoading(false);
    }).catch(() => {
      if (active && !authChanged) setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('Profile updates are unavailable to guests.');
    const metadata = {
      username: data.username ?? user.username,
      bio: data.bio ?? user.bio,
      avatar: data.avatar ?? user.avatar,
    };
    const { error } = await supabase.auth.updateUser({ data: metadata });
    if (error) throw error;
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      username: metadata.username,
      bio: metadata.bio,
      avatar_url: metadata.avatar,
    });
    if (profileError) throw profileError;
    setUser(previous => previous ? { ...previous, ...data } : null);
  };

  const disconnect = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return (
    <WalletContext.Provider value={{ isAuthenticated: !!user, user, loading, disconnect, updateProfile }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};
