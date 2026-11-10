import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth-errors';

const EmailLink = ({ purpose }: { purpose: 'recovery' | 'confirmation' }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const recovery = purpose === 'recovery';

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setSent(false);
    setError('');
    try {
      if (recovery) await api('/api/auth/request-password-reset', { method: 'POST', body: { email: email.trim(), redirectTo: new URL('/reset-password', window.location.origin).href } });
      else await api('/api/auth/send-verification-email', { method: 'POST', body: { email: email.trim(), callbackURL: new URL('/auth/callback', window.location.origin).href } });
      setSent(true);
    } catch (cause) { setError(authErrorMessage(cause)); }
    finally { busy.current = false; setSending(false); }
  };

  return (
    <AuthShell title={recovery ? 'Reset your password' : 'Confirm your email'} description={recovery ? 'Enter your account email and we’ll send a password reset link.' : 'Enter the email you signed up with to request a new confirmation link.'}>
      <form onSubmit={send} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="account-email">Email</Label><Input id="account-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={sending} className="h-12 rounded-xl border-white/15 glass-soft" /></div>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        {sent && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">If this address is eligible, an email is on its way. Check your inbox and spam folder.</p>}
        <Button type="submit" disabled={sending} className="h-11 w-full rounded-xl bg-lune-500 hover:bg-lune-600">{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}{sending ? 'Sending…' : recovery ? 'Send reset link' : 'Send confirmation link'}</Button>
      </form>
      <p className="text-center text-sm"><Link to="/signin" className="text-lune-300 hover:underline">Back to login</Link></p>
    </AuthShell>
  );
};

export default EmailLink;
