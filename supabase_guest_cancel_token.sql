-- Stage 6: secure guest booking cancellation
-- Run once in Supabase SQL Editor.

alter table public.bookings
  add column if not exists cancel_token text;

create unique index if not exists bookings_cancel_token_uidx
  on public.bookings (cancel_token)
  where cancel_token is not null;
