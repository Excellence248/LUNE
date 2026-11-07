import { supabase } from '@/lib/supabaseClient';
import { getSolanaWallet, type WalletName } from '@/lib/solana-wallet';
import type { BadgeTier } from '@/lib/badges';

const RPC_URL = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) || 'https://api.mainnet-beta.solana.com';

interface Order { treasury: string; mint: string; amount: number; decimals: number; }
export type PaymentStep = 'connecting' | 'preparing' | 'signing' | 'confirming';

const invoke = async <T>(body: object): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('crypto-payments', { body });
  if (error) {
    // Edge-function errors carry a JSON body with a readable message.
    let message = 'Payment service unavailable. Please try again.';
    try { const detail = await (error as { context?: Response }).context?.json(); if (detail?.error) message = detail.error; } catch { /* keep default */ }
    throw new Error(message);
  }
  return data as T;
};

/** Pays for a badge in USDC from the user's Phantom/Solflare wallet, then waits for on-chain confirmation. */
export const payWithUsdc = async (tier: BadgeTier, walletName: WalletName, onStep: (step: PaymentStep) => void) => {
  const wallet = getSolanaWallet(walletName);
  if (!wallet) throw new Error(`${walletName} wallet was not found. Install it or try the other wallet.`);

  // Loaded on demand: these libraries are large and only needed at checkout.
  const [{ Connection, Keypair, PublicKey, Transaction }, spl] = await Promise.all([import('@solana/web3.js'), import('@solana/spl-token')]);

  onStep('connecting');
  await wallet.connect();
  if (!wallet.publicKey) throw new Error('Wallet connection was cancelled.');
  const payer = new PublicKey(wallet.publicKey.toBase58());

  onStep('preparing');
  const reference = Keypair.generate().publicKey;
  const order = await invoke<Order>({ action: 'create', tier, reference: reference.toBase58() });
  const mint = new PublicKey(order.mint);
  const treasury = new PublicKey(order.treasury);
  const connection = new Connection(RPC_URL, 'confirmed');

  const from = spl.getAssociatedTokenAddressSync(mint, payer);
  const to = spl.getAssociatedTokenAddressSync(mint, treasury, true);
  const balance = await connection.getTokenAccountBalance(from).catch(() => null);
  if (!balance || Number(balance.value.amount) < order.amount * 10 ** order.decimals) throw new Error(`Your wallet needs at least ${order.amount} USDC (plus a little SOL for network fees).`);

  const transfer = spl.createTransferCheckedInstruction(from, mint, to, payer, BigInt(order.amount * 10 ** order.decimals), order.decimals);
  // The reference key ties this transfer to the order; it is read-only and signs nothing.
  transfer.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
  const tx = new Transaction().add(spl.createAssociatedTokenAccountIdempotentInstruction(payer, to, treasury, mint), transfer);
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  onStep('signing');
  const signed = await (wallet as unknown as { signTransaction: (t: unknown) => Promise<{ serialize: () => Uint8Array }> }).signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());

  onStep('confirming');
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const result = await invoke<{ status: 'paid' | 'pending'; tier?: BadgeTier; expires_at?: string | null }>({ action: 'confirm', reference: reference.toBase58(), signature });
    if (result.status === 'paid') return result;
  }
  throw new Error(`Your payment was sent but is still confirming. It will be applied automatically – keep this transaction ID: ${signature}`);
};
