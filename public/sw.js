// Lune service worker: shows notifications when the app is closed, and opens the right page when tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Lune', body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    // The app already shows it when someone is looking at it.
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (open.some(client => client.visibilityState === 'visible' && client.focused)) return;
    await self.registration.showNotification(data.title || 'Lune', {
      body: data.body || '',
      icon: '/lune-mascot.jpg',
      badge: '/lune-mascot.jpg',
      tag: data.tag,
      renotify: !!data.tag,
      requireInteraction: !!data.urgent,
      data: { url: data.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of open) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) { try { await client.navigate(url); } catch { /* cross-scope */ } }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
