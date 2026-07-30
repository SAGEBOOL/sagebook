/* ============================================================
   SAGEBOOK Service Worker —— 纯前端离线壳 + 可安装（PWA）
   策略：
   - 导航请求（HTML）network-first：永远先拿线上最新，避免陈旧缓存坑；
     离线时回退缓存，再不行回退 index.html。
   - 静态资源（css/js/图片）stale-while-revalidate：先用缓存秒开，
     后台拉最新写入缓存。
   发布新版本时，把下方 CACHE 版本号 +1（如 v1→v2），旧缓存会被清空。
   ============================================================ */
const CACHE = 'sagebook-shell-v1';
const CORE = [
  './index.html',
  './manifest.json',
  './icon.svg',
  './design-system.css',
  './sagebook-enhance.css',
  './sagebook-enhance.js'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE).catch(function () { /* 个别文件缺失不阻断安装 */ });
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 只管同源（本站的静态与页面）

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
