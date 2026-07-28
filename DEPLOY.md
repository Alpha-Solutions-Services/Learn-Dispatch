# Deploy — Learn Dispatch

**Subdomain:** `learndispatch.alphasolutions.software`  
**Repo:** [Alpha-Solutions-Services/Learn-Dispatch](https://github.com/Alpha-Solutions-Services/Learn-Dispatch)  
**Local port:** `3003`

## Payment (manual — for now)

- **NayaPay:** `03217112944`
- **Monthly:** PKR 20,000
- **2-month bundle:** PKR 34,000
- Students tap **I have paid** after transfer; staff verify at `/admin/enrollments`

## Vercel

1. Push `LEARN-DISPATCH/` to GitHub
2. Import project on Vercel (Next.js, root `.`)
3. Env vars (same Supabase as Portal/TMS):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_LEARN_DISPATCH_URL=https://learndispatch.alphasolutions.software`
   - `ADMIN_EMAILS` (team who can verify payments)
   - `SMTP_*` (optional welcome emails)
4. Add domain `learndispatch.alphasolutions.software`

## Supabase Auth redirect URLs

- `https://learndispatch.alphasolutions.software/auth/callback`
- `http://localhost:3003/auth/callback`

## Staff verification

Sign in at `/login?role=admin` with an email in `ADMIN_EMAILS`, or as instructor/dispatcher → `/admin/enrollments`.

Accept payment after confirming NayaPay transfer to unlock `/student/dashboard`.
