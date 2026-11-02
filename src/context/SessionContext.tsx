import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { authErrorMessage } from '@/lib/auth-errors';

export interface AccountUser {
  id: string;
  email: string;
  walletAddress: string | null;
  username: string;
  bio: string;
  avatar: string;
}

interface AccountProfile {
  id: string;
  wallet_address: string | null;
  username: string;
  bio: string;
  avatar_url: string;
}

interface SessionContextType {
  session: Session | null;
  user: AccountUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  authError: string | null;
  recoveryMode: boolean;
  finishRecovery: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<AccountUser, 'username' | 'bio' | 'avatar'>>) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);
const mapProfile = (profile: AccountProfile, email: string): AccountUser => ({
  id: profile.id, email, walletAddress: profile.wallet_address,
  username: profile.username, bio: profile.bio, avatar: profile.avatar_url,
});

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const currentUserId = useRef<string>();
  currentUserId.current = session?.user.id;
  const profileRequest = useRef(0);

  const finishRecovery = useCallback(() => {
    sessionStorage.removeItem('lune_recovery_user');
    setRecoveryMode(false);
  }, []);

  useEffect(() => {
    let active = true;
    let changed = false;
    const acceptSession = (nextSession: Session | null) => {
      if (currentUserId.current !== nextSession?.user.id) profileRequest.current += 1;
      currentUserId.current = nextSession?.user.id;
      setSession(nextSession);
      setSessionLoading(false);
      if (!nextSession) {
        profileRequest.current += 1;
        setUser(null);
        setProfileLoading(false);
        setAuthError(null);
        finishRecovery();
      } else {
        setAuthError(null);
        setUser(previous => previous?.id === nextSession.user.id ? previous : null);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      changed = true;
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && nextSession) {
        sessionStorage.setItem('lune_recovery_user', nextSession.user.id);
        setRecoveryMode(true);
      } else if (event === 'INITIAL_SESSION' && nextSession) {
        setRecoveryMode(sessionStorage.getItem('lune_recovery_user') === nextSession.user.id);
      } else if (event === 'SIGNED_IN' && !['/reset-password', '/auth/callback'].includes(window.location.pathname)) {
        finishRecovery();
      }
      acceptSession(nextSession);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || changed) return;
      acceptSession(data.session);
      if (data.session) setRecoveryMode(sessionStorage.getItem('lune_recovery_user') === data.session.user.id);
      if (error) setAuthError(authErrorMessage(error));
    }).catch(error => {
      if (active) { setAuthError(authErrorMessage(error)); setSessionLoading(false); }
    });
    return () => { active = false; profileRequest.current += 1; subscription.unsubscribe(); };
  }, [finishRecovery]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const request = ++profileRequest.current;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase.rpc('ensure_user_profile');
      if (error) throw error;
      if (currentUserId.current !== session.user.id || request !== profileRequest.current) return;
      setUser(mapProfile(data as AccountProfile, session.user.email || ''));
      setAuthError(null);
    } catch (error) {
      if (currentUserId.current === session.user.id && request === profileRequest.current) setAuthError(authErrorMessage(error));
    } finally {
      if (currentUserId.current === session.user.id && request === profileRequest.current) setProfileLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) void refreshProfile();
  }, [session, refreshProfile]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { setAuthError(authErrorMessage(error)); throw error; }
    profileRequest.current += 1;
    setSession(null);
    setUser(null);
    setAuthError(null);
    finishRecovery();
  };

  const updateProfile = async (data: Partial<Pick<AccountUser, 'username' | 'bio' | 'avatar'>>) => {
    if (!user) throw new Error('Log in to edit your profile.');
    const changes = { username: (data.username ?? user.username).trim(), bio: data.bio ?? user.bio, avatar_url: data.avatar ?? user.avatar };
    if (!/^[A-Za-z0-9_]{3,64}$/.test(changes.username)) throw new Error('Use 3–64 letters, numbers, or underscores for your username.');
    if (changes.bio.length > 500) throw new Error('Your bio must be 500 characters or fewer.');
    if (changes.avatar_url.length > 3000000) throw new Error('Your avatar must be 2 MB or smaller.');
    const { data: profile, error } = await supabase.from('profiles').update(changes).eq('id', user.id).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('That username is already taken. Please choose another.');
      if (error.code === '42501' || error.code === 'PGRST116') throw new Error('Your session could not authorize this update. Log in again and retry.');
      throw new Error('Your profile could not be saved. Check your connection and try again.');
    }
    if (currentUserId.current === user.id) setUser(mapProfile(profile as AccountProfile, user.email));
  };

  const loading = sessionLoading || (profileLoading && !user) || (!!session && !user && !authError);
  return <SessionContext.Provider value={{ session, user, isAuthenticated: !!session, loading, authError, recoveryMode, finishRecovery, refreshProfile, signOut, updateProfile }}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionContextProvider');
  return context;
};
