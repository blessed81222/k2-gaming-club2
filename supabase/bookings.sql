create table if not exists public.bookings (
  id uuid primary key,
  computer_id integer not null,
  zone text not null,
  client_name text not null,
  phone text not null,
  booking_date date not null,
  booking_time time without time zone not null,
  duration_hours integer not null check (duration_hours > 0),
  price numeric(12,2) not null check (price >= 0),
  package_type text not null,
  vk_user_id text,
  gizmo_reservation_id bigint,
  gizmo_sync_status text not null default 'disabled',
  gizmo_sync_error text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint bookings_time_order check (end_at > start_at)
);
create index if not exists bookings_date_idx on public.bookings (booking_date);
create index if not exists bookings_computer_time_idx on public.bookings (computer_id, start_at, end_at);
create index if not exists bookings_vk_user_idx on public.bookings (vk_user_id);
create index if not exists bookings_gizmo_reservation_idx on public.bookings (gizmo_reservation_id) where gizmo_reservation_id is not null;
alter table public.bookings enable row level security;
revoke all on table public.bookings from anon, authenticated;
grant all on table public.bookings to service_role;
