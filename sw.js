/* Hors connexion : tous les fichiers de l'application sont mis en cache à l'installation. */
const VERSION = 'correcteur-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'jszip.min.js', 'nspell.js', 'spell-worker.js', 'fr.aff', 'fr.dic', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k.startsWith('correcteur-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.open('correcteur-fonts').then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch { return new Response('', { status:504 }); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch:true }).then(hit => hit || fetch(req).catch(() => caches.match('index.html'))));
});
