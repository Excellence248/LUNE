import { shortWalletAddress } from '@/lib/solana-wallet';

interface Nameable { username?: string | null; display_name?: string | null; displayName?: string | null; wallet_address?: string | null; walletAddress?: string | null }

/**
 * The name to show for a member: the display name they chose, or their username when they have not
 * set one (a wallet address used as a username is shortened). The @handle is always the username.
 */
export const displayNameOf = (member?: Nameable | null, fallback = 'Lune user'): string => {
  if (!member) return fallback;
  const chosen = (member.display_name ?? member.displayName ?? '').trim();
  if (chosen) return chosen;
  const username = member.username ?? '';
  const wallet = member.wallet_address ?? member.walletAddress;
  if (username && wallet && username === wallet) return shortWalletAddress(username);
  return username || fallback;
};
