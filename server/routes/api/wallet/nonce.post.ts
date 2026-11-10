import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { clientIp, rateLimit } from '../../../utils/limits';
import { createNonce, isWalletAddress } from '../../../utils/wallet';

// Body: { address }. Returns the exact message the wallet must sign.
export default defineHandler(async (event) => {
  await rateLimit('walletNonce', clientIp(event));
  const { address } = ((await readBody<{ address?: unknown }>(event)) ?? {}) as { address?: unknown };
  if (!isWalletAddress(address)) throw new HTTPError('That is not a Solana wallet address.', { status: 400 });
  return createNonce(address, event.req.headers.get('host') ?? 'lune');
});
