import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/context/SessionContext';

/** Mirrors MIN_AGE in server/utils/age.ts, which is the rule that is actually enforced. */
export const MIN_AGE = 18;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Signed-in members must confirm their date of birth once before they can use Lune. The server stores
 * it privately, accepts it only once, and refuses every write from an account that is under age.
 */
const AgeGate = ({ children }: { children: ReactNode }) => {
  const { session, loading, ageStatus, confirmAge, signOut } = useSession();
  const [birthDate, setBirthDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  if (loading || !session || !ageStatus || ageStatus === 'ok') return <>{children}</>;

  if (ageStatus === 'underage') {
    return (
      <AuthShell title="Lune is for adults" description={`You must be ${MIN_AGE} or older to use Lune.`}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-white/60">Based on the date of birth entered, this account can’t be used. You’re welcome to come back when you’re {MIN_AGE}.</p>
          {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
          <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => void signOut().catch(() => setError('Log out failed. Please retry.'))}>Log out</Button>
        </div>
      </AuthShell>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await confirmAge(birthDate);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your date of birth could not be saved. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Confirm your age" description={`Lune is for people aged ${MIN_AGE} and over. Enter your date of birth to continue.`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="birth-date" className="text-slate-300">Date of birth</Label>
          <Input id="birth-date" type="date" required min="1900-01-02" max={today()} value={birthDate} disabled={busy} onChange={event => setBirthDate(event.target.value)} className="h-12 rounded-xl border-white/15 bg-white/[0.03] text-white" />
        </div>
        <p className="text-xs leading-relaxed text-white/45">Enter your real date of birth. It is stored privately, never shown on your profile, and can’t be changed afterwards.</p>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        <Button type="submit" disabled={busy || !birthDate} className="h-12 w-full rounded-xl bg-lune-500 font-semibold hover:bg-lune-600">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continue
        </Button>
        <button type="button" onClick={() => void signOut().catch(() => setError('Log out failed. Please retry.'))} className="w-full text-center text-sm text-white/45 hover:text-white">Log out</button>
      </form>
    </AuthShell>
  );
};

export default AgeGate;
