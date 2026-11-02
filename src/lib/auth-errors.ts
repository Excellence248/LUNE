import { AuthApiError } from '@supabase/supabase-js';

export const authErrorMessage = (error: unknown): string => {
  if (error instanceof AuthApiError) {
    if (error.code === 'web3_provider_disabled') return 'Solana wallet sign-in is disabled in Supabase. Enable Authentication → Providers → Web3 Wallet → Solana.';
    if (error.code === 'invalid_credentials') return 'The email or password is incorrect. Please try again.';
    if (error.code === 'email_not_confirmed') return 'Confirm your email before logging in. You can request a new confirmation email below.';
    if (error.code === 'signup_disabled' || error.code === 'email_provider_disabled') return 'Email signup is disabled in Supabase. Enable the Email provider under Authentication → Providers.';
    if (error.code === 'over_email_send_rate_limit') return 'Too many emails have been requested. Wait a few minutes, then try again.';
    if (error.code === 'weak_password') return 'Choose a stronger password with at least 8 characters.';
  }
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'The account request could not be completed. Please try again.';
  if (/URI.*(allowed|HTTPS)|Domain.*(allowed|match)/i.test(message)) return 'This app address is not allowed for wallet sign-in. Allow its HTTPS URL (or localhost) under Supabase Authentication → URL Configuration.';
  if (/failed to fetch|network/i.test(message)) return 'The account service could not be reached. Check your connection and try again.';
  return message;
};
