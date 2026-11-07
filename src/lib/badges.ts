export type BadgeTier = 'blue' | 'gold';

/** Accounts that always carry a gold tick, even before the database migration has been run. */
export const FOUNDER_USERNAMES = ['sammy'];

export interface Plan {
  id: BadgeTier;
  name: string;
  price: string;
  period: string;
  tagline: string;
  perks: string[];
  /** Hosted checkout URL (e.g. a Stripe Payment Link), configured in .env */
  checkoutUrl?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'blue', name: 'Lune Blue', price: '$8', period: '/ month', tagline: 'For people who want to stand out.',
    perks: ['Blue verified tick on your profile and posts', 'Priority placement in replies', 'Longer posts and bigger uploads', 'Edit and pin your posts', 'Early access to new features'],
    checkoutUrl: import.meta.env.VITE_CHECKOUT_BLUE_URL as string | undefined,
  },
  {
    id: 'gold', name: 'Lune Gold', price: '$40', period: '/ month', tagline: 'For creators, brands and organizations.',
    perks: ['Gold verified tick', 'Everything in Lune Blue', 'Top placement in search and recommendations', 'Host Spaces with up to 20 speakers', 'Analytics on your posts and followers', 'Priority support'],
    checkoutUrl: import.meta.env.VITE_CHECKOUT_GOLD_URL as string | undefined,
  },
];
