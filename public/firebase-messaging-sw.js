importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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
      url: payload.webpush?.fcmOptions?.link || payload.data?.url || '/vendor/orders'
    }
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil(clients.openWindow(urlToOpen));
});
