/** Monthly prices in USDC. Keep in step with PLANS in src/lib/badges.ts, which is only for display. */
export const PRICES_USDC: Record<string, number> = { blue: 5, gold: 40 };

/** Taken off a member's first payment (any plan). */
export const FIRST_PAYMENT_DISCOUNT = 0.1;

const cents = (value: number) => Math.round(value * 100) / 100;

/** What a member owes for `tier` in USDC, or undefined for an unknown tier. */
export const priceFor = (tier: string, firstPayment: boolean) => {
  const list = PRICES_USDC[tier];
  return list === undefined ? undefined : cents(firstPayment ? list * (1 - FIRST_PAYMENT_DISCOUNT) : list);
};

/**
 * What a pending order must be paid with when it is confirmed. An order made at the first-payment
 * discount keeps it only while the member still has no paid order: two discounted orders cannot both
 * be paid at the discount.
 */
export const amountDue = (tier: string, orderAmount: number, hasOtherPaidOrder: boolean) =>
  hasOtherPaidOrder ? (PRICES_USDC[tier] ?? orderAmount) : orderAmount;
