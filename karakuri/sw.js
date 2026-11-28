// からくりねじ：電波がなくても遊べるように、アプリのファイルを保存する。
const CACHE = 'karakuri-v1';
const FILES = ['./', './index.html', './engine.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png', './privacy.html', './tokushoho.html'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL('./', location.href).pathname)) return;
  // 先に通信で新しいものを取り、だめなら保存したものを使う
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && !u.search) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
