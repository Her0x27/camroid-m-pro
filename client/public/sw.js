// App Service Worker
// Production mode only

const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `zeroday-cache-v${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png'
];

const RUNTIME_CACHE_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.svg$/,
  /\.webp$/
];

// Module manifest data for dynamic manifest generation
const MODULES_MANIFEST_DATA = {
  'game-2048': {
    name: 'Game 2048',
    shortName: 'Game 2048',
    description: 'Простая, но затягивающая головоломка. Соединяйте плитки, чтобы собрать 2048 и наслаждайтесь бесконечными испытаниями.',
    iconPath: '/game-icon.svg',
    iconIosPath: '/game-icon-ios.svg',
    iconAndroidPath: '/game-icon-android.svg',
    categories: ['games', 'productivity'],
  },
  'calculator': {
    name: 'Calculator',
    shortName: 'Calculator',
    description: 'Simple and elegant calculator for everyday calculations. Fast, accurate, and easy to use.',
    iconPath: '/calculator-icon.svg',
    iconIosPath: '/calculator-icon-ios.svg',
    iconAndroidPath: '/calculator-icon-android.svg',
    categories: ['games', 'productivity'],
  },
  'notepad': {
    name: 'Notepad',
    shortName: 'Notepad',
    description: 'Simple notepad for quick notes and reminders. Keep your thoughts organized and accessible.',
    iconPath: '/notepad-icon.svg',
    iconIosPath: '/notepad-icon-ios.svg',
    iconAndroidPath: '/notepad-icon-android.svg',
    categories: ['games', 'productivity'],
  },
};

const DEFAULT_MANIFEST_DATA = {
  name: 'Camroid M',
  shortName: 'Camroid M',
  description: 'Tactical camera with GPS, compass and precision overlays. Capture geotagged photos for fieldwork and surveying.',
  iconPath: '/favicon.svg',
  iconIosPath: '/favicon.svg',
  iconAndroidPath: '/favicon.svg',
  categories: ['photography', 'utilities'],
};

// Generate dynamic manifest based on app mode from localStorage
function generateManifest() {
  let moduleData = DEFAULT_MANIFEST_DATA;
  
  try {
    const appMode = localStorage.getItem('app-mode');
    if (appMode) {
      const config = JSON.parse(appMode);
      if (config && config.enabled) {
        const moduleId = config.selectedModule || 'game-2048';
        moduleData = MODULES_MANIFEST_DATA[moduleId] || DEFAULT_MANIFEST_DATA;
      }
    }
  } catch (e) {
    console.warn('[SW] Failed to read app-mode from localStorage:', e);
  }

  return {
    name: moduleData.name,
    short_name: moduleData.shortName,
    version: '1.0.0',
    description: moduleData.description,
    start_url: '/',
    display: 'fullscreen',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: moduleData.iconPath,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: moduleData.iconPath.replace('.svg', '.png'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: moduleData.iconIosPath,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: moduleData.iconAndroidPath,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: moduleData.categories,
    lang: 'en',
    dir: 'ltr',
  };
}

// Helper to check if URL matches runtime cache patterns
function shouldCacheRuntime(url) {
  const pathname = new URL(url).pathname;
  return RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[SW] Failed to precache some assets:', error);
        return cache.addAll(['/favicon.png']);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('zeroday-cache-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Check if request is a navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
    (request.method === 'GET' && 
     request.headers.get('accept') && 
     request.headers.get('accept').includes('text/html'));
}

// Fetch event - network first with SPA fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  
  // Handle manifest.json dynamically (no caching)
  if (url.pathname === '/manifest.json') {
    event.respondWith(
      Promise.resolve(new Response(JSON.stringify(generateManifest()), {
        headers: { 'Content-Type': 'application/manifest+json' }
      }))
    );
    return;
  }

  // Skip API requests and dev server requests
  if (url.pathname.startsWith('/api/') || 
      request.url.includes('hot-update') ||
      request.url.includes('ws://') ||
      request.url.includes('wss://')) {
    return;
  }

  // Handle navigation requests (SPA routing)
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for offline use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/', responseClone);
          });
          return response;
        })
        .catch(() => {
          // Return cached index.html for offline navigation
          return caches.match('/');
        })
    );
    return;
  }

  // Handle other requests (assets, etc.)
  // Use stale-while-revalidate for runtime assets
  if (shouldCacheRuntime(request.url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Default: network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
