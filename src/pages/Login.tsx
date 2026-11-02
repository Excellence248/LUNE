import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Loader2, Wallet } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import WalletModal from '@/components/lune/WalletModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/context/SessionContext';

const Login = ({ view = 'sign_in' }: { view?: 'sign_in' | 'sign_up' }) => {
  const { session, user, loading, authError, recoveryMode, refreshProfile, signOut } = useSession();
  const [walletOpen, setWalletOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const signup = view === 'sign_up';
  if (session && recoveryMode) return <Navigate to="/reset-password" replace />;
  if (user && !loading) return <Navigate to="/" replace />;

  return (
    <AuthShell title={signup ? 'Join the conversation' : 'Welcome back'} description={signup ? 'Create your account, personalize your profile, and start posting. No wallet required.' : 'Log in to your profile and pick up the conversation.'}>
      {loading ? <div role="status" className="flex items-center justify-center gap-2 py-8 text-white/60"><Loader2 size={18} className="animate-spin" /> Loading your account…</div> : session ? <div className="space-y-3"><p role="alert" className="text-sm text-red-200">{authError || 'Your profile could not be loaded.'}</p><Button onClick={() => void refreshProfile()} className="w-full">Retry profile</Button><Button variant="outline" className="w-full" onClick={() => void signOut().catch(() => setSignOutError('Log out failed. Please retry.'))}>Log out and try again</Button>{signOutError && <p role="alert" className="text-sm text-red-200">{signOutError}</p>}</div> : <>
        <Auth
          key={view}
          supabaseClient={supabase}
          view={view}
          providers={[]}
          showLinks={false}
          redirectTo={new URL('/auth/callback', window.location.origin).href}
          theme="dark"
          appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#a855f7', brandAccent: '#9333ea' } } }, style: { input: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '12px' }, label: { color: '#cbd5e1' }, button: { borderRadius: '12px' } } }}
          localization={{ variables: { sign_in: { button_label: 'Log in' }, sign_up: { button_label: 'Create account', confirmation_text: 'Check your inbox to confirm your email, then return here to log in.' } } }}
        />
        {authError && <p role="alert" className="text-sm text-red-200">{authError}</p>}
        <div className="space-y-3 text-center text-sm text-white/50">
          <p>{signup ? 'Already have an account?' : 'New to Lune?'}{' '}<Link to={signup ? '/signin' : '/signup'} className="font-semibold text-lune-300 hover:underline">{signup ? 'Log in' : 'Sign up'}</Link></p>
          {!signup && <p><Link to="/forgot-password" className="text-lune-300 hover:underline">Forgot your password?</Link></p>}
          <p><Link to="/confirm-email" className="text-xs text-white/50 hover:text-white">Resend confirmation email</Link></p>
        </div>
        <div className="border-t border-white/10 pt-4"><Button type="button" variant="outline" className="w-full rounded-xl border-white/10 bg-transparent" onClick={() => setWalletOpen(true)}><Wallet className="mr-2 h-4 w-4" /> Or sign in with a wallet</Button></div>
      </>}
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
    </AuthShell>
  );
};

export default Login;
