const CACHE_NAME = 'MyRECs-1'

const BASE = (new URL('.', self.location.href)).href
const INDEX_URL = new URL('./index.html', BASE).href
const ASSETS = [
  BASE,                     // 对应 /MyRECs/ 路径
  INDEX_URL,
  new URL('./manifest.json', BASE).href,
  new URL('./assets/styles.css', BASE).href,
new URL('./assets/index.js', BASE).href
 
]

// 安装阶段：预缓存关键资源，并立即激活
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('预缓存部分资源失败:', err))
  )
})

// 激活阶段：清理旧缓存，并接管客户端
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key)
        })
      )
    ).then(() => self.clients.claim())
  )
})

// 判断请求是否属于 /MyRECs 路径下
function isUnderBase(url) {
  return url.origin === self.location.origin && url.href.startsWith(BASE)
}

// 判断是否为 CloudRECs.php 请求（不缓存）
function isCloudRecs(url) {
  return url.pathname.includes('CloudRECs.php')
}

self.addEventListener('fetch', event => {
  const req = event.request

  // 只处理 GET 请求
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // 1. 如果是 CloudRECs.php，直接网络请求，不缓存
  if (isCloudRecs(url)) {
    event.respondWith(fetch(req))
    return
  }

  // 2. 导航请求（页面跳转）使用 Cache First，所有导航 URL 共用同一个缓存的 index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(INDEX_URL).then(cached => {
        if (cached) {
          // 缓存存在，直接返回（永久缓存）
          return cached
        }
        // 缓存不存在（首次访问或缓存被清空），发起网络请求并缓存
        return fetch(req).then(response => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(INDEX_URL, copy))
          }
          return response
        }).catch(() => {
          // 网络失败且无缓存，返回离线提示（可根据需要定制）
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
      })
    )
    return
  }

  // 3. 非导航请求，且属于 /MyRECs 路径下 → Cache First
  if (isUnderBase(url)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached  // 缓存存在直接返回（永久缓存）

        // 缓存不存在，发起网络请求
        return fetch(req).then(response => {
          // 只缓存成功的、同源的、非 opaque 响应
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy))
          }
          return response
        }).catch(() => {
          // 网络失败且无缓存：对于非导航请求，返回一个简单的离线提示
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
      })
    )
    return
  }

  // 4. 其他请求（跨域或不在 /MyRECs 下）直接网络，不缓存
  event.respondWith(fetch(req))
})