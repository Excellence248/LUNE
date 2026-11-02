import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export const resolveAuthSession = async (url: URL): Promise<Session | null> => {
  const hash = new URLSearchParams(url.hash.slice(1));
  const message = url.searchParams.get('error_description') || hash.get('error_description');
  if (message) throw new Error(message);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && type && ['signup', 'email', 'recovery', 'email_change'].includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    if (error) throw error;
    return data.session;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;
  const code = url.searchParams.get('code');
  if (code) {
    const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return exchanged.session;
  }
  return null;
};
