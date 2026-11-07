import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, Loader2, Wallet } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import { PageHeader } from '@/components/lune/Brand';
import { BadgeSeal } from '@/components/lune/VerifiedBadge';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useBadge } from '@/context/BadgesContext';
import { PLANS, type Plan, type BadgeTier } from '@/lib/badges';
import { payWithUsdc, type PaymentStep } from '@/lib/crypto-payment';
import type { WalletName } from '@/lib/solana-wallet';
import { showError, showSuccess } from '@/utils/toast';

const STEP_TEXT: Record<PaymentStep, string> = {
  connecting: 'Connecting to your wallet…', preparing: 'Preparing your order…',
  signing: 'Approve the payment in your wallet…', confirming: 'Waiting for the blockchain to confirm…',
};

const checkoutHref = (plan: Plan, userId: string, email: string) => {
  if (!plan.checkoutUrl) return null;
  try {
    const url = new URL(plan.checkoutUrl);
    url.searchParams.set('client_reference_id', userId); // lets the payment webhook know whom to verify
    if (email) url.searchParams.set('prefilled_email', email);
    return url.toString();
  } catch { return null; }
};

const Premium = () => {
  const { user } = useWallet();
  const current = useBadge(user?.username);
  const [paying, setPaying] = useState<{ tier: BadgeTier; step: PaymentStep } | null>(null);
  const [pickWallet, setPickWallet] = useState<BadgeTier | null>(null);

  const pay = async (tier: BadgeTier, wallet: WalletName) => {
    setPickWallet(null);
    setPaying({ tier, step: 'connecting' });
    try {
      await payWithUsdc(tier, wallet, step => setPaying({ tier, step }));
      showSuccess('Payment confirmed! Your tick is active – refreshing…');
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Payment failed. Nothing was charged.');
    } finally { setPaying(null); }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Lune Premium" icon={BadgeCheck} title="Get verified" description="Show the community who you are with a verified tick, and unlock tools built for people who post, host and build on Lune." />

        {current && (
          <div className="lune-card mb-8 flex items-center gap-4 p-5">
            <BadgeSeal tier={current} className="h-9 w-9" />
            <div>
              <p className="font-semibold">You’re verified{current === 'gold' ? ' with Gold' : ''}.</p>
              <p className="text-sm text-white/50">Your {current} tick shows on your profile, posts and replies.</p>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {PLANS.map(plan => {
            const href = user ? checkoutHref(plan, user.id, user.email) : null;
            const owned = current === plan.id || (current === 'gold' && plan.id === 'blue');
            return (
              <section key={plan.id} className={`lune-card flex flex-col p-6 sm:p-8 ${plan.id === 'gold' ? 'ring-1 ring-amber-300/40' : ''}`} aria-label={plan.name}>
                <div className="flex items-center gap-2"><BadgeSeal tier={plan.id} className="h-6 w-6" /><h2 className="font-display text-xl font-bold">{plan.name}</h2></div>
                <p className="mt-1 text-sm text-white/50">{plan.tagline}</p>
                <p className="mt-5"><span className="font-display text-4xl font-bold">{plan.price}</span> <span className="text-white/45">{plan.period}</span></p>
                <ul className="my-6 flex-1 space-y-3 text-sm text-white/75">
                  {plan.perks.map(perk => <li key={perk} className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-lune-300" />{perk}</li>)}
                </ul>
                {owned ? (
                  <Button disabled className="h-12 w-full rounded-full">Current plan</Button>
                ) : !user ? (
                  <Button asChild className="h-12 w-full rounded-full bg-lune-500 hover:bg-lune-600"><Link to="/signin">Log in to subscribe</Link></Button>
                ) : (
                  <div className="space-y-2">
                    {paying?.tier === plan.id ? (
                      <Button disabled className="h-12 w-full rounded-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {STEP_TEXT[paying.step]}</Button>
                    ) : pickWallet === plan.id ? (
                      <div className="grid grid-cols-2 gap-2">
                        {(['Phantom', 'Solflare'] as WalletName[]).map(w => <Button key={w} variant="outline" className="h-12 rounded-full" disabled={!!paying} onClick={() => void pay(plan.id, w)}>{w}</Button>)}
                        <Button variant="ghost" className="col-span-2 h-9 text-xs text-white/50" onClick={() => setPickWallet(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button className="h-12 w-full rounded-full bg-lune-500 hover:bg-lune-600" disabled={!!paying} onClick={() => setPickWallet(plan.id)}><Wallet className="mr-2 h-4 w-4" /> Pay with crypto (USDC)</Button>
                    )}
                    {href && <Button asChild variant="outline" className="h-12 w-full rounded-full"><a href={href}>Pay with card</a></Button>}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-white/35">Each payment adds 30 days of verification. Your tick appears as soon as the payment is confirmed.</p>
      </div>
    </Layout>
  );
};

export default Premium;
