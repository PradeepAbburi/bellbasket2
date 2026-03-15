importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const CACHE_NAME = 'bellbasket-pwa-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

firebase.initializeApp({
  apiKey: "AIzaSyCRqutWlLcuboauO8IGrByyNglUlNgLwkI",
  authDomain: "transform-a96c8.firebaseapp.com",
  projectId: "transform-a96c8",
  storageBucket: "transform-a96c8.firebasestorage.app",
  messagingSenderId: "799146176485",
  appId: "1:799146176485:web:4fbad89dfc3c90452d090c",
  measurementId: "G-2LNXBC5DP4"
});

const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (requestUrl.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // If the payload already has a notification property, the browser might show it automatically.
  // But we handle it here to ensure it uses our icons and custom data.
  const title = payload.notification?.title || payload.data?.title || 'BellBasket Update';
  const body = payload.notification?.body || payload.data?.body || 'You have a new alert.';

  const options = {
    body: body,
    icon: '/pwa-icon.png',
    badge: '/pwa-icon.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.orderId || 'general-alert',
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.webpush?.fcmOptions?.link || payload.data?.url || '/vendor/orders',
      notificationId: payload.data?.id || payload.data?.messageId || payload.data?.orderId || null,
    }
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickUrl = event.notification?.data?.url || '/';
  const urlToOpen = new URL(clickUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
