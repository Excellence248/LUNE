import { AuthApiError } from '@supabase/supabase-js';

export const authErrorMessage = (error: unknown): string => {
  if (error instanceof AuthApiError && error.code === 'web3_provider_disabled') {
    return 'Solana wallet sign-in is disabled in Supabase. Enable Authentication → Providers → Web3 Wallet → Solana.';
  }
  const message = error instanceof Error ? error.message : 'Wallet sign-in could not be completed. Please try again.';
  if (/URI.*(allowed|HTTPS)|Domain.*(allowed|match)/i.test(message)) {
    return 'This page’s address is not allowed for wallet sign-in. Use an HTTPS app URL (or localhost) and allow it under Supabase Authentication → URL Configuration → Redirect URLs.';
  }
  return message;
};
