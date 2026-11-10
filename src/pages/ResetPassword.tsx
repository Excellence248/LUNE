import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth-errors';
import { showSuccess } from '@/utils/toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  // Neon Auth redirects here from the emailed link with ?token=…, or ?error=INVALID_TOKEN.
  const params = useRef(new URL(window.location.href).searchParams);
  const token = params.current.get('token');
  const ready = !!token && !params.current.get('error');
  const busy = useRef(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(ready ? '' : 'This reset link is expired or invalid. Request a new link.');

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    setError('');
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    busy.current = true;
    setSaving(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: { newPassword: password, token } });
      showSuccess('Password updated. Sign in with your new password.');
      navigate('/signin', { replace: true });
    } catch (cause) { setError(authErrorMessage(cause)); }
    finally { busy.current = false; setSaving(false); }
  };

  return (
    <AuthShell title="Choose a new password" description="Use at least 8 characters to secure your account.">
      {ready ? <form onSubmit={updatePassword} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} disabled={saving} onChange={event => setPassword(event.target.value)} className="h-12 rounded-xl border-white/15 glass-soft" /></div>
        <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} disabled={saving} onChange={event => setConfirmation(event.target.value)} className="h-12 rounded-xl border-white/15 glass-soft" /></div>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        <Button type="submit" disabled={saving} className="h-11 w-full rounded-xl bg-lune-500 hover:bg-lune-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Updating…' : 'Update password'}</Button>
      </form> : <div className="space-y-4"><p role="alert" className="text-sm text-red-200">{error}</p><Button asChild className="w-full"><Link to="/forgot-password">Request a new reset link</Link></Button><p className="text-center text-sm"><Link to="/signin" className="text-lune-300">Back to login</Link></p></div>}
    </AuthShell>
  );
};

export default ResetPassword;
