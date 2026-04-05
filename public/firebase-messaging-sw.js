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
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
