# K2 Stage 4 — shared bookings

1. Create a Supabase project.
2. Run `supabase/bookings.sql` in SQL Editor.
3. Put the Project URL and service role key into local `.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

4. Add the same two variables to Vercel Production Environment Variables.
5. Keep `.env` out of Git.

Local:
```cmd
npm install
npm run dev
npm run server
```

Deploy:
```cmd
git add .
git commit -m "Move bookings to shared database"
git push origin main
```

This stage adds shared booking reads/creates/deletes, server-side conflict checks, 10-second polling, and an `до HH:MM` label on blocked PCs.
`Мои брони` remains local for now; the next stage will bind it to VK ID.
