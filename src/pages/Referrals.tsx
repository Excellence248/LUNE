import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Loader2, Share2, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Layout from '@/components/lune/Layout';
import { EmptyState, PageHeader } from '@/components/lune/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/context/WalletContext';
import { api } from '@/lib/api';
import { displayNameOf } from '@/lib/names';
import { showError } from '@/utils/toast';

interface Invited { id: string; username: string; display_name: string; avatar_url: string; joined_at: string; active: boolean }

const Referrals = () => {
  const { user, loading } = useWallet();
  const [items, setItems] = useState<Invited[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api<{ available: boolean; items: Invited[] }>('/api/me/referrals').then(data => { if (active) { setAvailable(data.available); setItems(data.items); } }).catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [user?.id]);

  const link = user ? `${window.location.origin}/signup?ref=${encodeURIComponent(user.username)}` : '';
  const message = 'Join me on Lune, the social space for the Solana community 🌙';

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { showError('Copy didn’t work here. Press and hold the link to copy it.'); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Lune', text: message, url: link }); } catch { /* cancelled */ } }
    else await copy();
  };

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl">
          <PageHeader eyebrow="Invite friends" icon={UserPlus} title="Bring your crew to Lune" description="Share your invite link. You earn 20 Moon points for every friend who joins and posts." />
          <div className="lune-card">{loading ? <p role="status" className="flex items-center justify-center gap-2 py-10 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p> : <EmptyState icon={UserPlus} title="Log in to get your invite link"><Link to="/signin" className="text-lune-300 hover:underline">Log in</Link> or <Link to="/signup" className="text-lune-300 hover:underline">create an account</Link>.</EmptyState>}</div>
        </div>
      </Layout>
    );
  }

  const activeCount = items?.filter(item => item.active).length ?? 0;
  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Invite friends" icon={UserPlus} title="Bring your crew to Lune" description="Share your invite link. You earn 20 Moon points for every friend who joins and posts." />

        <div className="mb-6 rounded-3xl border border-lune-400/25 bg-gradient-to-br from-lune-600/25 via-lune-900/40 to-black/30 p-5">
          <p className="mb-2 text-sm font-semibold text-white/80">Your invite link</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={link} onFocus={event => event.currentTarget.select()} aria-label="Your invite link" className="lune-input min-w-0 flex-1 text-[15px]" />
            <div className="flex gap-2">
              <button onClick={() => void copy()} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/85 hover:text-white sm:flex-none">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy'}</button>
              <button onClick={() => void share()} className="lune-btn h-11 flex-1 px-5 text-sm sm:flex-none"><Share2 size={16} className="mr-2" />Share</button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/[0.05] p-3"><p className="font-display text-2xl font-bold tabular-nums">{items?.length ?? '–'}</p><p className="text-xs text-white/50">Joined</p></div>
            <div className="rounded-2xl bg-white/[0.05] p-3"><p className="font-display text-2xl font-bold tabular-nums">{items ? activeCount : '–'}</p><p className="text-xs text-white/50">Posted</p></div>
            <div className="rounded-2xl bg-white/[0.05] p-3"><p className="font-display text-2xl font-bold tabular-nums text-lune-200">{items ? activeCount * 20 : '–'}</p><p className="text-xs text-white/50">Points earned</p></div>
          </div>
        </div>

        <h2 className="mb-3 font-display text-lg font-semibold">Friends you invited</h2>
        {!items && <div role="status" className="flex items-center justify-center gap-2 py-10 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>}
        {items && !available && <p className="text-sm text-white/45">Invites are being set up. Your link will start counting soon.</p>}
        {items && available && items.length === 0 && <div className="lune-card"><EmptyState icon={UserPlus} title="No one yet">When a friend signs up with your link, they’ll show up here.</EmptyState></div>}
        {items && items.length > 0 && (
          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-3xl border border-white/10 glass-soft">
            {items.map(item => (
              <li key={item.id}>
                <Link to={`/profile/${encodeURIComponent(item.username)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                  <Avatar className="h-10 w-10 ring-1 ring-white/10"><AvatarImage src={item.avatar_url} /><AvatarFallback className="bg-lune-900 text-sm text-lune-200">{displayNameOf(item)[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{displayNameOf(item)}</span><span className="block truncate text-xs text-white/40">@{item.username} · joined {formatDistanceToNow(new Date(item.joined_at), { addSuffix: true })}</span></span>
                  <span className={item.active ? 'rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300' : 'rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/45'}>{item.active ? '+20 pts' : 'Hasn’t posted yet'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-white/35">Only new accounts count, and each person can be invited once. Moon points have no money value.</p>
      </div>
    </Layout>
  );
};

export default Referrals;
