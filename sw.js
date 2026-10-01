// Lets Dusk be installed as an app (Add to Home Screen). It never caches
// the game, so a deploy is always picked up; it only answers with a short
// note when there's no connection at all.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dusk</title>' +
    '<body style="background:#202022;color:#d8d2c0;font:18px Georgia,serif;display:grid;place-items:center;height:100vh;margin:0;text-align:center">' +
    '<p>You\'re offline.<br>Dusk needs a connection to play.<br><br><a style="color:#e8d391" href="">Try again</a></p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
