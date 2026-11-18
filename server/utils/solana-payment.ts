import { randomBytes } from 'node:crypto';
import { base58Encode } from './wallet';

/** USDC on Solana mainnet. Its mint is a token identifier, not a wallet: never send money to it. */
export const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_DECIMALS = 6;

/**
 * A fresh random 32-byte key that identifies one order. The server creates it (never the browser), so
 * nobody can pick a key that already appears in someone else's transaction and claim that payment.
 * The buyer's transfer includes it as a read-only account, which is how the payment is traced back.
 */
export const newReference = () => base58Encode(randomBytes(32));

interface TokenBalance { mint: string; owner?: string; uiTokenAmount: { amount: string } }

/** The parts of a `getTransaction` (jsonParsed) result that the check reads. */
export interface ParsedTransaction {
  blockTime?: number | null;
  meta: { err: unknown; preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[] };
  transaction: { message: { accountKeys: ({ pubkey: string } | string)[] } };
}

export interface PaymentOrder { reference: string; amountUsdc: number; createdAt: Date }
export type PaymentFailure = 'failed' | 'wrong-order' | 'too-old' | 'underpaid';
export interface PaymentCheck { ok: boolean; reason: PaymentFailure | null }

/**
 * Decides whether an on-chain transaction pays for an order: it succeeded, it carries the order's
 * reference, it happened after the order was created, and the treasury's USDC balance went up by at
 * least the price. The amount is measured from balances, not from instructions, so it cannot be faked
 * by an instruction that merely looks like a transfer.
 */
export const checkPayment = (tx: ParsedTransaction, order: PaymentOrder, treasury: string, mint: string): PaymentCheck => {
  if (tx.meta.err) return { ok: false, reason: 'failed' };
  const keys = tx.transaction.message.accountKeys.map(key => (typeof key === 'string' ? key : key.pubkey));
  if (!keys.includes(order.reference)) return { ok: false, reason: 'wrong-order' };
  if (tx.blockTime && tx.blockTime * 1000 < order.createdAt.getTime() - 60_000) return { ok: false, reason: 'too-old' };
  const total = (balances: TokenBalance[] = []) => balances
    .filter(balance => balance.mint === mint && balance.owner === treasury)
    .reduce((sum, balance) => sum + BigInt(balance.uiTokenAmount.amount), 0n);
  const received = total(tx.meta.postTokenBalances) - total(tx.meta.preTokenBalances);
  const required = BigInt(Math.round(order.amountUsdc * 10 ** USDC_DECIMALS));
  return received >= required && required > 0n ? { ok: true, reason: null } : { ok: false, reason: 'underpaid' };
};
