// Service Worker pour Love Vibes
const CACHE_NAME = 'love-vibes-v2.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://assets.mixkit.co/active_storage/sfx/286/286-preview.mp3'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des ressources');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Installation terminée');
        return self.skipWaiting();
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation...');
  
  // Supprimer les anciens caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  console.log('[Service Worker] Activation terminée');
  return self.clients.claim();
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes Firebase et autres APIs
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la ressource mise en cache ou récupérer depuis le réseau
        return response || fetch(event.request)
          .then((response) => {
            // Mettre en cache les nouvelles ressources
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback pour les pages
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notification push reçue');
  
  let notificationData = {
    title: 'Love Vibes',
    body: 'Nouveau message !',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'love-vibes-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: self.location.origin
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.notification) {
        notificationData = {
          ...notificationData,
          ...data.notification,
          icon: data.notification.icon || '/icons/icon-192x192.png'
        };
      }
      
      if (data.data) {
        notificationData.data = {
          ...notificationData.data,
          ...data.data
        };
      }
    } catch (e) {
      console.log('[Service Worker] Données push non JSON:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification cliquée');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || self.location.origin;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Vérifier si une fenêtre est déjà ouverte
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Synchronisation:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Fonction de synchronisation des messages
function syncMessages() {
  console.log('[Service Worker] Synchronisation des messages');
  // Ici, vous synchroniseriez les messages non envoyés
  return Promise.resolve();
}

// Gestion des messages du client
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});