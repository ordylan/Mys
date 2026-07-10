// sw.js
const CACHE_NAME = 'MyWords_1.1'; 

const PRECACHE_URLS = [
  './',
  'jszip.min.js',
  'Books/SiJiGaoPin.txt',
  'Books/SiJi.txt',
  'Books/LiuXiaoYanSiJi.txt',
  'Books/LiuJi.txt','manifest.json','favicon.ico','favicon.png'
];

const NETWORK_ONLY_URL = 'WordsBank.json';

function isWordZip(url) {
  return url.pathname.startsWith('/MyWords/Words/') && url.pathname.endsWith('.zip');
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 预缓存资源');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
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

  if (url.pathname.endsWith(NETWORK_ONLY_URL)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isWordZip(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
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
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});