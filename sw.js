```javascript
const CACHE_NAME = "media-player-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];


/* =========================
   INSTALAÇÃO
   ========================= */

self.addEventListener(
    "install",
    (event) => {

        event.waitUntil(

            caches.open(CACHE_NAME)
                .then((cache) => {

                    return cache.addAll(
                        FILES_TO_CACHE
                    );

                })

        );

        self.skipWaiting();

    }
);


/* =========================
   ATIVAÇÃO
   ========================= */

self.addEventListener(
    "activate",
    (event) => {

        event.waitUntil(

            caches.keys()
                .then((cacheNames) => {

                    return Promise.all(

                        cacheNames
                            .filter(
                                (cacheName) =>
                                    cacheName !== CACHE_NAME
                            )
                            .map(
                                (cacheName) =>
                                    caches.delete(cacheName)
                            )

                    );

                })

        );

        self.clients.claim();

    }
);


/* =========================
   REQUISIÇÕES
   ========================= */

self.addEventListener(
    "fetch",
    (event) => {

        event.respondWith(

            caches.match(event.request)
                .then((cachedResponse) => {

                    if (cachedResponse) {

                        return cachedResponse;

                    }

                    return fetch(event.request);

                })

        );

    }
);
```
