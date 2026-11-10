import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth-errors';

export interface AccountUser {
  id: string;
  email: string;
  walletAddress: string | null;
  username: string;
  bio: string;
  avatar: string;
}

/** How the member signed in: Neon Auth email/password, or a verified Solana wallet. */
export interface Account {
  kind: 'email' | 'wallet';
  email: string | null;
  emailVerified: boolean;
}

interface AccountProfile {
  id: string;
  wallet_address: string | null;
  username: string;
  bio: string;
  avatar_url: string;
}

interface SessionContextType {
  session: Account | null;
  user: AccountUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  authError: string | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves true when signed in straight away, false when the email must be confirmed first. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<AccountUser, 'username' | 'bio' | 'avatar'>>) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);
const mapProfile = (profile: AccountProfile, email: string): AccountUser => ({
  id: profile.id, email, walletAddress: profile.wallet_address,
  username: profile.username, bio: profile.bio, avatar: profile.avatar_url,
});

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Account | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const request = useRef(0);

  // The server resolves the session from its cookies and creates the profile on first sign-in.
  const refreshProfile = useCallback(async () => {
    const id = ++request.current;
    try {
      const data = await api<{ account: Account | null; profile: AccountProfile | null }>('/api/me');
      if (id !== request.current) return;
      setSession(data.account);
      setUser(data.account && data.profile ? mapProfile(data.profile, data.account.email ?? '') : null);
      setAuthError(null);
    } catch (error) {
      if (id === request.current) setAuthError(authErrorMessage(error));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
    // Another tab may have signed in or out.
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshProfile(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { request.current += 1; document.removeEventListener('visibilitychange', onVisible); };
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email.trim(), password } });
    await refreshProfile();
  };

  const signUp = async (email: string, password: string) => {
    const address = email.trim();
    const result = await api<{ token?: string | null }>('/api/auth/sign-up/email', {
      method: 'POST',
      body: { email: address, password, name: address.split('@')[0], callbackURL: new URL('/auth/callback', window.location.origin).href },
    });
    if (!result?.token) return false;
    await refreshProfile();
    return true;
  };

  const signOut = async () => {
    try {
      await Promise.all([
        api('/api/auth/sign-out', { method: 'POST', body: {} }),
        api('/api/session/sign-out', { method: 'POST', body: {} }),
      ]);
    } catch (error) {
      setAuthError(authErrorMessage(error));
      throw error;
    }
    request.current += 1;
    setSession(null);
    setUser(null);
    setAuthError(null);
  };

  const updateProfile = async (data: Partial<Pick<AccountUser, 'username' | 'bio' | 'avatar'>>) => {
    if (!user) throw new Error('Log in to edit your profile.');
    const changes = { username: (data.username ?? user.username).trim(), bio: data.bio ?? user.bio, avatar_url: data.avatar ?? user.avatar };
    if (!/^[A-Za-z0-9_]{3,64}$/.test(changes.username)) throw new Error('Use 3–64 letters, numbers, or underscores for your username.');
    if (changes.bio.length > 500) throw new Error('Your bio must be 500 characters or fewer.');
    if (changes.avatar_url.length > 3000000) throw new Error('Your avatar must be 2 MB or smaller.');
    const profile = await api<AccountProfile>('/api/me', { method: 'PATCH', body: changes });
    setUser(current => (current?.id === profile.id ? mapProfile(profile, current.email) : current));
  };

  return (
    <SessionContext.Provider value={{ session, user, isAuthenticated: !!session, loading, authError, refreshProfile, signIn, signUp, signOut, updateProfile }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionContextProvider');
  return context;
};
