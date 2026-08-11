/* TaxiAssur emergency cache reset — generated 2026-08-09. */
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') event.respondWith(fetch(event.request));
});
