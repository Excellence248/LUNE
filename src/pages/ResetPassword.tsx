import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { resolveAuthSession } from '@/lib/auth-callback';
import { authErrorMessage } from '@/lib/auth-errors';
import { useSession } from '@/context/SessionContext';
import { showSuccess } from '@/utils/toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { finishRecovery } = useSession();
  const url = useRef(new URL(window.location.href));
  const request = useRef<Promise<Session | null> | null>(null);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    request.current ??= resolveAuthSession(url.current);
    request.current.then(session => {
      if (!active) return;
      setReady(!!session);
      if (!session) setError('This reset link is expired or invalid. Request a new link.');
    }).catch(cause => { if (active) setError(authErrorMessage(cause)); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    setError('');
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    busy.current = true;
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      finishRecovery();
      showSuccess('Password updated. You are logged in.');
      navigate('/', { replace: true });
    } catch (cause) { setError(authErrorMessage(cause)); }
    finally { busy.current = false; setSaving(false); }
  };

  return (
    <AuthShell title="Choose a new password" description="Use at least 8 characters to secure your account.">
      {checking ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-white/60"><Loader2 className="h-5 w-5 animate-spin" /> Checking reset link…</p> : ready ? <form onSubmit={updatePassword} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} disabled={saving} onChange={event => setPassword(event.target.value)} className="h-12 rounded-xl border-white/15 bg-white/[0.03]" /></div>
        <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} disabled={saving} onChange={event => setConfirmation(event.target.value)} className="h-12 rounded-xl border-white/15 bg-white/[0.03]" /></div>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        <Button type="submit" disabled={saving} className="h-11 w-full rounded-xl bg-lune-500 hover:bg-lune-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Updating…' : 'Update password'}</Button>
      </form> : <div className="space-y-4"><p role="alert" className="text-sm text-red-200">{error}</p><Button asChild className="w-full"><Link to="/forgot-password">Request a new reset link</Link></Button><p className="text-center text-sm"><Link to="/signin" className="text-lune-300">Back to login</Link></p></div>}
    </AuthShell>
  );
};

export default ResetPassword;
