-- Raw copies of Supabase rows that have no Neon table (for example the unused `messages` table) or
-- that break a Neon constraint, so nothing from Supabase is lost. Private: no API reads it.
-- Filled by scripts/import-supabase.mjs. Run after 20261110_api_functions.sql.

begin;

create table public.legacy_rows (
  id bigint generated always as identity primary key,
  source_table text not null,
  row_data jsonb not null,
  note text,
  imported_at timestamptz not null default now()
);
create index legacy_rows_table_idx on public.legacy_rows (source_table);

commit;
