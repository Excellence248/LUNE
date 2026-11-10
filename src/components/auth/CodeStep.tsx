import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth-errors';

interface CodeStepProps {
  email: string;
  /** What the code is for; decides which Neon Auth email is resent. */
  purpose: 'email-verification' | 'forget-password';
  /** Called with the 6-digit code; throw to show an error under the field. */
  onSubmit: (code: string) => Promise<void>;
  children?: ReactNode;
  submitLabel?: string;
}

/** Neon Auth emails a 6-digit code instead of a link. This is where the member types it. */
const CodeStep = ({ email, purpose, onSubmit, children, submitLabel = 'Confirm' }: CodeStepProps) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const pending = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await onSubmit(code.trim());
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    setResent(false);
    try {
      if (purpose === 'forget-password') await api('/api/auth/forget-password/email-otp', { method: 'POST', body: { email } });
      else await api('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email, type: purpose } });
      setResent(true);
    } catch (cause) {
      setError(authErrorMessage(cause));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm leading-relaxed text-white/60">We emailed a 6-digit code to <span className="font-medium text-white">{email}</span>. Check your inbox and spam folder.</p>
      <div className="space-y-2">
        <Label htmlFor="email-code" className="text-slate-300">Code</Label>
        <Input
          id="email-code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} placeholder="123456"
          value={code} disabled={busy} onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
          className="h-12 rounded-xl border-white/15 bg-white/[0.03] text-center font-mono text-xl tracking-[0.5em] text-white"
        />
      </div>
      {children}
      {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
      {resent && <p role="status" className="text-sm text-emerald-200">A new code is on its way.</p>}
      <Button type="submit" disabled={busy || code.length !== 6} className="h-12 w-full rounded-xl bg-lune-500 font-semibold hover:bg-lune-600">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitLabel}
      </Button>
      <button type="button" onClick={() => void resend()} className="w-full text-center text-sm text-lune-300 hover:underline">Send a new code</button>
    </form>
  );
};

export default CodeStep;
