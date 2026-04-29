const CACHE_NAME = 'quran-v1';
// الملفات الأساسية التي سيتم حفظها ليعمل الموقع بدون نت
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './ADD.js',
  './app-icon.png'
];

// تثبيت الـ Service Worker وحفظ ملفات التصميم
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// استراتيجية التشغيل: ابحث في الـ Cache أولاً، إذا لم تجد اذهب للإنترنت
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

