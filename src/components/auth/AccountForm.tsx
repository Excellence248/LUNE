import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import WalletModal from '@/components/lune/WalletModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/context/SessionContext';
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
  const [confirmSent, setConfirmSent] = useState(false);
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
        if (!(await signUp(email, password))) setConfirmSent(true);
      } else {
        await signIn(email, password);
      }
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (confirmSent) return (
    <div className="space-y-4 text-center">
      <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-relaxed text-emerald-200">Check your inbox to confirm your email, then come back and sign in.</p>
      <Button asChild className="w-full"><Link to="/signin">Go to sign in</Link></Button>
    </div>
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
