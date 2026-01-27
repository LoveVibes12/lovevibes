const CACHE_NAME = 'lovevibes-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/notification.mp3',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png'
];

// Installation et mise en cache
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Mise en cache des fichiers');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activation');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de cache: Network First avec fallback au cache
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes Firebase
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre à jour le cache avec la nouvelle réponse
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => {
        // Fallback au cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Pour les pages, retourner la page d'accueil
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', event => {
  console.log('[Service Worker] Notification push reçue');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Love Vibes',
        body: event.data.text() || 'Nouveau message',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
      };
    }
  }

  const options = {
    body: data.body || 'Nouveau message',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'lovevibes-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      chatId: data.chatId
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      },
      {
        action: 'dismiss',
        title: 'Fermer'
      }
    ]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        data.title || 'Love Vibes',
        options
      ),
      // Jouer le son de notification
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            soundUrl: '/notification.mp3'
          });
        });
      })
    ])
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification cliquée');
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Si une fenêtre est déjà ouverte, on la focus
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, on ouvre une nouvelle fenêtre
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});

// Synchronisation en arrière-plan
self.addEventListener('sync', event => {
  console.log('[Service Worker] Synchronisation:', event.tag);
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Gestion des messages depuis le client
self.addEventListener('message', event => {
  console.log('[Service Worker] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fonction de synchronisation des messages
async function syncMessages() {
  // À implémenter selon votre logique de synchronisation
  console.log('[Service Worker] Synchronisation des messages');
}
