const APP_VERSION = "2026-09-09";

const CACHE_NAME = `media-player-${APP_VERSION}`;

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

        const request =
            event.request;

        /*
         * Apenas requisições GET
         */
        if (
            request.method !== "GET"
        ) {

            return;

        }


        /*
         * Para arquivos do próprio Player:
         *
         * 1. tenta buscar a versão atual
         * 2. atualiza o cache
         * 3. se estiver offline,
         *    usa o cache
         */

        const url =
            new URL(
                request.url
            );


        const isLocalFile =
            url.origin === self.location.origin;


        if (
            isLocalFile
        ) {

            event.respondWith(

                fetch(request)
                    .then(
                        (response) => {

                            /*
                             * Guarda uma cópia
                             * da versão atual
                             */

                            const responseClone =
                                response.clone();

                            caches.open(
                                CACHE_NAME
                            ).then(
                                (cache) => {

                                    cache.put(
                                        request,
                                        responseClone
                                    );

                                }
                            );


                            return response;

                        }
                    )
                    .catch(
                        () => {

                            /*
                             * Sem internet:
                             * usa o cache
                             */

                            return caches.match(
                                request
                            );

                        }
                    )

            );

            return;

        }


        /*
         * APIs externas / Worker / Meteoblue etc.
         *
         * Não serão congeladas pelo
         * Service Worker.
         */

        event.respondWith(
            fetch(request)
        );

    }
);