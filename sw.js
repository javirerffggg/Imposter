const CACHE_NAME = 'imposter-who-v1';
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'script.js',
    'words.js',
    'manifest.json',
    'https://cdn.tailwindcss.com',
    'https://placehold.co/192x192/1a202c/FFFFFF?text=IW',
    'https://placehold.co/512x512/1a202c/FFFFFF?text=IW'
];

// Evento 'install': Pre-cachear los activos de la aplicación
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Evento 'activate': Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Evento 'fetch': Servir desde la caché primero, luego red
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Si la respuesta está en la caché, devolverla
                if (response) {
                    return response;
                }
                // Si no, ir a la red
                return fetch(event.request);
            })
    );
});
