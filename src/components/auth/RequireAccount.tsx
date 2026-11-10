import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

const RequireAccount = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useSession();
  if (loading) return <div role="status" className="flex min-h-screen items-center justify-center gap-2 bg-background text-white/60"><Loader2 className="h-5 w-5 animate-spin" /> Loading account…</div>;
  if (!session) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

export default RequireAccount;
