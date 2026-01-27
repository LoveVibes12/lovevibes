// Service Worker pour Love Vibes
const CACHE_NAME = 'love-vibes-v2.0.0';
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
  '/icons/icon-512x512.png'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installation terminée');
        return self.skipWaiting();
      })
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
    }).then(() => {
      console.log('[Service Worker] Activation terminée');
      return self.clients.claim();
    })
  );
});

// Stratégie de cache: Network First, fallback to Cache
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes chrome-extension
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la réponse est valide, la mettre en cache
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // En cas d'erreur réseau, chercher dans le cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Pour les pages, retourner la page d'accueil
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', event => {
  console.log('[Service Worker] Push reçu:', event);
  
  let notificationData = {
    title: 'Love Vibes',
    body: 'Nouveau message reçu !',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'love-vibes-notification',
    data: {
      url: self.location.origin
    }
  };

  try {
    if (event.data) {
      const data = event.data.json();
      if (data.title) notificationData.title = data.title;
      if (data.body) notificationData.body = data.body;
      if (data.icon) notificationData.icon = data.icon;
      if (data.data) notificationData.data = { ...notificationData.data, ...data.data };
    }
  } catch (error) {
    console.log('[Service Worker] Données push non-JSON, utilisation des valeurs par défaut');
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        // Envoyer un message à la page pour jouer le son
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PLAY_NOTIFICATION_SOUND'
            });
          });
        });
      })
  );
});

// Gestion du clic sur les notifications
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification cliquée:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Si une fenêtre est déjà ouverte, la mettre au premier plan
        for (const client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Sinon, ouvrir une nouvelle fenêtre
        if (self.clients.openWindow) {
          const urlToOpen = event.notification.data?.url || self.location.origin;
          return self.clients.openWindow(urlToOpen);
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

async function syncMessages() {
  console.log('[Service Worker] Synchronisation des messages...');
  // Implémentez ici la logique de synchronisation des messages
  // Par exemple, envoyer des messages en attente
}

// Gestion des messages depuis la page
self.addEventListener('message', event => {
  console.log('[Service Worker] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gestion de l'état de connexion
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-messages') {
    console.log('[Service Worker] Vérification périodique des messages');
    event.waitUntil(checkForNewMessages());
  }
});

async function checkForNewMessages() {
  // Implémentez ici la vérification des nouveaux messages
  console.log('[Service Worker] Vérification des nouveaux messages');
}

// Préchargement des ressources importantes
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PRECACHE_RESOURCES') {
    const resources = event.data.resources || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(resources);
      })
    );
  }
});
