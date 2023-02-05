importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const {
    cacheableResponse: { CacheableResponsePlugin },
    expiration: { ExpirationPlugin },
    routing: { registerRoute },
    strategies: { CacheFirst },
} = workbox;

registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new CacheFirst({
        cacheName: 'static-files',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxAgeSeconds: 30 * 24 * 60 * 60,
            }),
        ],
    }),
);