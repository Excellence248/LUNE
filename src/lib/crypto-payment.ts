import { api } from '@/lib/api';
import { getSolanaWallet, type WalletName } from '@/lib/solana-wallet';
import type { BadgeTier } from '@/lib/badges';

const RPC_URL = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) || 'https://api.mainnet-beta.solana.com';

/** Where a payment goes: made by the server, which also checks it on-chain afterwards. */
interface Destination { reference: string; recipient: string; mint: string; amount: number; decimals: number }
export type PaymentStep = 'connecting' | 'preparing' | 'signing' | 'confirming';

/**
 * Sends USDC from the member's Phantom/Solflare wallet to `recipient`, carrying the server's reference so
 * the payment can be traced, then keeps asking the server to confirm it on-chain until it does.
 */
const sendUsdc = async (
  walletName: WalletName,
  onStep: (step: PaymentStep) => void,
  create: () => Promise<Destination>,
  confirm: (reference: string, signature: string) => Promise<{ status: string }>,
) => {
  const wallet = getSolanaWallet(walletName);
  if (!wallet) throw new Error(`${walletName} wallet was not found. Install it or try the other wallet.`);

  // Loaded on demand: these libraries are large and only needed at checkout.
  const [{ Connection, PublicKey, Transaction }, spl] = await Promise.all([import('@solana/web3.js'), import('@solana/spl-token')]);

  onStep('connecting');
  await wallet.connect();
  if (!wallet.publicKey) throw new Error('Wallet connection was cancelled.');
  const payer = new PublicKey(wallet.publicKey.toBase58());

  onStep('preparing');
  const order = await create();
  const reference = new PublicKey(order.reference);
  const mint = new PublicKey(order.mint);
  const recipient = new PublicKey(order.recipient);
  if (recipient.equals(payer)) throw new Error('That’s your own wallet.');
  const connection = new Connection(RPC_URL, 'confirmed');

  const units = BigInt(Math.round(order.amount * 10 ** order.decimals));
  const from = spl.getAssociatedTokenAddressSync(mint, payer);
  const to = spl.getAssociatedTokenAddressSync(mint, recipient, true);
  const balance = await connection.getTokenAccountBalance(from).catch(() => null);
  if (!balance || BigInt(balance.value.amount) < units) throw new Error(`Your wallet needs at least ${order.amount} USDC (plus a little SOL for network fees).`);

  const transfer = spl.createTransferCheckedInstruction(from, mint, to, payer, units, order.decimals);
  // The reference key ties this transfer to the order; it is read-only and signs nothing.
  transfer.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
  const tx = new Transaction().add(spl.createAssociatedTokenAccountIdempotentInstruction(payer, to, recipient, mint), transfer);
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  onStep('signing');
  const signed = await (wallet as unknown as { signTransaction: (t: unknown) => Promise<{ serialize: () => Uint8Array }> }).signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());

  onStep('confirming');
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const result = await confirm(reference.toBase58(), signature);
    if (result.status === 'paid') return result;
  }
  throw new Error(`Your payment was sent but is still confirming. It will be applied automatically – keep this transaction ID: ${signature}`);
};

/** Pays for a badge in USDC, to the Lune treasury. */
export const payWithUsdc = (tier: BadgeTier, walletName: WalletName, onStep: (step: PaymentStep) => void) =>
  sendUsdc(walletName, onStep,
    async () => {
      const order = await api<{ reference: string; treasury: string; mint: string; amount: number; decimals: number }>('/api/payments', { method: 'POST', body: { action: 'create', tier } });
      return { ...order, recipient: order.treasury };
    },
    (reference, signature) => api<{ status: 'paid' | 'pending'; tier?: BadgeTier; expires_at?: string | null }>('/api/payments', { method: 'POST', body: { action: 'confirm', reference, signature } }),
  ) as Promise<{ status: 'paid'; tier?: BadgeTier; expires_at?: string | null }>;

/** Tips a post's author in USDC, straight to their own wallet. */
export const tipPost = (postId: string, amount: number, walletName: WalletName, onStep: (step: PaymentStep) => void) =>
  sendUsdc(walletName, onStep,
    () => api<Destination>('/api/tips', { method: 'POST', body: { action: 'create', post_id: postId, amount } }),
    (reference, signature) => api<{ status: 'paid' | 'pending' }>('/api/tips', { method: 'POST', body: { action: 'confirm', reference, signature } }),
  );
