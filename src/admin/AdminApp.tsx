import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuditLog from './AuditLog';
import Content from './Content';
import Members from './Members';
import Overview from './Overview';
import { ApiError, api, type AdminMe } from './api';

type State =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'denied'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; me: AdminMe };

const Screen = ({ children }: { children: ReactNode }) => (
  <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">{children}</div>
  </main>
);

const Heading = ({ children }: { children: ReactNode }) => (
  <div className="mb-5 flex items-center gap-2">
    <ShieldCheck className="h-5 w-5 text-lune-300" />
    <h1 className="font-display text-lg font-semibold">{children}</h1>
  </div>
);

/**
 * Neon Auth email sign-in. "Create sign-in" only makes a Neon Auth account: it has no admin access
 * until the database owner links it to an admin profile in profile_accounts.
 */
const SignIn = ({ onSignedIn }: { onSignedIn: () => void }) => {
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const address = email.trim();
      await api(creating ? '/api/auth/sign-up/email' : '/api/auth/sign-in/email', {
        method: 'POST',
        body: creating ? { email: address, password, name: address.split('@')[0] } : { email: address, password },
      });
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Heading>{creating ? 'Create your admin sign-in' : 'Lune admin'}</Heading>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input id="admin-password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={creating ? 8 : undefined} required value={password} onChange={event => setPassword(event.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{creating ? 'Create sign-in' : 'Sign in'}</Button>
      </form>
      <button type="button" className="mt-4 text-sm text-lune-300 hover:underline" onClick={() => { setCreating(!creating); setError(''); }}>
        {creating ? 'I already have a sign-in' : 'First time? Create your sign-in'}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Only Lune admins can use this panel. A new sign-in has no access until it is linked to an admin profile.</p>
    </Screen>
  );
};

/** Admin panel: its own React tree at /admin, separate from the member app. Every action is checked by the server. */
const AdminApp = () => {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', me: await api<AdminMe>('/api/admin/me') });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setState({ status: 'signed-out' });
      else if (cause instanceof ApiError && cause.status === 403) setState({ status: 'denied', message: cause.message });
      else setState({ status: 'error', message: cause instanceof Error ? cause.message : 'The admin panel could not load.' });
    }
  }, []);

  useEffect(() => {
    document.title = 'Lune admin';
    void load();
  }, [load]);

  const signOut = async () => {
    await api('/api/auth/sign-out', { method: 'POST', body: {} }).catch(() => undefined);
    setState({ status: 'signed-out' });
  };

  let page: ReactNode;
  if (state.status === 'loading') {
    page = <main role="status" className="flex min-h-screen items-center justify-center gap-2 bg-background text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</main>;
  } else if (state.status === 'signed-out') {
    page = <SignIn onSignedIn={load} />;
  } else if (state.status === 'denied' || state.status === 'error') {
    page = (
      <Screen>
        <Heading>{state.status === 'denied' ? 'No admin access' : 'Something went wrong'}</Heading>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <div className="mt-5 flex gap-2">
          {state.status === 'error' && <Button onClick={load}>Try again</Button>}
          <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </div>
      </Screen>
    );
  } else {
    const can = (permission: string) => state.me.permissions.includes(permission);
    page = (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-lune-300" /><span className="font-display font-semibold">Lune admin</span></div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">@{state.me.username}</span>
              <Button size="sm" variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="flex h-auto w-full justify-start overflow-x-auto sm:inline-flex sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              {can('audit.read') && <TabsTrigger value="audit">Audit log</TabsTrigger>}
            </TabsList>
            <TabsContent value="overview"><Overview /></TabsContent>
            <TabsContent value="members"><Members can={can} /></TabsContent>
            <TabsContent value="content"><Content canRemove={can('content.remove_any')} /></TabsContent>
            {can('audit.read') && <TabsContent value="audit"><AuditLog /></TabsContent>}
          </Tabs>
        </main>
      </div>
    );
  }

  return <>{page}<Toaster /></>;
};

export default AdminApp;
