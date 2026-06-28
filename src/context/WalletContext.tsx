"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  isConnected: boolean;
  isAuthenticated: boolean;
  user: User | null;
  address: string | null;
  balance: number;
  connect: () => void;
  disconnect: () => void;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateEmail: (newEmail: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  reauthenticate: () => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any }>;
  resendVerificationEmail: (email: string) => Promise<{ error: any }>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateBalance: (amount: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0.00);

  const mapSupabaseUser = (sbUser: SupabaseUser): User => ({
    id: sbUser.id,
    email: sbUser.email || '',
    username: sbUser.user_metadata?.username,
    bio: sbUser.user_metadata?.bio,
    avatar: sbUser.user_metadata?.avatar,
  });

  const ensureProfileExists = async (sbUser: SupabaseUser) => {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', sbUser.id)
        .single();

      const username = sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'User';

      if (!profile) {
        await supabase.from('profiles').insert([
          {
            id: sbUser.id,
            username: username,
            avatar_url: sbUser.user_metadata?.avatar || '',
            bio: sbUser.user_metadata?.bio || "New to Lune Protocol! 🚀",
          }
        ]);
      } else if (!profile.username && username) {
        // Update if username is missing for some reason
        await supabase.from('profiles').update({ username }).eq('id', sbUser.id);
      }
    } catch (err) {
      console.error("Error ensuring profile exists:", err);
    }
  };

  useEffect(() => {
    const savedBalance = localStorage.getItem('lune_balance');
    if (savedBalance) setBalance(parseFloat(savedBalance));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const currentUser = mapSupabaseUser(session.user);
        setUser(currentUser);
        setAddress(currentUser.email);
        setIsConnected(true);
        ensureProfileExists(session.user);
        
        if (!savedBalance) {
          const initialBalance = 48000.00;
          setBalance(initialBalance);
          localStorage.setItem('lune_balance', initialBalance.toString());
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const currentUser = mapSupabaseUser(session.user);
        setUser(currentUser);
        setAddress(currentUser.email);
        setIsConnected(true);
        ensureProfileExists(session.user);
      } else {
        setUser(null);
        setAddress(null);
        setIsConnected(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateBalance = (amount: number) => {
    const newBalance = balance + amount;
    setBalance(newBalance);
    localStorage.setItem('lune_balance', newBalance.toString());
  };

  const signIn = async (email: string, password?: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password || '',
    });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signin`,
        data: {
          username,
          bio: "New to Lune Protocol! 🚀",
        }
      }
    });
    return { error };
  };

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/signin`,
      }
    });
    return { error };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink'
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    return { error };
  };

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const reauthenticate = async () => {
    const { error } = await supabase.auth.reauthenticate();
    return { error };
  };

  const deleteAccount = async () => {
    await supabase.auth.signOut();
    return { error: null };
  };

  const resendVerificationEmail = async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/signin`,
      }
    });
    return { error };
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const { error } = await supabase.auth.updateUser({
      data: {
        username: data.username || user.username,
        bio: data.bio || user.bio,
        avatar: data.avatar || user.avatar,
      }
    });
    
    if (!error) {
      await supabase.from('profiles').upsert({
        id: user.id,
        username: data.username || user.username,
        bio: data.bio || user.bio,
        avatar_url: data.avatar || user.avatar,
      });
      setUser(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const connect = () => setIsConnected(true);
  const disconnect = async () => {
    await supabase.auth.signOut();
    setIsConnected(false);
  };

  return (
    <WalletContext.Provider value={{ 
      isConnected, isAuthenticated: !!user, user, address, balance, 
      connect, disconnect, loading, signIn, signUp, signInWithOtp, verifyOtp,
      resetPassword, updateEmail, updatePassword, reauthenticate, deleteAccount,
      resendVerificationEmail, updateProfile, updateBalance 
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};