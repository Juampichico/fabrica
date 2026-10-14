// Permite abrir la app sin conexión: primero intenta internet, si no hay usa lo último guardado.
const CACHE = 'fabrica-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  // Borra copias de versiones viejas y toma el control enseguida
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    // 'no-cache': siempre pregunta si hay versión nueva (si no, el celular usaba una copia de hasta 10 minutos)
    fetch(e.request.url, { cache: 'no-cache' })
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
