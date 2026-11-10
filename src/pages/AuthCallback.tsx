import { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { postAuthPath } from '@/lib/onboarding';

/**
 * Where the email confirmation link lands. Neon Auth has already verified the address and redirected
 * here, with ?error= if the link was bad.
 */
const AuthCallback = () => {
  const { user, loading, refreshProfile } = useSession();
  const error = useRef(new URL(window.location.href).searchParams.get('error'));

  useEffect(() => { void refreshProfile(); }, [refreshProfile]);

  if (!error.current && user && !loading) return <Navigate to={postAuthPath(user)} replace />;
  return (
    <AuthShell title={error.current ? 'Link not valid' : 'Email confirmed'} description={error.current ? 'This link is expired or has already been used.' : 'Your email is confirmed. Sign in to set up your profile.'}>
      {loading ? (
        <p role="status" className="flex items-center justify-center gap-2 py-6 text-white/60"><Loader2 className="h-5 w-5 animate-spin" /> Checking your account…</p>
      ) : (
        <div className="space-y-4">
          <Button asChild className="w-full"><Link to="/signin">Go to sign in</Link></Button>
          {error.current && <Button asChild variant="outline" className="w-full"><Link to="/confirm-email">Request a new confirmation email</Link></Button>}
        </div>
      )}
    </AuthShell>
  );
};

export default AuthCallback;
