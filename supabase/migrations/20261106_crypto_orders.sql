-- Crypto (USDC on Solana) premium orders. Run once in the Supabase SQL editor,
-- after 20261106_user_badges.sql.
create table if not exists public.crypto_orders (
  reference text primary key,                 -- one-time public key the buyer includes in the payment
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('blue', 'gold')),
  amount_usdc numeric not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  signature text unique,                      -- a transaction can only ever pay for one order
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Only the server (service-role key) touches this table: RLS on, no policies.
alter table public.crypto_orders enable row level security;
