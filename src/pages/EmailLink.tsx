import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import CodeStep from '@/components/auth/CodeStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/context/SessionContext';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth-errors';
import { showSuccess } from '@/utils/toast';

/**
 * Password reset and email confirmation. Neon Auth emails a 6-digit code for both; the member types it
 * here (with a new password, for a reset).
 */
const EmailLink = ({ purpose }: { purpose: 'recovery' | 'confirmation' }) => {
  const navigate = useNavigate();
  const { refreshProfile } = useSession();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const recovery = purpose === 'recovery';

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setError('');
    try {
      const address = email.trim();
      if (recovery) await api('/api/auth/forget-password/email-otp', { method: 'POST', body: { email: address } });
      else await api('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: address, type: 'email-verification' } });
      setSentTo(address);
    } catch (cause) { setError(authErrorMessage(cause)); }
    finally { busy.current = false; setSending(false); }
  };

  const finish = async (code: string) => {
    if (recovery) {
      if (password.length < 8) throw new Error('Use at least 8 characters for your new password.');
      if (password !== confirmation) throw new Error('The passwords do not match.');
      await api('/api/auth/email-otp/reset-password', { method: 'POST', body: { email: sentTo, otp: code, password } });
      showSuccess('Password updated. Sign in with your new password.');
      navigate('/signin', { replace: true });
    } else {
      await api('/api/auth/email-otp/verify-email', { method: 'POST', body: { email: sentTo, otp: code } });
      await refreshProfile();
      showSuccess('Email confirmed.');
      navigate('/signin', { replace: true });
    }
  };

  const fieldClass = 'h-12 rounded-xl border-white/15 glass-soft';

  return (
    <AuthShell
      title={recovery ? 'Reset your password' : 'Confirm your email'}
      description={recovery ? 'Enter your account email and we’ll send you a 6-digit code.' : 'Enter the email you signed up with and we’ll send you a new 6-digit code.'}
    >
      {sentTo ? (
        <CodeStep email={sentTo} purpose={recovery ? 'forget-password' : 'email-verification'} submitLabel={recovery ? 'Set new password' : 'Confirm email'} onSubmit={finish}>
          {recovery && (
            <>
              <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} className={fieldClass} /></div>
              <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className={fieldClass} /></div>
            </>
          )}
        </CodeStep>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="account-email">Email</Label><Input id="account-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={sending} className={fieldClass} /></div>
          {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
          <Button type="submit" disabled={sending} className="h-11 w-full rounded-xl bg-lune-500 hover:bg-lune-600">{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}{sending ? 'Sending…' : 'Send code'}</Button>
        </form>
      )}
      <p className="text-center text-sm"><Link to="/signin" className="text-lune-300 hover:underline">Back to login</Link></p>
    </AuthShell>
  );
};

export default EmailLink;
