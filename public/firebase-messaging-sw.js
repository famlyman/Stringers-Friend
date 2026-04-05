importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These values are public and safe to include in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCXM1dLoDf56Cgp_lxQaV3xgoerbxmjkaY",
  authDomain: "ai-studio-applet-webapp-4226f.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-4226f",
  storageBucket: "ai-studio-applet-webapp-4226f.firebasestorage.app",
  messagingSenderId: "40459767792",
  appId: "1:40459767792:web:c9b3c206456a7c23b79735"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: self.location.origin + (payload.data?.link || '/'),
      ...payload.data
    },
    tag: payload.data?.type || 'general',
    renotify: true,
    actions: [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
