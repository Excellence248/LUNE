import { defineHandler } from 'nitro';
import { ageStatus } from '../../utils/age';
import { getViewer } from '../../utils/auth';

// The signed-in account and its profile, or { account: null } for guests. ageStatus says whether the
// member still has to confirm a date of birth ('required'), may use Lune ('ok') or is too young ('underage').
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const viewer = await getViewer(event);
  if (!viewer) return { account: null, profile: null, ageStatus: null };
  return {
    account: { kind: viewer.kind, email: viewer.email, emailVerified: viewer.emailVerified },
    profile: viewer.profile,
    ageStatus: await ageStatus(viewer.profile.id),
  };
});
