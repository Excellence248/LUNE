import { defineHandler } from 'nitro';
import { getViewer } from '../../utils/auth';

// The signed-in account and its profile, or { account: null } for guests.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const viewer = await getViewer(event);
  if (!viewer) return { account: null, profile: null };
  return { account: { kind: viewer.kind, email: viewer.email, emailVerified: viewer.emailVerified }, profile: viewer.profile };
});
