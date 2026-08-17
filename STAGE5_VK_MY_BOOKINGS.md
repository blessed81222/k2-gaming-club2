# K2 Stage 5 — VK-linked My Bookings

What this stage adds:
- Persists the VK user in localStorage for UI continuity.
- Loads “Мои брони” from `/api/bookings?mine=true&vkUserId=...`.
- Stores `vk_user_id` on newly created bookings (already supported by Stage 4 POST path).
- Requires the same VK user ID when cancelling a booking.
- Server checks ownership before deleting a booking.

Important: this is MVP-level identity binding because the client sends the VK user ID. For production-grade auth, replace this with a server-verified VK session/token before launch.
