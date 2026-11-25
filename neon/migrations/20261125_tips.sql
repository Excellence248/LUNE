-- USDC tips on posts. A tip goes straight from the tipper's Solana wallet to the author's verified
-- wallet; Lune never holds the money. Each tip has a unique reference (made by the server) that the
-- transfer carries, so the server can find it on-chain and confirm it before it counts. Additive.

begin;

create table public.tips (
  reference text primary key check (reference ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  post_id uuid references public.posts(id) on delete set null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  -- The author's wallet when the tip was started: the money is checked against this exact address.
  recipient_wallet text not null check (recipient_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  amount_usdc numeric(12, 2) not null check (amount_usdc >= 0.1 and amount_usdc <= 1000),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  -- One on-chain transaction can confirm only one tip.
  signature text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check (sender_id <> recipient_id),
  check ((status = 'paid') = (signature is not null and paid_at is not null))
);
create index tips_post_paid on public.tips (post_id) where status = 'paid';
create index tips_recipient_paid on public.tips (recipient_id, paid_at desc) where status = 'paid';
create index tips_sender_recent on public.tips (sender_id, created_at desc);

-- Marks a pending tip paid once the server has checked the transaction. Returns the tip, or nothing if it
-- was already paid (a parallel confirm got there first).
create function public.confirm_tip(ref text, sender uuid, sig text) returns public.tips language plpgsql as $$
declare
  t public.tips;
begin
  update public.tips set status = 'paid', signature = sig, paid_at = now()
  where reference = ref and sender_id = sender and status = 'pending'
  returning * into t;
  return t;
end;
$$;

commit;
