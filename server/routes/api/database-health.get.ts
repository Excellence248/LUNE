import { defineHandler } from 'nitro';
import { createError, setResponseHeader } from 'nitro/h3';
import { sql } from '../../utils/db';

export default defineHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  try {
    await sql`SELECT 1`;
    return { status: 'connected' };
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Database unavailable' });
  }
});
