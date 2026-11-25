import { useEffect, useState } from 'react';
import { Coins, Loader2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/context/WalletContext';
import { api } from '@/lib/api';
import { tipPost, type PaymentStep } from '@/lib/crypto-payment';
import type { WalletName } from '@/lib/solana-wallet';
import { cn } from '@/lib/utils';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The author's username. */
  recipient: string;
  postId: string;
}

const AMOUNTS = [1, 2, 5, 10];
const STEPS: Record<PaymentStep, string> = {
  connecting: 'Connecting to your wallet…',
  preparing: 'Preparing your tip…',
  signing: 'Approve the tip in your wallet…',
  confirming: 'Waiting for the blockchain to confirm…',
};

interface Summary { available: boolean; count: number; total: number; can_receive: boolean }

/** Send a post's author a tip in USDC, straight from your Solana wallet to theirs. */
const TipModal = ({ isOpen, onClose, recipient, postId }: TipModalProps) => {
  const { user } = useWallet();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [amount, setAmount] = useState(2);
  const [custom, setCustom] = useState('');
  const [step, setStep] = useState<PaymentStep | null>(null);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setError(''); setSent(null); setStep(null);
    api<Summary>(`/api/posts/${postId}/tips`).then(data => { if (active) setSummary(data); }).catch(() => { if (active) setSummary(null); });
    return () => { active = false; };
  }, [isOpen, postId]);

  const value = custom ? Math.round(Number(custom) * 100) / 100 : amount;
  const valid = Number.isFinite(value) && value >= 0.1 && value <= 1000;

  const send = async (wallet: WalletName) => {
    if (!valid || step) return;
    setError('');
    try {
      await tipPost(postId, value, wallet, setStep);
      setSent(value);
      setSummary(previous => previous ? { ...previous, count: previous.count + 1, total: previous.total + value } : previous);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The tip could not be sent. Nothing was charged unless your wallet says so.');
    } finally { setStep(null); }
  };

  const unavailable = summary && (!summary.available || !summary.can_receive);
  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !step) onClose(); }}>
      <DialogContent className="glass-strong backdrop-blur-2xl border-white/10 text-white rounded-3xl max-w-sm">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-300/10 border border-amber-300/20 flex items-center justify-center text-amber-300">
            {sent ? <PartyPopper size={22} /> : <Coins size={22} />}
          </div>
          <DialogTitle className="font-display text-xl">{sent ? 'Tip sent!' : `Tip @${recipient}`}</DialogTitle>
          <DialogDescription className="text-white/55 leading-relaxed">
            {sent
              ? `${sent} USDC went straight to @${recipient}'s wallet. Thanks for supporting them 💜`
              : unavailable
                ? (summary && !summary.available ? 'Tips are being set up. Please check back soon.' : `@${recipient} hasn’t connected a Solana wallet yet, so they can’t receive tips.`)
                : `Send USDC straight from your wallet to theirs. Lune never holds the money.`}
          </DialogDescription>
        </DialogHeader>

        {summary && summary.count > 0 && <p className="text-center text-xs text-amber-200/80">{summary.count} {summary.count === 1 ? 'tip' : 'tips'} · {summary.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC on this post</p>}

        {!sent && !unavailable && (
          !user ? <p className="text-center text-sm text-white/50">Log in to send a tip.</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {AMOUNTS.map(option => (
                  <button key={option} type="button" disabled={!!step} onClick={() => { setAmount(option); setCustom(''); }}
                    className={cn('h-11 rounded-2xl border text-sm font-semibold transition-colors', !custom && amount === option ? 'border-amber-300/60 bg-amber-300/15 text-amber-100' : 'border-white/10 text-white/70 hover:border-white/25')}>
                    ${option}
                  </button>
                ))}
              </div>
              <label className="block text-xs text-white/45">Or another amount (USDC)
                <input inputMode="decimal" value={custom} disabled={!!step} onChange={event => setCustom(event.target.value.replace(/[^0-9.]/g, '').slice(0, 7))} placeholder="e.g. 3.50" className="lune-input mt-1 w-full text-[16px]" />
              </label>
              {custom && !valid && <p className="text-xs text-red-300">Tips are from 0.10 to 1,000 USDC.</p>}
              {step ? (
                <p role="status" className="flex items-center justify-center gap-2 py-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" />{STEPS[step]}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {(['Phantom', 'Solflare'] as WalletName[]).map(wallet => (
                    <Button key={wallet} variant="outline" disabled={!valid} onClick={() => void send(wallet)} className="h-12 rounded-full border-white/15 bg-transparent">Tip {valid ? `$${value}` : ''} with {wallet}</Button>
                  ))}
                </div>
              )}
              {error && <p role="alert" className="text-center text-sm text-red-300">{error}</p>}
              <p className="text-center text-[11px] leading-relaxed text-white/35">Tips are final and can’t be refunded. You also pay a tiny Solana network fee in SOL.</p>
            </div>
          )
        )}
        {(sent || unavailable) && <Button onClick={onClose} className="rounded-full">Close</Button>}
      </DialogContent>
    </Dialog>
  );
};

export default TipModal;
