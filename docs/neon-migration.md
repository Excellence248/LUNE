# Neon database and migration requirements

## Current implementation status

- The app has a server-only Neon client in `server/utils/db.ts` and a read-only `/api/database-health` route.
- `vite.config.ts` sets Nitro's `serverDir` to `./server`. Nitro 3 defaults it to `false`, which previously left every `server/routes` handler out of dev and the Vercel build (`/api/database-health` returned the SPA page).
- Application authentication, profiles, social queries, storage, and payment functions still use Supabase.
- The database connection works: `DATABASE_URL` reaches Postgres 18, and `/api/database-health` reports `connected` in dev. Neon Auth's `neon_auth` schema is provisioned with no users.
- `neon/migrations/20261110_initial_schema.sql` was **applied on 2026-11-10**. All 11 tables below exist and are empty. Constraint, notification-trigger, index and cascade tests passed against the live tables inside a rolled-back transaction.
- No Supabase export or media backup has been supplied. Do not remove Supabase data or switch existing members to an empty database.

Make further schema changes as new files in `neon/migrations/`. Usernames are unique case-insensitively (`lower(username)`); resolve legacy case-duplicates before import.

## Required tables and constraints

| Table | Required data and integrity |
| --- | --- |
| `profiles` | UUID primary key compatible with existing IDs; unique username; 3–64 letters/numbers/underscores; bio up to 500 characters; avatar URL or existing avatar data; nullable unique Solana wallet address; creation/update timestamps. No email in public profile responses. |
| `profile_accounts` | Private mapping between a profile UUID, verified Neon Auth user ID, and legacy Supabase user ID. Each identity must map to only one profile. Establish links using verified account ownership, never client-supplied IDs or matching email alone. |
| `profile_preferences` | One row per profile; interests; onboarding completion and checklist state. The current app stores these in browser local storage; they must be connected to authenticated server APIs during cutover. |
| `posts` | UUID primary key; author foreign key; content up to 2,000 characters; optional image URL; nonempty content or image; creation timestamp. Preserve any legacy repost columns found in the export. |
| `replies` | UUID primary key; post/author foreign keys; nonempty content up to 1,000 characters; creation timestamp. |
| `likes` | Post/profile foreign keys; unique pair so a member can like a post only once; creation timestamp. |
| `reposts` | Post/profile foreign keys; unique pair so a member can repost a post only once; creation timestamp. |
| `follows` | Follower/following foreign keys; unique pair; prohibit following oneself; creation timestamp. |
| `notifications` | UUID primary key; recipient/actor foreign keys; type limited to like/repost/reply/follow; appropriate post reference; read flag; creation timestamp. Suppress self-notifications and generate events server-side. |
| `user_badges` | One row per profile; blue/gold tier; nullable expiry for non-expiring grants; granted timestamp. Only trusted server code may grant badges. |
| `crypto_orders` | Unique Solana payment reference; profile foreign key; blue/gold tier; positive exact numeric USDC amount; pending/paid state; unique transaction signature; creation/payment timestamps. Paid state requires a verified signature and paid timestamp. |

Use stable UUIDs and an explicit account mapping so imported social/payment foreign keys remain intact. Resolve legacy duplicate or invalid values before adding stricter constraints; do not silently rewrite or discard accounts.

### Query indexes

- Feed: posts `(created_at DESC, id DESC)`.
- Profile activity: posts `(user_id, created_at DESC, id DESC)`.
- Replies: `(post_id, created_at, id)` and author foreign key.
- Likes/reposts: unique `(post_id, user_id)` plus indexes beginning with `user_id` for member activity.
- Follows: unique `(follower_id, following_id)` plus reverse following index.
- Notifications: `(user_id, created_at DESC, id DESC)` and partial unread index for `read = false`.
- Orders: `(user_id, created_at DESC)` and pending-order reconciliation index.
- Usernames: enforce uniqueness with a policy consistent with legacy data and the public lookup API. Decide case sensitivity explicitly before import.

## Authorization and auth

The app uses a plain server-side `DATABASE_URL`. That connection does not carry a member's JWT identity. Do not rely on `auth.user_id()` RLS for this connection.

Before exposing any data API:

1. Integrate managed Neon Auth using the same-origin server proxy and verified server sessions.
2. Resolve the session's auth identity to its profile through the private account mapping.
3. Enforce ownership and recipient filtering in server code and SQL for every write and private read.
4. Return only public profile fields to guests. Keep identity mappings, preferences, notification inboxes, and order details private.
5. Keep SQL credentials server-only and use parameterized queries.
6. Verify Neon Auth's supported Solana wallet sign-in or account-linking capabilities. Do not replace the existing wallet flow with homegrown authentication.
7. Verify email verification, callback, and password recovery configuration and test them before switching sign-in pages.

## Supabase backup and import

Required secure source material:

- Database schema including constraints, indexes, functions, and triggers.
- Rows for profiles, posts, replies, likes, reposts, follows, notifications, badges, and crypto orders.
- Auth account export and provider/identity information through an authorized migration path.
- Storage inventory and actual avatar/feed-media files, including object paths and content types.

Do not paste passwords, service-role keys, password hashes, or sensitive account exports into chat. Use an authorized integration or secure transfer. The app's public Supabase key cannot provide a complete backup of private tables, Auth users, or storage.

Import parents before children, preserve IDs, compare source and destination row counts, and check orphaned foreign keys. Confirm the actual exported schema before making irreversible assumptions about legacy records.

## Application cutover requirements

- Connect SessionContext, profile creation, profile editing, welcome username availability, interests, and onboarding persistence to authenticated Neon server APIs.
- Replace Supabase social queries, notification queries, public profile reads, search, and profile activity with matching APIs. Preserve guest reads and owner-only writes.
- Replace Supabase Realtime with a supported live-update mechanism or deliberate polling; do not display a live status for a disconnected stream.
- Select media/object storage, migrate files, and enforce upload ownership, image type, and size limits. Neon database tables are not a substitute for object storage.
- Move payment functions server-side, verify the treasury/mint/network/amount/reference and successful chain transaction, and atomically claim the signature, mark the order paid, and grant the badge. Repeated confirmations must not extend a subscription repeatedly. Configure treasury and RPC credentials server-side.
- Add reconciliation for sent payments that are not confirmed before the browser closes.
- Validate sign-up, sign-in, verification, recovery, profile ownership, guest reads, posting, uploads, reactions, follows, notifications, and duplicate-payment handling.
- Maintain a rollback path and retain the Supabase source until the migrated data and application have been verified.

## Live database verification

Done on 2026-11-10, against the live tables in a rolled-back transaction:

- Every table, constraint, index, trigger and function was inspected with live schema queries.
- Duplicate usernames (any case), wallets, reactions, follows and identity links; self-follows; self-notifications; oversized or empty text; invalid payment states; and reused transaction signatures are all rejected.
- Notification triggers fire for likes, reposts, replies and follows, skip self-activity, and stay off while `lune.importing` is `on`.
- The feed, inbox and unread-count queries use their indexes, and deleting a profile cascades its activity.

Still required:

- Owner and recipient filters in the server APIs, once they exist.
- Orphaned-reference checks, source-to-destination row counts, and media availability after import.
