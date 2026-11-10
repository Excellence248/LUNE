# Lune on Neon

Supabase has been removed. The app, its data, its sign-in and its payments run on Neon plus this
site's own server routes (Nitro, deployed to Vercel). The browser only ever calls this site's `/api`.

## Status (2026-11-10)

- **Schema:** every file in `neon/migrations/` has been applied, in this order: `initial_schema`, `profile_stats_and_roles`, `app_cutover`, `api_functions`, `legacy_rows`, `safety`. Each was tested against the live database inside a rolled-back transaction first. Add changes as new files; never edit an applied one.
- **Data copied from Supabase:** everything the public key could read: 2 profiles, 5 posts, 5 likes, 1 repost, 2 follows (and 0 replies). Row counts matched. The usernames `Sammy🐳` and `Excellence@248` became `Sammy` and `Excellence_248`, because Neon allows only letters, numbers and underscores. Profile IDs are unchanged.
- **Not yet copied:** rows the public key cannot see: notifications, crypto orders, the unused `messages` table, and the account emails in Supabase Auth. Run the importer below to copy them. Passwords cannot be moved, so everyone sets a new one.
- **Code:** `@supabase/*` packages, the Supabase client, the `supabase/` folder (migrations and the `crypto-payments` edge function, now `/api/payments`) and the `VITE_SUPABASE_*` variables are gone.

## Copying the rest of Supabase

1. In Supabase: **Connect → Connection string → Session pooler**. Copy the URI and fill in the database password.
2. Add it to `.env.local` on its own line: `SUPABASE_DB_URL="postgresql://…"`. Never commit it or paste it into chat.
3. Run a dry run, which only reads: `node scripts/import-supabase.mjs`
4. Copy: `node scripts/import-supabase.mjs --apply`

The importer only reads Supabase and writes Neon in one transaction. Re-running is safe: rows already in Neon are skipped. Rows Neon's rules reject (a self-follow, an unknown notification type) and tables with no Neon equivalent (`messages`) go into the private `legacy_rows` table, so nothing is lost. From `auth.users` it copies only the ID, email and dates, never password hashes. It was tested end to end against a Supabase-shaped copy; it has not yet run against the real Supabase.

Once it has run, each member's old email is stored privately with their profile. **Signing up with the same email and confirming it brings back their old profile**: username, posts, followers and, for the two founders, the admin role.

## Deploying on Vercel

Set these server-only environment variables in the Vercel project, then remove the old `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`:

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Everything (Neon connection string) |
| `NEON_AUTH_BASE_URL` | Email sign-in (from the Neon Console, Auth) |
| `SESSION_SECRET` | Optional. Signs wallet sessions; defaults to a key derived from `DATABASE_URL`, so changing the database password signs wallet users out |
| `TREASURY_ADDRESS` | Selling Lune Blue/Gold. Without it `/api/payments` answers "not configured" |
| `SOLANA_RPC_URL`, `USDC_MINT` | Optional payment overrides (default: public mainnet RPC, mainnet USDC) |

In the Neon Console, under Auth, add the site's domains as trusted domains. Confirmation and password-reset emails redirect back to `/auth/callback` and `/reset-password` on this site, and Neon Auth may refuse addresses it doesn't trust.

## How it fits together

- **Sign-in.** Email accounts are Neon Auth, reached through the same-origin proxy at `/api/auth/*`, so the session cookie is first-party. Wallet sign-in: the wallet signs a one-time message from `/api/wallet/nonce` (no transaction, no funds), `/api/wallet/verify` checks the ed25519 signature and sets an HMAC-signed httpOnly cookie, and used nonces are stored so a signature cannot be replayed. `server/utils/auth.ts` resolves either kind of session into a profile, creating it on first sign-in.
- **Data.** `/api/posts`, `/api/profiles`, `/api/follows`, `/api/notifications`, `/api/me` and friends. Posts are returned in the shape the UI already used (`post_json`), with likes, reposts and replies embedded. Writes check a permission (`post.create`, `post.react`, `reply.create`, `profile.follow`, `profile.edit_own`) with `has_permission`.
- **Live updates.** Neon has no change stream, so the feed polls every 15 seconds and notifications every 20.
- **Images.** Uploads go to the `media` table (JPG/PNG/WebP/GIF, checked by content, max 4 MB because Vercel caps request bodies at 4.5 MB) and are served from `/api/media/:id`. Inline avatars from Supabase are served from `/api/avatars/:id` so feeds stay small. Both are cached forever and served with a sandboxing CSP.
- **Spaces.** WebRTC audio is unchanged, but connection messages travel through `/api/spaces/:id/poll` and `/send` about once a second instead of Supabase Realtime. The server stamps who sent each message and allows one host per space, so neither can be faked.
- **Payments.** `/api/payments` checks the transaction on-chain, then `confirm_crypto_order` marks the order paid and extends the badge in one transaction. A transaction signature can pay for only one order.
- **Notifications** are created by database triggers on likes, reposts, replies and follows, and never for your own activity.

## Member safety

- **Delete:** members delete their own posts and replies from the ⋯ menu (`DELETE /api/posts/:id`, `DELETE /api/replies/:id`), and their whole account from their profile page (`POST /api/me/delete`, confirmed by typing their username). Account deletion removes the profile, everything in it, and the Neon Auth sign-in. Reports and admin history about them are kept. Admin accounts can only be removed by the database owner.
- **Report:** posts, replies and accounts can be reported with a reason (`POST /api/reports`), at most one open report per member per target. Admins work through them in the panel's **Reports** tab: remove the content, suspend the member, resolve or dismiss. Removing content closes its open reports, and every decision goes in the audit log.
- **Block:** blocking (`POST /api/blocks/:id`) hides the blocked member's posts and replies from you and ends follows both ways. Database triggers stop either member from following, replying to, liking or reposting the other. Blocking still works while suspended.
- **Rate limits** (`server/utils/limits.ts`, counted in `rate_limits`): per member, 10 posts and 30 replies per 10 minutes, 120 likes or reposts, 60 follows, 20 reports and 20 image uploads per hour. Per IP: 5 sign-ups and 5 auth emails per hour, 20 sign-in attempts per 10 minutes. Over the limit, the API answers 429.
- **Images:** each member may store up to 100 MB. Uploaded images that never end up in a post or avatar are deleted after a day.
- **Crashes:** an error boundary (`src/components/ErrorBoundary.tsx`) shows a "Something went wrong — Reload" screen instead of a blank page, for both the app and the admin panel.

## Profile stats

`profile_stats` computes followers, following, posts, replies, reposts, likes given, likes received and reposts received from the source tables, so they never drift. `GET /api/profiles/:username` returns them, and both profile pages show Following, Followers, Posts, Likes and Reposts.

## Roles and the admin panel

- **Members** (every profile) may edit their own profile, post, reply, like, repost, follow, and delete their own posts and replies.
- **Admins** also get the admin panel at `/admin`: remove any post or reply, suspend and reinstate members, grant and revoke badges, and read the audit log.
- A suspended member can still sign in and read but loses every permission. Database triggers also block their posts, replies, likes, reposts and follows. Admins cannot be suspended.
- Roles live in `profile_roles` and change only through SQL run by the database owner; no API or screen grants them. The two founding admins are `Excellence_248` and `Sammy`, keyed by their profile IDs.
- Every admin action goes through an `admin_*` SQL function that re-checks the permission and writes `admin_actions`, an append-only audit log. Removed posts and replies are copied into it.
- The panel is a separate React tree in its own chunk (`src/admin/`), loaded only on `/admin`.

**Getting into the admin panel:** after running the importer, open `/admin`, choose **First time? Create your sign-in** with the same email as your old Supabase account, confirm the email, and sign in. Your old profile, with its admin role, comes back automatically. If you can't use the old email, link a new sign-in by hand in the Neon SQL editor. This deletes the empty profile the new sign-in created:

```sql
begin;
delete from public.profiles p using public.profile_accounts a, neon_auth."user" u
  where a.profile_id = p.id and a.neon_auth_user_id = u.id and lower(u.email) = lower('<new email>')
    and p.id <> '2b4a3834-f524-4458-9066-500d638069de';
update public.profile_accounts set neon_auth_user_id = (select id from neon_auth."user" where lower(email) = lower('<new email>'))
  where profile_id = '2b4a3834-f524-4458-9066-500d638069de';
commit;
```

(Use `cfaa2613-87d9-4327-aee5-71720ca9e138` for Sammy.)

## Verified, and not yet verified

Verified against the live database, the dev server and the production build: every migration's constraints and triggers; every API route, including wallet sign-in with a real ed25519 signature, rejection of bad and replayed signatures, posting with an uploaded image, likes, reposts, replies, follows, notifications, profile edits, Spaces hosting and messages, and sign-out; and in the browser, the feed, onboarding, follow, like, both profile pages with stats, and the admin panel turning away a non-admin. All test accounts and rows were deleted afterwards.

Not yet verified: a real Neon Auth email sign-up, sign-in, confirmation email and password reset (they need a real inbox), a real browser wallet extension, two people talking in a Space, a real USDC payment, and the importer against the real Supabase.
