const CACHE_NAME = 'MyKps-newooaaa-v';
const urlsToCache = [
  '/MyKPs/',
  //'/MyKPs/weekly-report.html',
  '/MyKPs/manifest.json',
  '/MyKPs/MyKPs.ico',
  //'/MyKPs/html2canvas.min.js',
  '/MyKPs/ToDos.php',
  '/MyKPs/daily-plans.js',
  '/MyKPs/landscape.js',
  '/MyKPs/WR-test/weekly-report.css',
  '/MyKPs/WR-test/',
  '/MyKPs/WR-test/weekly-report.js',
  '/MyKPs/WR-test/chart.js',
  '/MyKPs/?kps=1',
  '/MyKPs/MyKPs.png',
  '/MyKPs/NNTT.php',
  '/MyKPs/dailyactivity/',
  '/MyKPs/landscape.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Pre-cache failed:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('MyKps-') && cacheName !== CACHE_NAME) {
            console.log('删除旧 MyKps 缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isApiRequest = url.pathname.startsWith('/MyKPs/api/');
  const isGetRequest = event.request.method === 'GET';

  if (isApiRequest || !isGetRequest) {
    const request = isApiRequest ? new Request(event.request, { cache: 'no-store' }) : event.request;
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(error => {
        console.error('Fetch failed for:', event.request.url, error);
        if (event.request.mode === 'navigate') {
          return caches.match('/MyKPs/ToDos.php');
        }
        return new Response('Offline: Resource not available', { status: 503 });
      });
    })
  );
});

/* Deprecated notifications: kept commented out for reference.
self.addEventListener('push', event => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data = {
      title: 'MyKPs',
      body: event.data ? event.data.text() : 'New Reminder'
    };
  }
  const title = data.title || 'Task Reminder';
  const options = {
    body: data.body || 'You have a new reminder.',
    icon: '/MyKPs/MyKPs.png',
    badge: '/MyKPs/MyKPs.png',
    data: data.url || '/MyKPs/',
    tag: data.tag || 'default-tag'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data || '/MyKPs/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
*/