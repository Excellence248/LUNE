import { defineHandler } from 'nitro';
import { deleteCookie } from 'nitro/h3';
import { WALLET_COOKIE } from '../../../utils/wallet';

// Ends a wallet session. Email sessions end through Neon Auth (/api/auth/sign-out).
export default defineHandler((event) => {
  deleteCookie(event, WALLET_COOKIE, { path: '/' });
  return { ok: true };
});
