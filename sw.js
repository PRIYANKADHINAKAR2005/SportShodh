// TalentTrack Service Worker - PWA Offline Support
const CACHE_NAME = 'talenttrack-v1.0.0';
const STATIC_CACHE = 'talenttrack-static-v1.0.0';
const DYNAMIC_CACHE = 'talenttrack-dynamic-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/index.css',
  // Add other critical assets
];

// API routes that should be cached
const CACHEABLE_APIS = [
  '/api/benchmarks',
  '/api/profile',
  '/api/athletes',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Handle API requests with caching strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Cache successful API responses
            if (response.status === 200 && CACHEABLE_APIS.some(api => url.pathname.includes(api))) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Serve from cache if offline
            return caches.match(request);
          });
      })
    );
    return;
  }

  // Default: try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Serve from cache if offline
        return caches.match(request);
      })
  );
});

// Background sync for offline video uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-videos') {
    console.log('[SW] Background sync: upload-videos');
    event.waitUntil(processOfflineUploads());
  }
});

// Handle offline video upload queue
async function processOfflineUploads() {
  try {
    // This would integrate with IndexedDB to process queued uploads
    console.log('[SW] Processing offline video uploads...');
    
    // Implementation would:
    // 1. Check IndexedDB for queued uploads
    // 2. Attempt to upload each video
    // 3. Remove from queue on success
    // 4. Notify user of upload status
    
  } catch (error) {
    console.error('[SW] Error processing offline uploads:', error);
  }
}

// Push notification handler (for admin notifications)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'talenttrack-notification',
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});