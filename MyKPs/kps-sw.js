const CACHE_NAME = 'MyKps-newooo';
const urlsToCache = [
  '/MyKPs/',
  '/MyKPs/weekly-report.html',
  '/MyKPs/manifest.json',
  '/MyKPs/MyKPs.ico',
  '/MyKPs/html2canvas.min.js',
  '/MyKPs/ToDos.php',
  '/MyKPs/daily-plans.js',
  '/MyKPs/landscape.js',
  '/MyKPs/WR-test/weekly-report.css',
  '/MyKPs/WR-test/',
  '/MyKPs/WR-test/weekly-report.js',
  '/MyKPs/WR-test/chart.js',
  '/MyKPs/?kps=1',
  '/MyKPs/MyKPs.png'
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
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/MyKPs/api/') && url.pathname.endsWith('.php')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network error, please check your connection' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
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