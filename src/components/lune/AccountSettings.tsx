import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Download, KeyRound, Loader2, LogOut, MailCheck, ShieldOff, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DeleteAccount from '@/components/lune/DeleteAccount';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth-errors';
import { displayNameOf } from '@/lib/names';
import { showError, showSuccess } from '@/utils/toast';

/** A titled card, so each group of settings reads on its own. */
export const SettingsCard = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <section className="lune-card mb-6 p-5 sm:p-7">
    <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
    {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const ChangePassword = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [others, setOthers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    if (next.length < 8) { setError('Use at least 8 characters for the new password.'); return; }
    if (next !== again) { setError('The new passwords don’t match.'); return; }
    if (next === current) { setError('Choose a password different from your current one.'); return; }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next, revokeOtherSessions: others } });
      showSuccess('Your password was changed.');
      setOpen(false); setCurrent(''); setNext(''); setAgain('');
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally { busy.current = false; setSaving(false); }
  };

  if (!open) return <Button variant="outline" onClick={() => setOpen(true)} className="rounded-full border-white/15 bg-transparent"><KeyRound size={15} className="mr-2" />Change password</Button>;
  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <div className="space-y-1.5"><Label htmlFor="cur-pass">Current password</Label><Input id="cur-pass" type="password" autoComplete="current-password" required value={current} disabled={saving} onChange={event => setCurrent(event.target.value)} className="h-11 rounded-xl border-white/15 glass-soft text-[16px]" /></div>
      <div className="space-y-1.5"><Label htmlFor="new-pass">New password</Label><Input id="new-pass" type="password" autoComplete="new-password" minLength={8} required value={next} disabled={saving} onChange={event => setNext(event.target.value)} className="h-11 rounded-xl border-white/15 glass-soft text-[16px]" /></div>
      <div className="space-y-1.5"><Label htmlFor="again-pass">Confirm new password</Label><Input id="again-pass" type="password" autoComplete="new-password" minLength={8} required value={again} disabled={saving} onChange={event => setAgain(event.target.value)} className="h-11 rounded-xl border-white/15 glass-soft text-[16px]" /></div>
      <label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" checked={others} onChange={event => setOthers(event.target.checked)} className="h-4 w-4 accent-purple-500" />Sign me out on my other devices</label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="rounded-full bg-lune-500 hover:bg-lune-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Saving…' : 'Update password'}</Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={() => { setOpen(false); setError(''); }}>Cancel</Button>
      </div>
      <p className="text-xs text-white/35">Forgot it? <Link to="/forgot-password" className="text-lune-300 hover:underline">Reset it by email</Link>.</p>
    </form>
  );
};

/** How you sign in, your password, and signing out everywhere else. */
export const AccountSection = () => {
  const { session, user } = useWallet();
  const [others, setOthers] = useState(false);
  if (!user || !session) return null;
  const emailAccount = session.kind === 'email';

  const signOutOthers = async () => {
    setOthers(true);
    try {
      await api('/api/auth/revoke-other-sessions', { method: 'POST', body: {} });
      showSuccess('You’re signed out on every other device.');
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : 'That could not be done. Please try again.');
    } finally { setOthers(false); }
  };

  return (
    <SettingsCard title="Account" description="How you sign in to Lune.">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lune-500/15 text-lune-300">{emailAccount ? <MailCheck size={18} /> : <Wallet size={18} />}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{emailAccount ? session.email : 'Signed in with your Solana wallet'}</p>
            <p className="text-xs text-white/45">{emailAccount ? (session.emailVerified ? 'Email confirmed' : 'Email not confirmed yet') : user.walletAddress ? `${user.walletAddress.slice(0, 4)}…${user.walletAddress.slice(-4)}` : 'Wallet account'} · @{user.username}</p>
          </div>
        </div>
        {emailAccount ? <ChangePassword /> : <p className="text-sm text-white/45">Wallet accounts have no password. Keep your wallet’s recovery phrase safe.</p>}
        <div>
          <Button variant="outline" disabled={others} onClick={() => void signOutOthers()} className="rounded-full border-white/15 bg-transparent">{others ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut size={15} className="mr-2" />}Sign out on other devices</Button>
          <p className="mt-1.5 text-xs text-white/35">Useful if you lost a phone or used a shared computer. You stay signed in here.</p>
        </div>
      </div>
    </SettingsCard>
  );
};

interface BlockedPerson { id: string; username: string; display_name: string; avatar_url: string }

/** The people you blocked, with a way to unblock them. */
export const BlockedSection = () => {
  const { user } = useWallet();
  const { unblockUser } = useSocial();
  const [people, setPeople] = useState<BlockedPerson[] | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api<BlockedPerson[]>('/api/me/blocks?details=1').then(list => { if (active) setPeople(list); }).catch(() => { if (active) setError('Your blocked list could not be loaded.'); });
    return () => { active = false; };
  }, [user?.id]);

  if (!user) return null;
  const unblock = async (person: BlockedPerson) => {
    setWorking(person.id);
    try {
      await unblockUser(person.id);
      setPeople(previous => (previous ?? []).filter(row => row.id !== person.id));
      showSuccess(`@${person.username} is unblocked.`);
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : 'Could not unblock. Please try again.');
    } finally { setWorking(null); }
  };

  return (
    <SettingsCard title="Blocked accounts" description="Blocked people can’t follow, message, call, reply to, like or repost you, and you won’t see their posts.">
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {!error && people === null && <p role="status" className="flex items-center gap-2 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>}
      {people && people.length === 0 && <p className="flex items-center gap-2 text-sm text-white/45"><ShieldOff size={16} />You haven’t blocked anyone.</p>}
      {people && people.length > 0 && (
        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08]">
          {people.map(person => (
            <li key={person.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="h-9 w-9 ring-1 ring-white/10"><AvatarImage src={person.avatar_url} /><AvatarFallback className="bg-lune-900 text-xs text-lune-200">{displayNameOf(person)[0]?.toUpperCase()}</AvatarFallback></Avatar>
              <Link to={`/profile/${encodeURIComponent(person.username)}`} className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{displayNameOf(person)}</span><span className="block truncate text-xs text-white/40">@{person.username}</span></Link>
              <Button size="sm" variant="outline" disabled={working === person.id} onClick={() => void unblock(person)} className="rounded-full border-white/15 bg-transparent">{working === person.id ? '…' : 'Unblock'}</Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
};

/** Download a copy of your data, and the permanent account deletion. */
export const DataSection = () => {
  const { user } = useWallet();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/me/export', { credentials: 'same-origin' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Your data could not be prepared. Please try again.');
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `lune-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : 'Your data could not be downloaded.');
    } finally { setBusy(false); }
  };

  return (
    <SettingsCard title="Your data" description="Take a copy of what you’ve shared, or leave Lune for good.">
      <div className="space-y-5">
        <div>
          <Button variant="outline" disabled={busy} onClick={() => void download()} className="rounded-full border-white/15 bg-transparent">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download size={15} className="mr-2" />}Download my data</Button>
          <p className="mt-1.5 text-xs text-white/35">A file with your profile, posts, replies, who you follow, who follows you, who you blocked, and your message text.</p>
        </div>
        <div className="border-t border-white/10 pt-5"><DeleteAccount /></div>
      </div>
    </SettingsCard>
  );
};
