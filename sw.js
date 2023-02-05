importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const {
    cacheableResponse: { CacheableResponsePlugin },
    expiration: { ExpirationPlugin },
    routing: { registerRoute },
    strategies: { CacheFirst, StaleWhileRevalidate },
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

const tilesUrls = ["https://ibasemaps-api.arcgis.com/arcgis/rest/", "https://basemaps-api.arcgis.com/arcgis/rest/",
    "https://services.arcgisonline.com/ArcGIS/rest/"]

registerRoute(
    // Custom `matchCallback` function
    ({event}) => event.request.url.startsWith(tilesUrls[0]) || event.request.url.startsWith(tilesUrls[1]) ||
        event.request.url.startsWith(tilesUrls[2]),
    new CacheFirst({
        cacheName: 'tiles',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
            }),
        ],
    })
);