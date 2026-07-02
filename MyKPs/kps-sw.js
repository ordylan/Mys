const CACHE_NAME = 'MyKps-newwaw';
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
    '/MyKPs/WR-test/quote-generator.js',
    '/MyKPs/WR-test/quote-phrases.json',


  '/MyKPs/?kps=1',
  '/MyKPs/MyKPs.png'//,
  //'/MyKPs/html2canvas.min.js'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/MyKPs/CloudKPs.php')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({error: 'Network error, please check your connection'}), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }

  // 对于其他请求，先尝试缓存，再尝试网络
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Cache miss - fetch from network
        return fetch(event.request).catch(error => {
          console.error('Fetch failed:', error);
          // 如果是导航请求（页面访问）且网络失败，返回缓存的主页
          if (event.request.mode === 'navigate') {
            return caches.match('/MyKPs/ToDos.php');
          }
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
         return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
self.addEventListener('push', event => {
  let data = {};
  try { if (event.data) data = event.data.json(); } catch (e) { data = { title: 'MyKPs', body: event.data ? event.data.text() : 'New Reminder' }; }
  const title = data.title || 'Task Reminder';
  const options = {
    body: data.body || 'aaa',
    icon: '/MyKPs/MyKPs.png',
    badge: '/MyKPs/MyKPs.png',
    data: data.url || '/',
    tag: data.tag || 'tags'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// When user clicks the notification
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/MyKPs/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});