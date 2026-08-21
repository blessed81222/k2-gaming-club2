-- Run once in Supabase SQL Editor before enabling Gizmo credentials.
alter table public.bookings
  add column if not exists gizmo_reservation_id bigint,
  add column if not exists gizmo_sync_status text not null default 'disabled',
  add column if not exists gizmo_sync_error text;

create index if not exists bookings_gizmo_reservation_idx
  on public.bookings (gizmo_reservation_id)
  where gizmo_reservation_id is not null;
