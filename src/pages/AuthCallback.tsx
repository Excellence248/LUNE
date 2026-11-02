import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { resolveAuthSession } from '@/lib/auth-callback';
import { authErrorMessage } from '@/lib/auth-errors';

const AuthCallback = () => {
  const { user, loading, authError, recoveryMode, refreshProfile } = useSession();
  const url = useRef(new URL(window.location.href));
  const request = useRef<Promise<Session | null> | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const recovery = recoveryMode || url.current.searchParams.get('type') === 'recovery' || new URLSearchParams(url.current.hash.slice(1)).get('type') === 'recovery';

  useEffect(() => {
    let active = true;
    request.current ??= resolveAuthSession(url.current);
    request.current.then(session => {
      if (!active) return;
      if (!session) setError('This link is expired or has already been used. Log in or request a new email.');
      else setComplete(true);
    }).catch(cause => { if (active) setError(authErrorMessage(cause)); });
    return () => { active = false; };
  }, []);

  if (complete && recovery) return <Navigate to="/reset-password" replace />;
  if (complete && user && !loading) return <Navigate to="/" replace />;
  return (
    <AuthShell title="Finishing sign-in" description="Confirming your email and preparing your profile.">
      {error ? <div className="space-y-4"><p role="alert" className="text-sm text-red-200">{error}</p><Button asChild className="w-full"><Link to="/signin">Go to login</Link></Button><Button asChild variant="outline" className="w-full"><Link to="/confirm-email">Request a new confirmation email</Link></Button></div> : complete && authError && !loading ? <div className="space-y-3"><p role="alert" className="text-sm text-red-200">{authError}</p><Button onClick={() => void refreshProfile()} className="w-full">Retry loading profile</Button></div> : <p role="status" className="flex items-center justify-center gap-2 py-6 text-white/60"><Loader2 className="h-5 w-5 animate-spin" /> Preparing your account…</p>}
    </AuthShell>
  );
};

export default AuthCallback;
