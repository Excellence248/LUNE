import { defineHandler } from 'nitro';
import { pushConfigured, pushPublicKey } from '../../../utils/push';

// The public key a browser needs to subscribe. { enabled: false } until the server has its keys.
export default defineHandler((event) => {
  event.res.headers.set('Cache-Control', 'public, max-age=3600');
  return pushConfigured() ? { enabled: true, key: pushPublicKey() } : { enabled: false, key: '' };
});
