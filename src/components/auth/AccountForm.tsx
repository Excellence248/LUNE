import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Loader2, Wallet } from 'lucide-react';
import WalletModal from '@/components/lune/WalletModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/context/SessionContext';
import { postAuthPath } from '@/lib/onboarding';

const AccountForm = ({ view }: { view: 'sign_in' | 'sign_up' }) => {
  const { session, user, loading, authError, recoveryMode, refreshProfile, signOut } = useSession();
  const [walletOpen, setWalletOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const signup = view === 'sign_up';

  if (session && recoveryMode) return <Navigate to="/reset-password" replace />;
  if (user && !loading) return <Navigate to={postAuthPath(user)} replace />;
  if (loading) return <div role="status" className="flex items-center justify-center gap-2 py-8 text-white/60"><Loader2 size={18} className="animate-spin" /> Loading your account…</div>;
  if (session) return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-red-200">{authError || 'Your profile could not be loaded.'}</p>
      <Button onClick={() => void refreshProfile()} className="w-full">Retry profile</Button>
      <Button variant="outline" className="w-full" onClick={() => void signOut().catch(() => setSignOutError('Log out failed. Please retry.'))}>Log out and try again</Button>
      {signOutError && <p role="alert" className="text-sm text-red-200">{signOutError}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <Auth
        key={view}
        supabaseClient={supabase}
        view={view}
        providers={[]}
        showLinks={false}
        redirectTo={new URL('/auth/callback', window.location.origin).href}
        theme="dark"
        appearance={{
          theme: ThemeSupa,
          variables: { default: { colors: { brand: '#a855f7', brandAccent: '#9333ea' } } },
          style: {
            input: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '12px', minHeight: '48px' },
            label: { color: '#cbd5e1' },
            button: { borderRadius: '12px', minHeight: '48px', fontWeight: 600 },
          },
        }}
        localization={{ variables: {
          sign_in: { button_label: 'Sign in', email_input_placeholder: 'you@example.com', password_input_placeholder: 'Enter your password' },
          sign_up: { button_label: 'Create account', email_input_placeholder: 'you@example.com', password_input_placeholder: 'Create a secure password', confirmation_text: 'Check your inbox to confirm your email, then return to sign in.' },
        } }}
      />
      {authError && <p role="alert" className="text-sm text-red-200">{authError}</p>}
      {!signup && <div className="text-right"><Link to="/forgot-password" className="text-sm text-lune-300 hover:underline">Forgot password?</Link></div>}
      {signup && <p className="text-xs leading-relaxed text-white/45">We’ll send a confirmation link to your email. Once confirmed, you can set up your profile and start posting.</p>}
      <div className="flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/40">or use a wallet</span><div className="h-px flex-1 bg-white/10" /></div>
      <Button type="button" variant="outline" className="h-12 w-full rounded-xl border-white/15 glass-soft hover:bg-white/5" onClick={() => setWalletOpen(true)}><Wallet className="mr-2 h-4 w-4" /> Continue with wallet</Button>
      <div className="space-y-3 border-t border-white/10 pt-5 text-center text-sm text-white/50">
        <p>{signup ? 'Already have an account?' : 'Don’t have an account?'}{' '}<Link to={signup ? '/signin' : '/signup'} className="font-semibold text-lune-300 hover:underline">{signup ? 'Sign in' : 'Sign up'}</Link></p>
        <p><Link to="/confirm-email" className="text-xs text-white/45 hover:text-white">Need a new confirmation email?</Link></p>
      </div>
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
    </div>
  );
};

export default AccountForm;
