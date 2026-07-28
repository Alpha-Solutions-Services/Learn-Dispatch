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
   - `CRON_SECRET` — generate with `openssl rand -hex 32` (Vercel Cron sends this as Bearer)
   - `R2_*` — Cloudflare R2 for private lesson videos (see below)
   - `SMTP_*` (optional welcome emails)
4. Add domain `learndispatch.alphasolutions.software`
5. `vercel.json` schedules `/api/cron/expire-enrollments` daily at 03:00 UTC

### Where to find keys

| Variable | Where |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (**server only**, never `NEXT_PUBLIC_`) |
| `CRON_SECRET` | You create it: `openssl rand -hex 32` → paste into Vercel env |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → right sidebar Account ID |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → Manage R2 API Tokens → Create |
| `R2_BUCKET_NAME` | Your private R2 bucket name (create bucket, keep public access off) |

### Manual cron test

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://learndispatch.alphasolutions.software/api/cron/expire-enrollments
```

## Supabase Auth redirect URLs

- `https://learndispatch.alphasolutions.software/auth/callback`
- `http://localhost:3003/auth/callback`

## Staff verification

Sign in at `/login?role=instructor` with an email in `ADMIN_EMAILS`, or as instructor/dispatcher → `/admin/enrollments`.

Accept payment after confirming NayaPay transfer to unlock `/student/dashboard`.

## Lesson videos (R2)

1. Create a **private** R2 bucket (no public access).
2. Upload `module-1.mp4` etc.
3. In Supabase Table Editor → `academy_modules`:
   - `video_provider` = `r2`
   - `video_url` = object key only, e.g. `module-1.mp4` (not a public URL)
4. Students fetch a **10-minute signed URL** via `/api/modules/[id]/video` only if `enrollment_status=paid` and `paid_until` is still valid.

Optional interim: set `video_provider` = `youtube_unlisted` and paste an unlisted YouTube URL into `video_url`.

## Quiz questions (Table Editor)

Table: `quiz_questions`

| Column | Example |
|---|---|
| `module_id` | UUID from `academy_modules` |
| `question` | `What does a dispatcher confirm first?` |
| `options` | `["Rate","Pickup time","Both","Neither"]` (jsonb array) |
| `correct_index` | `2` (0-based) |
| `order_index` | `0`, `1`, `2`… |

Students never read `correct_index` from the client; grading is server-side at `/api/quizzes/submit` (pass ≥ 70%).
