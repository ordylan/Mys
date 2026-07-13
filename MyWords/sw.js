const STATIC_CACHE = 'MyWords_1.8';
const ZIP_CACHE = 'MyWords_Data_1';

const PRECACHE_URLS = [
  './',
  'jszip.min.js',
  'Books/SiJiGaoPin.txt',
  'Books/SiJi.txt',
  'Books/LiuXiaoYanSiJi.txt',
  'Books/LiuJi.txt',
  'manifest.json','darkreader.js',
  'favicon.ico','favicon.png'
];

const NETWORK_ONLY_URL = 'WordsBank.json';

function isWordZip(url) {
  return url.pathname.startsWith('/MyWords/Words/') && url.pathname.endsWith('.zip');
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] 预缓存静态资源');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== ZIP_CACHE)  // 保留 ZIP 缓存
          .map(name => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // WordsBank.json 强制走网络，不缓存
  if (url.pathname.endsWith(NETWORK_ONLY_URL)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isWordZip(url)) {
    event.respondWith(
      caches.match(event.request, { cacheName: ZIP_CACHE }).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(ZIP_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { cacheName: STATIC_CACHE }).then(cached => {
      return cached || fetch(event.request);
    })
  );
});