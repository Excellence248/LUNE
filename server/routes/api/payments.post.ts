import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireViewer } from '../../utils/auth';
import { rateLimit } from '../../utils/limits';
import { sql } from '../../utils/db';

/*
 * Sells Lune Blue / Gold for USDC on Solana.
 *   { action: 'create', tier, reference }      -> records a pending order and says where to pay
 *   { action: 'confirm', reference, signature } -> checks the transaction on-chain and, if it paid the
 *                                                 treasury enough, marks the order paid and grants the badge
 * Server env: TREASURY_ADDRESS (required), SOLANA_RPC_URL, USDC_MINT.
 */

const PRICES_USDC: Record<string, number> = { blue: 8, gold: 40 };
const USDC_DECIMALS = 6;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;

interface Body { action?: unknown; tier?: unknown; reference?: unknown; signature?: unknown }
interface TokenBalance { mint: string; owner?: string; uiTokenAmount: { amount: string } }

export default defineHandler(async (event) => {
  const treasury = process.env.TREASURY_ADDRESS ?? '';
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const mint = process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  if (!treasury) throw new HTTPError('Payments are not configured yet (missing TREASURY_ADDRESS).', { status: 503 });
  const { profile } = await requireViewer(event);
  await rateLimit('payment', profile.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const reference = typeof body.reference === 'string' && BASE58.test(body.reference) ? body.reference : null;

  if (body.action === 'create') {
    const price = typeof body.tier === 'string' ? PRICES_USDC[body.tier] : undefined;
    if (!price || !reference) throw new HTTPError('Invalid order.', { status: 400 });
    await sql`insert into public.crypto_orders (reference, user_id, tier, amount_usdc) values (${reference}, ${profile.id}, ${body.tier as string}, ${price})`;
    return { treasury, mint, amount: price, decimals: USDC_DECIMALS };
  }

  if (body.action === 'confirm') {
    const signature = typeof body.signature === 'string' && SIGNATURE.test(body.signature) ? body.signature : null;
    if (!reference || !signature) throw new HTTPError('Invalid request.', { status: 400 });
    const [order] = await sql`select * from public.crypto_orders where reference = ${reference} and user_id = ${profile.id}`;
    if (!order) throw new HTTPError('Order not found.', { status: 404 });
    if (order.status === 'paid') return { status: 'paid' };

    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }] }),
    });
    const tx = ((await res.json()) as { result?: { meta: { err: unknown; preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[] }; transaction: { message: { accountKeys: ({ pubkey: string } | string)[] } } } }).result;
    if (!tx) return { status: 'pending' }; // not visible yet; the browser retries
    if (tx.meta.err) throw new HTTPError('That transaction failed on-chain.', { status: 400 });
    const keys = tx.transaction.message.accountKeys.map(key => (typeof key === 'string' ? key : key.pubkey));
    if (!keys.includes(order.reference)) throw new HTTPError('The transaction does not belong to this order.', { status: 400 });
    const sum = (balances: TokenBalance[] = []) => balances.filter(b => b.mint === mint && b.owner === treasury).reduce((total, b) => total + BigInt(b.uiTokenAmount.amount), 0n);
    const received = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
    const required = BigInt(Math.round(Number(order.amount_usdc) * 10 ** USDC_DECIMALS));
    if (received < required) throw new HTTPError('The payment was smaller than the price.', { status: 400 });

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
