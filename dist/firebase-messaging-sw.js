// public/firebase-messaging-sw.js
// Firebase Cloud Messaging service worker — handles background push notifications.
// Registered automatically by getToken() in lib/notifications.ts.
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || "",
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || "",
  projectId:         self.FIREBASE_PROJECT_ID         || "",
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || "",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "",
  appId:             self.FIREBASE_APP_ID              || "",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "AtlaasGo", {
    body: body ?? "",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
  });
});
