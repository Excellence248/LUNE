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
- The app runs entirely on Neon; Supabase has been removed. Never add @supabase/* packages or Supabase calls back.
- Browser code talks only to this site's /api through src/lib/api.ts. Server routes read the caller with getViewer/requireViewer/requirePermission from server/utils/auth.ts and never trust IDs sent by the client.
- Protect Neon routes with requirePermission(event, permission) from server/utils/auth.ts. Admin writes go through the admin_* SQL functions, which re-check permissions and write the append-only admin_actions log.
- Roles change only by SQL run by the database owner. Never add an API or UI that grants roles, and never accept a client-supplied profile ID on signup.
- The admin panel is src/admin/, mounted by src/main.tsx on /admin as a separate React tree. Never import src/admin from the member app.

# Accounts

- SessionContextProvider loads the session and profile from GET /api/me; WalletProvider adds Solana wallet sign-in.
- Email accounts are Neon Auth, reached through the same-origin proxy at /api/auth/*. Signup and login use /signup and /signin; email confirmation lands on /auth/callback; password reset uses /forgot-password then /reset-password?token=….
- Wallet sign-in signs a one-time server message (no transaction) and gets an HMAC-signed httpOnly cookie (server/utils/wallet.ts). Never build wallet auth that skips the server signature check.
- The server creates a profile on first sign-in (ensure_email_profile / ensure_wallet_profile). A verified email matching a legacy Supabase account reclaims that profile. wallet_address is nullable; email addresses stay out of public profiles.
- Members need the matching permission (post.create, post.react, reply.create, profile.follow, profile.edit_own) for every write; suspended members have none.
- The feed, posts, and public profiles remain readable by guests. Personal profiles and notifications require authentication.
- Images are stored in Neon (media table, max 4 MB, served from /api/media/:id); inline avatars are served from /api/avatars/:id.
- Every new write route calls rateLimit() from server/utils/limits.ts (add a LIMITS entry). Blocks are enforced by database triggers; map their 42501 errors to 403.
- Open dialogs from dropdown menus only with <DropdownMenu modal={false}>; a modal menu leaves the page unclickable after the dialog closes.
