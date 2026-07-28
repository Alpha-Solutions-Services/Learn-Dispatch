# Alpha Portal

Client and admin portal for [Alpha Solutions](https://www.alphasolutions.software).

- **Production:** https://portal.alphasolutions.software
- **Repo:** https://github.com/Alpha-Solutions-Services/ALPHA-Portal
- Shares the same Supabase + Sanity project as the marketing site.
- Does **not** include Alpha Freight.

## Setup

1. Copy `.env.example` → `.env.local` and fill values (same Supabase/Sanity/SMTP as the main site + `GROQ_API_KEY`).
2. Run SQL in Supabase:
   - `supabase/schema-admin-portal.sql` (if tables missing)
   - `supabase/portal-chat-ai.sql` (DM attachments, AI tables, storage)
3. Add Auth redirect URL: `https://portal.alphasolutions.software/auth/callback` (and localhost).
4. Allow portal origin in Sanity CORS.
5. `npm install && npm run dev` (port 3001).

## Deploy

Connect this folder to the `ALPHA-Portal` GitHub repo and deploy to Vercel/Netlify with domain `portal.alphasolutions.software`.
