import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../utils/auth';
import { isUuid } from '../../utils/calls';
import { sql } from '../../utils/db';
import { rateLimit } from '../../utils/limits';
import { nameOf, pushTo } from '../../utils/push';
import { MAINNET_USDC_MINT, USDC_DECIMALS, checkPayment, newReference, type ParsedTransaction } from '../../utils/solana-payment';
import { isWalletAddress } from '../../utils/wallet';

/*
 * USDC tips on posts, paid straight from the tipper's wallet to the author's verified wallet.
 *   { action: 'create', post_id, amount }       -> records a pending tip; returns its reference and where to pay
 *   { action: 'confirm', reference, signature } -> checks the transaction on-chain and, if it paid the author
 *                                                 enough, marks the tip paid and tells the author
 * Server env: SOLANA_RPC_URL, USDC_MINT (both optional).
 */

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;
const REASONS = {
  failed: 'That transaction failed on-chain.',
  'wrong-order': 'The transaction does not belong to this tip.',
  'too-old': 'That transaction happened before this tip was started.',
  underpaid: 'The amount sent was smaller than the tip.',
} as const;

interface Body { action?: unknown; post_id?: unknown; amount?: unknown; reference?: unknown; signature?: unknown }

export default defineHandler(async (event) => {
  const { profile } = await requireAdultViewer(event);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const mint = process.env.USDC_MINT || MAINNET_USDC_MINT;
  const [ready] = await sql`select to_regclass('public.tips') is not null as ok`;
  if (!ready?.ok) throw new HTTPError('Tips aren’t available yet. Please try again soon.', { status: 503 });
  await rateLimit('payment', profile.id);

  if (body.action === 'create') {
    if (!isUuid(body.post_id)) throw new HTTPError('Invalid post.', { status: 400 });
    const amount = Math.round(Number(body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 0.1 || amount > 1000) throw new HTTPError('Tips are from 0.10 to 1,000 USDC.', { status: 400 });
    const [post] = await sql`
      select po.user_id, p.wallet_address, public.is_blocked_between(${profile.id}, po.user_id) as blocked
      from public.posts po join public.profiles p on p.id = po.user_id where po.id = ${body.post_id as string}`;
    if (!post) throw new HTTPError('This post no longer exists.', { status: 404 });
    if (post.user_id === profile.id) throw new HTTPError('You can’t tip your own post.', { status: 400 });
    if (post.blocked) throw new HTTPError('You can’t tip this account.', { status: 403 });
    const wallet = post.wallet_address as string | null;
    // Only a wallet the author proved they own (by signing in with it) can receive tips.
    if (!wallet || !isWalletAddress(wallet) || wallet === mint) throw new HTTPError('This member hasn’t connected a wallet yet, so they can’t receive tips.', { status: 409 });
    const reference = newReference();
    await sql`
      insert into public.tips (reference, post_id, sender_id, recipient_id, recipient_wallet, amount_usdc)
      values (${reference}, ${body.post_id as string}, ${profile.id}, ${post.user_id}, ${wallet}, ${amount})`;
    return { reference, recipient: wallet, mint, amount, decimals: USDC_DECIMALS };
  }

  if (body.action === 'confirm') {
    const reference = typeof body.reference === 'string' && BASE58.test(body.reference) ? body.reference : null;
    const signature = typeof body.signature === 'string' && SIGNATURE.test(body.signature) ? body.signature : null;
    if (!reference || !signature) throw new HTTPError('Invalid request.', { status: 400 });
    const [tip] = await sql`select reference, post_id, recipient_id, recipient_wallet, amount_usdc, status, created_at from public.tips where reference = ${reference} and sender_id = ${profile.id}`;
    if (!tip) throw new HTTPError('Tip not found.', { status: 404 });
    if (tip.status === 'paid') return { status: 'paid' };

    let result: ParsedTransaction | null | undefined;
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }] }),
      });
      if (!res.ok) throw new Error(`RPC ${res.status}`);
      result = ((await res.json()) as { result?: ParsedTransaction | null }).result;
    } catch {
      throw new HTTPError('The Solana network is busy. Your tip is safe: try confirming again in a moment.', { status: 503 });
    }
    if (!result) return { status: 'pending' }; // not visible yet; the browser retries

    // The same check as Premium payments, with the author's wallet as the receiver.
    const verdict = checkPayment(result, { reference, amountUsdc: Number(tip.amount_usdc), createdAt: new Date(tip.created_at as string) }, tip.recipient_wallet as string, mint);
    if (!verdict.ok && verdict.reason) throw new HTTPError(REASONS[verdict.reason], { status: 400 });

    try {
      const [paid] = await sql`select reference from public.confirm_tip(${reference}, ${profile.id}, ${signature})`;
      if (paid?.reference) {
        const sender = await nameOf(profile.id);
        await pushTo(tip.recipient_id as string, { title: `${sender.name} tipped you ${Number(tip.amount_usdc)} USDC 💸`, body: 'It’s already in your wallet.', url: tip.post_id ? `/post/${tip.post_id}` : '/', tag: `tip:${reference}`, category: 'likes' });
      }
      return { status: 'paid' };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new HTTPError('This transaction was already used.', { status: 400 });
      throw error;
    }
  }

  throw new HTTPError('Unknown action.', { status: 400 });
});
