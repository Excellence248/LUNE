#!/usr/bin/env node
/*
 * Copies everything still in Supabase into Neon: account emails (so members reclaim their profile
 * by signing up with the same verified email), notifications, crypto orders, badges, any rows the
 * public key could not see, and every other table as raw rows in legacy_rows. Passwords are never
 * copied; Neon Auth cannot use Supabase's password hashes.
 *
 *   node scripts/import-supabase.mjs          dry run: reads Supabase and reports what would be copied
 *   node scripts/import-supabase.mjs --apply  copies into Neon in one transaction
 *
 * Reads SUPABASE_DB_URL and DATABASE_URL from the environment or .env.local. Supabase is only read,
 * never changed.
 * Safe to run more than once: rows already in Neon are skipped.
 */
import fs from 'node:fs';
import pg from 'pg';
import { Pool, neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = globalThis.WebSocket;
const apply = process.argv.includes('--apply');

const env = {};
for (const file of ['.env', '.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}
// Variables already set in the shell win over the files.
for (const key of ['SUPABASE_DB_URL', 'DATABASE_URL']) if (process.env[key]) env[key] = process.env[key];
if (!env.SUPABASE_DB_URL || !env.DATABASE_URL) {
  console.error('Add SUPABASE_DB_URL (Supabase → Connect → Session pooler URI) and DATABASE_URL to .env.local, then run again.');
  process.exit(1);
}

// Supabase table -> how to insert one of its rows into Neon. Columns Neon does not have are dropped
// from the insert but kept in legacy_rows if the row cannot be inserted.
const TABLES = {
  profiles: { columns: ['id', 'username', 'bio', 'avatar_url', 'wallet_address', 'created_at'], conflict: '(id)' },
  posts: { columns: ['id', 'user_id', 'content', 'image_url', 'created_at', 'post_type', 'repost_content', 'repost_username', 'original_post_id'], conflict: '(id)' },
  replies: { columns: ['id', 'post_id', 'user_id', 'content', 'created_at'], conflict: '(id)' },
  likes: { columns: ['post_id', 'user_id', 'created_at'], conflict: '(post_id, user_id)' },
  reposts: { columns: ['post_id', 'user_id', 'created_at'], conflict: '(post_id, user_id)' },
  follows: { columns: ['follower_id', 'following_id', 'created_at'], conflict: '(follower_id, following_id)' },
  notifications: { columns: ['id', 'user_id', 'actor_id', 'type', 'post_id', 'read', 'created_at'], conflict: '(id)' },
  user_badges: { columns: ['user_id', 'tier', 'expires_at', 'granted_at'], conflict: '(user_id)' },
  crypto_orders: { columns: ['reference', 'user_id', 'tier', 'amount_usdc', 'status', 'signature', 'created_at', 'paid_at'], conflict: '(reference)' },
};
// Parents before children, so foreign keys resolve.
const ORDER = Object.keys(TABLES);

// Same renames as the first import: Neon usernames are 3–64 letters, numbers or underscores.
const RENAMES = { 'Sammy🐳': 'Sammy', 'Excellence@248': 'Excellence_248' };
const fixUsername = name => {
  const fixed = RENAMES[name] ?? String(name).replace(/@/g, '_').replace(/[^A-Za-z0-9_]/g, '').slice(0, 64);
  return fixed.length >= 3 ? fixed : `${fixed}___`.slice(0, 3);
};

const source = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await source.connect();
let neon;
try {
  await source.query('begin read only');
  const tables = (await source.query(`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`)).rows.map(r => r.table_name);
  const rows = {};
  for (const table of tables) {
    rows[table] = (await source.query(`select to_jsonb(t) as row from public.${pg.escapeIdentifier(table)} t`)).rows.map(r => r.row);
  }
  // Only what is needed to reclaim a profile; never password hashes or tokens.
  const users = (await source.query(`select id, email, email_confirmed_at, created_at, last_sign_in_at from auth.users`)).rows;
  await source.query('rollback');

  console.log('Supabase contains:');
  for (const table of tables) console.log(`  ${table.padEnd(18)} ${String(rows[table].length).padStart(6)} rows${TABLES[table] ? '' : '  -> kept as raw rows in legacy_rows'}`);
  console.log(`  ${'auth.users'.padEnd(18)} ${String(users.length).padStart(6)} accounts (emails only)`);
  if (!apply) {
    console.log('\nDry run only: nothing was written. Run again with --apply to copy into Neon.');
    process.exit(0);
  }

  neon = new Pool({ connectionString: env.DATABASE_URL });
  const db = await neon.connect();
  const report = {};
  try {
    await db.query('begin');
    await db.query(`set local lune.importing = 'on'`);
    const keep = async (table, row, note) => {
      // Skip rows saved by an earlier run, so re-running never duplicates them.
      await db.query(`
        insert into public.legacy_rows (source_table, row_data, note) select $1, $2::jsonb, $3
        where not exists (select 1 from public.legacy_rows where source_table = $1 and row_data = $2::jsonb)`, [table, row, note]);
    };

    for (const table of ORDER.filter(t => rows[t])) {
      const { columns, conflict } = TABLES[table];
      const counts = (report[table] = { source: rows[table].length, inserted: 0, already: 0, kept: 0 });
      for (const original of rows[table]) {
        const row = table === 'profiles' ? { ...original, username: fixUsername(original.username), bio: (original.bio ?? '').slice(0, 500), avatar_url: original.avatar_url ?? '' } : original;
        const present = columns.filter(column => row[column] !== undefined);
        await db.query('savepoint r');
        try {
          const result = await db.query(
            `insert into public.${table} (${present.join(', ')}) values (${present.map((_, i) => `$${i + 1}`).join(', ')}) on conflict ${conflict} do nothing`,
            present.map(column => row[column]),
          );
          await db.query('release savepoint r');
          if (result.rowCount) counts.inserted++;
          else counts.already++;
        } catch (error) {
          await db.query('rollback to savepoint r');
          await keep(table, original, `not imported: ${error.message}`);
          counts.kept++;
        }
      }
    }

    for (const table of tables.filter(t => !TABLES[t])) {
      for (const row of rows[table]) await keep(table, row, 'no matching Neon table');
      report[table] = { source: rows[table].length, inserted: 0, already: 0, kept: rows[table].length };
    }

    // Emails let members reclaim their profile; Supabase profile IDs are their auth user IDs.
    const emails = (report['auth.users'] = { source: users.length, inserted: 0, already: 0, kept: 0 });
    for (const user of users) {
      await keep('auth.users', { id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at }, 'account details (no password)');
      if (!user.email) continue;
      const result = await db.query(`
        insert into public.profile_accounts (profile_id, supabase_user_id, legacy_email)
        select p.id, p.id, $2 from public.profiles p where p.id = $1
        on conflict (profile_id) do update set legacy_email = excluded.legacy_email, supabase_user_id = excluded.supabase_user_id
          where profile_accounts.legacy_email is null`, [user.id, user.email]);
      if (result.rowCount) emails.inserted++;
      else emails.already++;
    }

    const mismatched = Object.entries(report).filter(([, c]) => c.inserted + c.already + c.kept !== c.source);
    if (mismatched.length) throw new Error(`row accounting mismatch: ${JSON.stringify(mismatched)}`);
    await db.query('commit');
  } catch (error) {
    await db.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    db.release();
  }

  console.log('\nCopied into Neon (inserted / already there / kept raw in legacy_rows):');
  for (const [table, c] of Object.entries(report)) console.log(`  ${table.padEnd(18)} ${c.inserted} / ${c.already} / ${c.kept}  of ${c.source}`);
  console.log('\nDone. Every Supabase row is now in Neon. Supabase was not changed.');
} catch (error) {
  console.error('\nImport failed, nothing was written to Neon:', error.message);
  process.exitCode = 1;
} finally {
  await source.end().catch(() => undefined);
  await neon?.end().catch(() => undefined);
}
