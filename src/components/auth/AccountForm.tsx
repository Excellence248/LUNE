import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import WalletModal from '@/components/lune/WalletModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CodeStep from '@/components/auth/CodeStep';
import { useSession } from '@/context/SessionContext';
import { ApiError, api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth-errors';
import { postAuthPath } from '@/lib/onboarding';

const fieldClass = 'h-12 rounded-xl border-white/15 bg-white/[0.03] text-white';

const AccountForm = ({ view }: { view: 'sign_in' | 'sign_up' }) => {
  const { session, user, loading, authError, refreshProfile, signIn, signUp, signOut } = useSession();
  const [walletOpen, setWalletOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Set once Neon Auth has emailed a confirmation code to this address.
  const [verifying, setVerifying] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState('');
  const pending = useRef(false);
  const signup = view === 'sign_up';

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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (signup) {
        if (!(await signUp(email, password))) setVerifying(email.trim());
      } else {
        await signIn(email, password);
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'EMAIL_NOT_VERIFIED') {
        // Signed up earlier but never confirmed: send a fresh code and ask for it.
        await api('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: email.trim(), type: 'email-verification' } }).catch(() => undefined);
        setVerifying(email.trim());
        return;
      }
      setError(authErrorMessage(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (verifying) return (
    <CodeStep
      email={verifying}
      purpose="email-verification"
      submitLabel="Confirm and sign in"
      onSubmit={async code => {
        await api('/api/auth/email-otp/verify-email', { method: 'POST', body: { email: verifying, otp: code } });
        await signIn(verifying, password);
      }}
    />
  );

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account-email" className="text-slate-300">Email</Label>
          <Input id="account-email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} disabled={busy} onChange={event => setEmail(event.target.value)} className={fieldClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-password" className="text-slate-300">Password</Label>
          <Input id="account-password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required placeholder={signup ? 'Create a secure password' : 'Enter your password'} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} className={fieldClass} />
        </div>
        {(error || authError) && <p role="alert" className="text-sm text-red-200">{error || authError}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-lune-500 font-semibold hover:bg-lune-600">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{signup ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      {!signup && <div className="text-right"><Link to="/forgot-password" className="text-sm text-lune-300 hover:underline">Forgot password?</Link></div>}
      {signup && <p className="text-xs leading-relaxed text-white/45">We’ll email you a 6-digit code to confirm your address. Then you can set up your profile and start posting.</p>}
      <div className="flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/40">or use a wallet</span><div className="h-px flex-1 bg-white/10" /></div>
      <Button type="button" variant="outline" className="h-12 w-full rounded-xl border-white/15 glass-soft hover:bg-white/5" onClick={() => setWalletOpen(true)}><Wallet className="mr-2 h-4 w-4" /> Continue with wallet</Button>
      <div className="space-y-3 border-t border-white/10 pt-5 text-center text-sm text-white/50">
        <p>{signup ? 'Already have an account?' : 'Don’t have an account?'}{' '}<Link to={signup ? '/signin' : '/signup'} className="font-semibold text-lune-300 hover:underline">{signup ? 'Sign in' : 'Sign up'}</Link></p>
        <p><Link to="/confirm-email" className="text-xs text-white/45 hover:text-white">Need a new confirmation code?</Link></p>
      </div>
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
    </div>
  );
};

export default AccountForm;
