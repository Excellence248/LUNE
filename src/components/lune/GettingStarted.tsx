import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { dismissChecklist, hasDefaultUsername, hasPostedFirst, isChecklistDismissed } from '@/lib/onboarding';

const R = 16;
const CIRC = 2 * Math.PI * R;

const Ring = ({ done, total }: { done: number; total: number }) => (
  <div className="relative h-11 w-11 shrink-0" role="img" aria-label={`${done} of ${total} steps complete`}>
    <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
      <circle cx="20" cy="20" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
      <circle cx="20" cy="20" r={R} fill="none" stroke="#c084fc" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - done / total)} style={{ transition: 'stroke-dashoffset 600ms ease' }} />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">{done}/{total}</span>
  </div>
);

/** "Complete your profile" progress card shown at the top of the feed until finished or dismissed. */
const GettingStarted = () => {
  const { user } = useWallet();
  const { posts, followingCount, followingLoading, loading } = useSocial();
  const [dismissed, setDismissed] = useState(() => (user ? isChecklistDismissed(user.id) : false));

  if (!user || dismissed || loading || followingLoading) return null;

  const focusComposer = () => {
    const box = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Write a public post"]');
    box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    box?.focus();
  };

  const items: { label: string; done: boolean; to?: string; action?: () => void }[] = [
    { label: 'Choose a username', done: !hasDefaultUsername(user), to: '/welcome' },
    { label: 'Add a photo', done: !!user.avatar, to: '/profile' },
    { label: 'Write a short bio', done: !!user.bio.trim(), to: '/profile' },
    { label: 'Follow someone', done: followingCount > 0, to: '/welcome?step=follow' },
    { label: 'Make your first post', done: hasPostedFirst(user.id) || posts.some(post => post.user_id === user.id), action: focusComposer },
  ];
  const done = items.filter(item => item.done).length;
  if (done === items.length) return null;

  return (
    <section aria-label="Getting started" className="mx-4 my-3 rounded-2xl border border-lune-400/20 bg-gradient-to-br from-lune-500/15 to-transparent p-4 md:mx-6">
      <div className="flex items-center gap-3">
        <Ring done={done} total={items.length} />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">Finish setting up your moon</p>
          <p className="text-xs text-white/50">A complete profile gets noticed more.</p>
        </div>
        <button type="button" aria-label="Dismiss getting started" onClick={() => { dismissChecklist(user.id); setDismissed(true); }} className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white"><X size={16} /></button>
      </div>
      <ul className="mt-3 space-y-1">
        {items.map(item => {
          const body = (
            <>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${item.done ? 'border-lune-300 bg-lune-400 text-[#12062a]' : 'border-white/20'}`}>{item.done && <Check size={12} strokeWidth={3} />}</span>
              <span className={item.done ? 'text-white/40 line-through' : 'text-white/85'}>{item.label}</span>
            </>
          );
          const cls = 'flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm';
          if (item.done) return <li key={item.label} className={cls}>{body}</li>;
          return <li key={item.label}>{item.to ? <Link to={item.to} className={`${cls} hover:bg-white/5`}>{body}</Link> : <button type="button" onClick={item.action} className={`${cls} w-full text-left hover:bg-white/5`}>{body}</button>}</li>;
        })}
      </ul>
    </section>
  );
};

export default GettingStarted;
