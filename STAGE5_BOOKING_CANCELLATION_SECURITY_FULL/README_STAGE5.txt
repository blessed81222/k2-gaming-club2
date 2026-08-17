# STAGE 5 — Shared Bookings + VK ownership + secure cancellation

Replace these files in the project:

- `src/App.tsx`
- `api/bookings/index.mjs`
- `api/bookings/[id].mjs`
- `server/bookings.mjs`

`server/supabase.mjs` stays as your existing Supabase client.

Important behavior:
- Guests can create bookings (`vkUserId = null`).
- VK users create bookings tied to their VK ID.
- The map is shared across browsers.
- “My bookings” is filtered by VK ID.
- Only the VK owner can cancel a VK-owned booking.
- Guest-owned bookings are not cancellable through this public endpoint.
- Shared booking polling uses `cache: "no-store"`.
