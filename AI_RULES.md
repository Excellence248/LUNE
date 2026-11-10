# Tech Stack

- React with TypeScript and React Router. Keep routes in src/App.tsx.
- Put browser source in src/, pages in src/pages/, and components in src/components/.
- The default page is src/pages/Index.tsx; include new main-page components there.
- Use shadcn/ui and Tailwind CSS; lucide-react and Radix UI are installed.

# Server and Neon

- Nitro's Vite plugin runs before React and the component tagger; use node-server in development and the Vercel preset for builds. Vite 8 supports the installed Nitro plugin.
- Server routes live in server/routes/; .get.ts restricts a route to GET. Keep serverDir: "./server" in the Nitro plugin options; without it Nitro 3 scans no server routes.
- The Neon schema lives in neon/migrations/. Add new migrations there instead of editing an applied one.
- Import defineHandler from nitro and h3 utilities from nitro/h3 explicitly.
- Reuse server/utils/db.ts for Neon queries and import sql explicitly in handlers.
- DATABASE_URL and NEON_AUTH_BASE_URL remain server-only. Never import server modules or @neondatabase/serverless into src/.
- /api/database-health is a public read-only connection probe; it exposes no records or credentials.
- Neon is connected but application profiles/social/auth/payment flows still use Supabase. Do not treat the migration as complete or delete existing data.

# Accounts

- SessionContextProvider owns Supabase sessions and personal profiles; WalletProvider adds optional wallet sign-in.
- Email/password signup and login use /signup and /signin. Email callbacks use /auth/callback; password recovery uses /reset-password.
- Profiles are created automatically at signup and restored with ensure_user_profile. wallet_address is nullable; email addresses stay out of public profiles.
- Authenticated email and wallet accounts can use the social feed. Keep owner-only RLS and storage-folder ownership; do not reinstate wallet-only social permissions.
- The feed, posts, and public profiles remain readable by guests. Personal profiles and notifications require authentication.
