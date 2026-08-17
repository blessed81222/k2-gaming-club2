STAGE 6 — Guest booking cancellation security

1. Run supabase_guest_cancel_token.sql in Supabase SQL Editor.
2. Replace these files in the project:
   - src/App.tsx
   - server/bookings.mjs
   - api/bookings/index.mjs
   - api/bookings/[id].mjs
3. npm run build
4. npm run dev

Behavior:
- Guest can create booking.
- Guest can cancel only their own booking using a secret cancel token stored in their browser.
- VK user can cancel only their own VK booking.
- No one can cancel another user's booking by UUID alone.
- Existing guest bookings created before this migration do not have a usable cancel token and cannot be self-cancelled by the guest.
