import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../utils/auth';
import { rateLimit } from '../../utils/limits';
import { sql } from '../../utils/db';
import { MAINNET_USDC_MINT, USDC_DECIMALS, checkPayment, newReference, type ParsedTransaction } from '../../utils/solana-payment';
import { isWalletAddress } from '../../utils/wallet';
import { FIRST_PAYMENT_DISCOUNT, PRICES_USDC, amountDue, priceFor } from '../../utils/pricing';

/*
 * Sells Lune Blue / Gold for USDC on Solana.
 *   { action: 'quote' }                         -> what each plan costs this member (10% off a first payment)
 *   { action: 'create', tier }                  -> records a pending order, returns its reference and where to pay
 *   { action: 'confirm', reference, signature } -> checks the transaction on-chain and, if it paid the
 *                                                 treasury enough, marks the order paid and grants the badge
 * Server env: TREASURY_ADDRESS (required: the wallet that receives the USDC), SOLANA_RPC_URL, USDC_MINT.
 */

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;

interface Body { action?: unknown; tier?: unknown; reference?: unknown; signature?: unknown }

const REASONS = {
  failed: 'That transaction failed on-chain.',
  'wrong-order': 'The transaction does not belong to this order.',
  'too-old': 'That transaction happened before this order was created.',
  underpaid: 'The payment was smaller than the price.',
} as const;

export default defineHandler(async (event) => {
  const { profile } = await requireAdultViewer(event);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  // A member's first payment (any plan) is discounted; pending orders do not count, paid ones do.
  const [{ paid }] = (await sql`select exists (select 1 from public.crypto_orders where user_id = ${profile.id} and status = 'paid') as paid`) as { paid: boolean }[];

  if (body.action === 'quote') {
    const prices = Object.fromEntries(Object.keys(PRICES_USDC).map(tier => [tier, { list: PRICES_USDC[tier], price: priceFor(tier, !paid) }]));
    return { firstPayment: !paid, discount: FIRST_PAYMENT_DISCOUNT, prices };
  }

  const treasury = process.env.TREASURY_ADDRESS ?? '';
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const mint = process.env.USDC_MINT || MAINNET_USDC_MINT;
  if (!treasury) throw new HTTPError('Payments are not configured yet (missing TREASURY_ADDRESS).', { status: 503 });
  // The mint is the coin's identifier, not a wallet: money sent to it could never be recovered.
  if (!isWalletAddress(treasury) || treasury === mint) throw new HTTPError('Payments are misconfigured: TREASURY_ADDRESS must be a wallet address that receives the USDC.', { status: 503 });
  await rateLimit('payment', profile.id);

  if (body.action === 'create') {
    const tier = typeof body.tier === 'string' ? body.tier : '';
    const price = priceFor(tier, !paid);
    if (!price) throw new HTTPError('Invalid order.', { status: 400 });
    const reference = newReference();
    await sql`insert into public.crypto_orders (reference, user_id, tier, amount_usdc) values (${reference}, ${profile.id}, ${tier}, ${price})`;
    return { reference, treasury, mint, amount: price, decimals: USDC_DECIMALS };
  }

  if (body.action === 'confirm') {
    const reference = typeof body.reference === 'string' && BASE58.test(body.reference) ? body.reference : null;
    const signature = typeof body.signature === 'string' && SIGNATURE.test(body.signature) ? body.signature : null;
    if (!reference || !signature) throw new HTTPError('Invalid request.', { status: 400 });
    const [order] = await sql`select reference, tier, amount_usdc, status, created_at from public.crypto_orders where reference = ${reference} and user_id = ${profile.id}`;
    if (!order) throw new HTTPError('Order not found.', { status: 404 });
    if (order.status === 'paid') return { status: 'paid' };
    // An order made at the first-payment discount is only honoured at the discount while no other order is paid.
    const [{ others }] = (await sql`select exists (select 1 from public.crypto_orders where user_id = ${profile.id} and status = 'paid' and reference <> ${reference}) as others`) as { others: boolean }[];
    const due = amountDue(order.tier as string, Number(order.amount_usdc), others);

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
      throw new HTTPError('The Solana network is busy. Your payment is safe: try confirming again in a moment.', { status: 503 });
    }
    if (!result) return { status: 'pending' }; // not visible yet; the browser retries

    const verdict = checkPayment(result, { reference, amountUsdc: due, createdAt: new Date(order.created_at as string) }, treasury, mint);
    if (!verdict.ok && verdict.reason) throw new HTTPError(REASONS[verdict.reason], { status: 400 });

    try {
      const [badge] = await sql`select tier, expires_at from public.confirm_crypto_order(${reference}, ${profile.id}, ${signature})`;
      return { status: 'paid', tier: badge.tier, expires_at: badge.expires_at };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') throw new HTTPError('This transaction was already used.', { status: 400 });
      if (code === 'P0002') return { status: 'paid' }; // a parallel confirm got there first
      throw error;
    }
  }

  throw new HTTPError('Unknown action.', { status: 400 });
});
