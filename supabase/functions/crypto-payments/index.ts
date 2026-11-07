// Supabase Edge Function: sells Lune Blue / Gold for USDC on Solana.
//
//   action "create"  -> records a pending order and tells the browser where to pay
//   action "confirm" -> checks the transaction on-chain and, if it really paid the treasury, grants the badge
//
// Secrets (supabase secrets set ...):
//   TREASURY_ADDRESS   wallet that receives the money (required)
//   SOLANA_RPC_URL     default https://api.mainnet-beta.solana.com  (use a private RPC for real traffic)
//   USDC_MINT          default mainnet USDC EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRICES_USDC: Record<string, number> = { blue: 8, gold: 40 };
const DAYS = 30;
const USDC_DECIMALS = 6;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const TREASURY = Deno.env.get('TREASURY_ADDRESS') ?? '';
const RPC = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com';
const MINT = Deno.env.get('USDC_MINT') ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!TREASURY) return json({ error: 'Payments are not configured yet (missing TREASURY_ADDRESS).' }, 503);

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return json({ error: 'Log in to continue.' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: { action?: string; tier?: string; reference?: string; signature?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  if (body.action === 'create') {
    const price = body.tier ? PRICES_USDC[body.tier] : undefined;
    if (!price || !body.reference || !BASE58.test(body.reference)) return json({ error: 'Invalid order.' }, 400);
    const { error } = await admin.from('crypto_orders').insert({ reference: body.reference, user_id: user.id, tier: body.tier, amount_usdc: price });
    if (error) return json({ error: 'Could not create the order.' }, 500);
    return json({ treasury: TREASURY, mint: MINT, amount: price, decimals: USDC_DECIMALS });
  }

  if (body.action === 'confirm') {
    if (!body.reference || !body.signature || !BASE58.test(body.reference) || !/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(body.signature)) return json({ error: 'Invalid request.' }, 400);
    const { data: order } = await admin.from('crypto_orders').select('*').eq('reference', body.reference).eq('user_id', user.id).maybeSingle();
    if (!order) return json({ error: 'Order not found.' }, 404);
    if (order.status === 'paid') return json({ status: 'paid' });

    const rpc = await fetch(RPC, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [body.signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }] }),
    });
    const tx = (await rpc.json())?.result;
    if (!tx) return json({ status: 'pending' }); // not visible yet - the browser retries
    if (tx.meta?.err) return json({ error: 'That transaction failed on-chain.' }, 400);

    const keys: string[] = tx.transaction.message.accountKeys.map((k: { pubkey: string } | string) => (typeof k === 'string' ? k : k.pubkey));
    if (!keys.includes(order.reference)) return json({ error: 'The transaction does not belong to this order.' }, 400);

    const sum = (balances: Array<{ mint: string; owner?: string; uiTokenAmount: { amount: string } }> = []) =>
      balances.filter(b => b.mint === MINT && b.owner === TREASURY).reduce((t, b) => t + BigInt(b.uiTokenAmount.amount), 0n);
    const received = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
    const required = BigInt(Math.round(Number(order.amount_usdc) * 10 ** USDC_DECIMALS));
    if (received < required) return json({ error: 'The payment was smaller than the price.' }, 400);

    // Claim the transaction first: the unique signature stops it from paying for two orders.
    const { error: claimError } = await admin.from('crypto_orders').update({ status: 'paid', signature: body.signature, paid_at: new Date().toISOString() }).eq('reference', order.reference).eq('status', 'pending');
    if (claimError) return json({ error: 'This transaction was already used.' }, 400);

    const { data: existing } = await admin.from('user_badges').select('tier, expires_at').eq('user_id', user.id).maybeSingle();
    const now = Date.now();
    const activeUntil = existing?.expires_at ? Date.parse(existing.expires_at) : existing ? Infinity : 0;
    const base = Math.max(now, activeUntil === Infinity ? now : activeUntil);
    const tier = existing && activeUntil > now && existing.tier === 'gold' ? 'gold' : order.tier;
    // Founder / non-expiring badges stay non-expiring.
    const expires = existing && !existing.expires_at ? null : new Date(base + DAYS * 86400000).toISOString();
    await admin.from('user_badges').upsert({ user_id: user.id, tier, expires_at: expires, granted_at: new Date().toISOString() });
    return json({ status: 'paid', tier, expires_at: expires });
  }

  return json({ error: 'Unknown action.' }, 400);
});
