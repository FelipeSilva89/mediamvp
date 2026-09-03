// @ts-nocheck
const RSS_URL =
    "https://g1.globo.com/rss/g1/sp/itapetininga-regiao";

const NEWS_LIMIT = 5;

const WEATHER_CACHE_SECONDS = 70 * 60 * 60;

const WEATHER_LOCATION = {
    name: "Itapetininga",
    latitude: -23.5917,
    longitude: -48.0531
};

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=10800"
};

const ALLOWED_IMAGE_HOSTS = [
    "g1.globo.com",
    "glbimg.com"
];

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: CORS_HEADERS
            });
        }

        if (request.method !== "GET") {
            return jsonResponse(
                {
                    success: false,
                    error: "Método não permitido."
                },
                405
            );
        }

        /*
         * Proxy de imagem
         */
        if (url.pathname === "/image") {
            return handleImageProxy(url);
        }

        if (url.pathname === "/weather") {
            return handleWeather(env);
        }

        return handleNews();


        /* =========================================================
           NOTÍCIAS
        ========================================================= */

        async function handleNews() {
            try {
                console.log("Buscando RSS:", RSS_URL);

                const response = await fetch(RSS_URL, {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (compatible; MediaPlayerMVP/1.0)",
                        "Accept":
                            "application/rss+xml, application/xml, text/xml, */*"
                    }
                });

                console.log("Status RSS:", response.status);

                if (!response.ok) {
                    throw new Error(
                        `RSS retornou HTTP ${response.status}`
                    );
                }

                const buffer = await response.arrayBuffer();

                /*
                 * G1 normalmente trabalha com UTF-8,
                 * então tentamos UTF-8 primeiro.
                 */
                let xml = new TextDecoder("utf-8").decode(buffer);

                /*
                 * Caso apareça problema de encoding,
                 * o XML continua sendo processado.
                 */
                if (xml.includes("�")) {
                    xml = new TextDecoder("windows-1252").decode(buffer);
                }

                console.log(
                    "Tamanho do XML:",
                    xml.length
                );

                const items = parseRSS(xml);

                console.log(
                    "Itens encontrados no RSS:",
                    items.length
                );

                const baseNews = items
                    .slice(0, NEWS_LIMIT)
                    .map((item) => ({
                        title: cleanText(item.title),
                        description: cleanText(item.description),
                        link: cleanText(item.link),
                        pubDate: cleanText(item.pubDate),
                        image: item.image
                            ? resolveUrl(item.image, item.link)
                            : null
                    }))
                    .filter(
                        (item) =>
                            item.title &&
                            item.link
                    );

                if (baseNews.length === 0) {
                    throw new Error(
                        "Nenhuma notícia válida encontrada no RSS."
                    );
                }

                /*
                 * Busca imagens das páginas caso o RSS
                 * não tenha fornecido uma.
                 */
                const news = await Promise.all(
                    baseNews.map(async (item) => {

                        let image = item.image;

                        if (!image) {
                            image =
                                await findArticleImage(
                                    item.link
                                );
                        }

                        return {
                            title: item.title,
                            description:
                                item.description,
                            link: item.link,
                            pubDate:
                                item.pubDate,
                            image
                        };
                    })
                );

                return jsonResponse({
                    success: true,
                    source: "G1 Itapetininga e Região",
                    updatedAt:
                        new Date().toISOString(),
                    count: news.length,
                    news
                });

            } catch (error) {

                console.error(
                    "ERRO COMPLETO:",
                    error
                );

                return jsonResponse(
                    {
                        success: false,
                        error:
                            "Não foi possível obter as notícias.",
                        details:
                            error?.message ||
                            "Erro desconhecido"
                    },
                    500
                );
            }
        }


        /* =========================================================
           PARSER RSS
        ========================================================= */

        function parseRSS(xml) {

            const items = [];

            const itemMatches =
                xml.match(
                    /<item[\s\S]*?<\/item>/gi
                ) || [];

            for (const itemXml of itemMatches) {

                const title =
                    extractTag(
                        itemXml,
                        "title"
                    );

                const description =
                    extractTag(
                        itemXml,
                        "description"
                    );

                const link =
                    extractTag(
                        itemXml,
                        "link"
                    );

                const pubDate =
                    extractTag(
                        itemXml,
                        "pubDate"
                    );

                /*
                 * Possíveis imagens dentro do RSS
                 */

                let image =
                    extractMediaImage(
                        itemXml
                    );

                if (!image) {
                    image =
                        extractEnclosureImage(
                            itemXml
                        );
                }

                if (!image) {
                    image =
                        extractImageTag(
                            itemXml
                        );
                }

                items.push({
                    title,
                    description,
                    link,
                    pubDate,
                    image
                });
            }

            return items;
        }


        /* =========================================================
           IMAGEM DO RSS
        ========================================================= */

        function extractMediaImage(xml) {

            /*
             * media:content url=""
             */

            let match =
                xml.match(
                    /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i
                );

            if (match?.[1]) {
                return match[1].trim();
            }

            /*
             * media:thumbnail url=""
             */

            match =
                xml.match(
                    /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i
                );

            if (match?.[1]) {
                return match[1].trim();
            }

            return null;
        }


        function extractEnclosureImage(xml) {

            const match =
                xml.match(
                    /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
                );

            if (!match?.[1]) {
                return null;
            }

            const typeMatch =
                xml.match(
                    /<enclosure[^>]+type=["']([^"']+)["'][^>]*>/i
                );

            if (
                typeMatch?.[1] &&
                typeMatch[1].startsWith("image/")
            ) {
                return match[1].trim();
            }

            /*
             * Mesmo sem type, podemos tentar usar a URL.
             */

            return match[1].trim();
        }


        function extractImageTag(xml) {

            const match =
                xml.match(
                    /<image[^>]*>\s*<url>([\s\S]*?)<\/url>/i
                );

            if (match?.[1]) {
                return cleanText(match[1]);
            }

            return null;
        }


        /* =========================================================
           BUSCA IMAGEM NA PÁGINA DA NOTÍCIA
        ========================================================= */

        async function findArticleImage(articleUrl) {

            try {

                const response =
                    await fetch(articleUrl, {
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (compatible; MediaPlayerMVP/1.0)",
                            "Accept":
                                "text/html,application/xhtml+xml"
                        }
                    });

                if (!response.ok) {

                    console.warn(
                        "Página retornou:",
                        response.status,
                        articleUrl
                    );

                    return null;
                }

                const html =
                    await response.text();

                /*
                 * 1. Open Graph
                 */

                let image =
                    extractMetaContent(
                        html,
                        "property",
                        "og:image"
                    );

                if (image) {
                    return resolveUrl(
                        image,
                        articleUrl
                    );
                }

                /*
                 * 2. Twitter
                 */

                image =
                    extractMetaContent(
                        html,
                        "name",
                        "twitter:image"
                    );

                if (image) {
                    return resolveUrl(
                        image,
                        articleUrl
                    );
                }

                /*
                 * 3. itemprop=image
                 */

                image =
                    extractMetaContent(
                        html,
                        "itemprop",
                        "image"
                    );

                if (image) {
                    return resolveUrl(
                        image,
                        articleUrl
                    );
                }

                /*
                 * 4. JSON-LD
                 */

                image =
                    extractJsonLdImage(
                        html
                    );

                if (image) {
                    return resolveUrl(
                        image,
                        articleUrl
                    );
                }

                /*
                 * 5. src de imagem
                 */

                image =
                    extractImgAttribute(
                        html,
                        "src"
                    );

                if (image) {
                    return resolveUrl(
                        image,
                        articleUrl
                    );
                }

                /*
                 * 6. data-src
                 */

                image =
                    extractImgAttribute(
                        html,
                        "data-src"
                    );

                if (image) {
                    return resolveUrl(
                        image,
                        articleUrl
                    );
                }

                /*
                 * 7. srcset
                 */

                image =
                    extractSrcsetImage(
                        html
                    );

                if (image) {
                    return resolveUrl(
                        image,
                        articleUrl
                    );
                }

                return null;

            } catch (error) {

                console.warn(
                    "Erro ao buscar imagem:",
                    articleUrl,
                    error?.message
                );

                return null;
            }
        }


        /* =========================================================
           META TAG
        ========================================================= */

        function extractMetaContent(
            html,
            attribute,
            value
        ) {

            /*
             * Permite os atributos em qualquer ordem.
             */

            const regex =
                new RegExp(
                    `<meta\\b(?=[^>]*\\b${attribute}\\s*=\\s*["']${escapeRegex(value)}["'])(?=[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'])[^>]*>`,
                    "i"
                );

            const match =
                html.match(regex);

            if (match?.[1]) {
                return match[1].trim();
            }

            /*
             * Busca também quando content aparece antes.
             */

            const reverseRegex =
                new RegExp(
                    `<meta\\b(?=[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'])(?=[^>]*\\b${attribute}\\s*=\\s*["']${escapeRegex(value)}["'])[^>]*>`,
                    "i"
                );

            const reverseMatch =
                html.match(reverseRegex);

            if (reverseMatch?.[1]) {
                return reverseMatch[1].trim();
            }

            return "";
        }


        /* =========================================================
           JSON-LD
        ========================================================= */

        function extractJsonLdImage(html) {

            const scripts =
                html.match(
                    /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
                ) || [];

            for (const script of scripts) {

                const jsonText =
                    script
                        .replace(
                            /<script[^>]*>/i,
                            ""
                        )
                        .replace(
                            /<\/script>$/i,
                            ""
                        )
                        .trim();

                try {

                    const data =
                        JSON.parse(
                            jsonText
                        );

                    const image =
                        findImageInJsonLd(
                            data
                        );

                    if (image) {
                        return image;
                    }

                } catch {
                    /*
                     * Ignora JSON-LD inválido.
                     */
                }
            }

            return null;
        }


        function findImageInJsonLd(data) {

            if (!data) {
                return null;
            }

            if (Array.isArray(data)) {

                for (const item of data) {

                    const image =
                        findImageInJsonLd(
                            item
                        );

                    if (image) {
                        return image;
                    }
                }

                return null;
            }

            if (typeof data !== "object") {
                return null;
            }

            if (data.image) {

                if (
                    typeof data.image ===
                    "string"
                ) {
                    return data.image;
                }

                if (
                    Array.isArray(
                        data.image
                    ) &&
                    data.image.length
                ) {

                    const first =
                        data.image[0];

                    if (
                        typeof first ===
                        "string"
                    ) {
                        return first;
                    }

                    if (
                        first?.url
                    ) {
                        return first.url;
                    }
                }

                if (
                    typeof data.image ===
                    "object" &&
                    data.image.url
                ) {
                    return data.image.url;
                }
            }

            /*
             * Alguns JSON-LD possuem @graph.
             */

            if (data["@graph"]) {

                return findImageInJsonLd(
                    data["@graph"]
                );
            }

            return null;
        }


        /* =========================================================
           IMG
        ========================================================= */

        function extractImgAttribute(
            html,
            attribute
        ) {

            const regex =
                new RegExp(
                    `<img[^>]+${attribute}\\s*=\\s*["']([^"']+)["'][^>]*>`,
                    "i"
                );

            const match =
                html.match(regex);

            if (match?.[1]) {
                return match[1].trim();
            }

            return null;
        }


        /* =========================================================
           SRCSET
        ========================================================= */

        function extractSrcsetImage(html) {

            const regex =
                /<img[^>]+srcset=["']([^"']+)["'][^>]*>/i;

            const match =
                html.match(regex);

            if (!match?.[1]) {
                return null;
            }

            const candidates =
                match[1]
                    .split(",")
                    .map(
                        (item) =>
                            item.trim()
                    );

            if (!candidates.length) {
                return null;
            }

            /*
             * Pega a última imagem do srcset,
             * normalmente a maior resolução.
             */

            const last =
                candidates[
                candidates.length - 1
                ];

            return last
                .split(/\s+/)[0]
                .trim();
        }


        /* =========================================================
           URL
        ========================================================= */

        function resolveUrl(
            imageUrl,
            articleUrl
        ) {

            try {

                return new URL(
                    imageUrl,
                    articleUrl
                ).href;

            } catch {

                return null;
            }
        }


        /* =========================================================
           PROXY DE IMAGEM
        ========================================================= */

        async function handleImageProxy(url) {

            try {

                const imageUrl =
                    url.searchParams.get("url");


                // ====================================
                // VALIDAR URL
                // ====================================

                if (!imageUrl) {

                    return new Response(
                        "Imagem não informada.",
                        {
                            status: 400,
                            headers: CORS_HEADERS
                        }
                    );

                }


                let targetUrl;

                try {

                    targetUrl =
                        new URL(imageUrl);

                } catch {

                    return new Response(
                        "URL de imagem inválida.",
                        {
                            status: 400,
                            headers: CORS_HEADERS
                        }
                    );

                }


                // ====================================
                // VALIDAR HOST
                // ====================================

                const allowed =
                    ALLOWED_IMAGE_HOSTS.some(
                        (host) =>
                            targetUrl.hostname === host ||
                            targetUrl.hostname.endsWith(
                                "." + host
                            )
                    );


                if (!allowed) {

                    console.warn(
                        "Host bloqueado:",
                        targetUrl.hostname
                    );

                    return new Response(
                        "Domínio de imagem não permitido.",
                        {
                            status: 403,
                            headers: CORS_HEADERS
                        }
                    );

                }


                console.log(
                    "Buscando imagem:",
                    targetUrl.href
                );


                // ====================================
                // BUSCAR IMAGEM
                // ====================================

                const response =
                    await fetch(
                        targetUrl.href,
                        {
                            method: "GET",

                            headers: {

                                "User-Agent":
                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0 Safari/537.36",

                                "Accept":
                                    "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",

                                "Referer":
                                    "https://g1.globo.com/",

                                "Origin":
                                    "https://g1.globo.com"

                            },

                            redirect: "follow"

                        }
                    );


                console.log(
                    "Status imagem:",
                    response.status
                );


                // ====================================
                // VALIDAR RESPOSTA
                // ====================================

                if (!response.ok) {

                    console.warn(
                        "Imagem retornou HTTP:",
                        response.status,
                        targetUrl.href
                    );

                    return new Response(
                        `Não foi possível carregar a imagem. HTTP ${response.status}`,
                        {
                            status: 502,
                            headers: CORS_HEADERS
                        }
                    );

                }


                const contentType =
                    response.headers.get(
                        "Content-Type"
                    ) || "";


                console.log(
                    "Content-Type:",
                    contentType
                );


                // ====================================
                // VALIDAR CONTENT-TYPE
                // ====================================

                if (
                    !contentType
                        .toLowerCase()
                        .startsWith("image/")
                ) {

                    console.warn(
                        "Resposta não é imagem:",
                        contentType
                    );

                    return new Response(
                        "O recurso retornado não é uma imagem.",
                        {
                            status: 415,
                            headers: CORS_HEADERS
                        }
                    );

                }


                // ====================================
                // HEADERS DA RESPOSTA
                // ====================================

                const headers =
                    new Headers();


                headers.set(
                    "Access-Control-Allow-Origin",
                    "*"
                );


                headers.set(
                    "Cache-Control",
                    "public, max-age=10800"
                    //"no-cache"
                );


                headers.set(
                    "Content-Type",
                    contentType
                );


                headers.set(
                    "X-Content-Type-Options",
                    "nosniff"
                );


                // ====================================
                // DEVOLVER IMAGEM
                // ====================================

                return new Response(
                    response.body,
                    {
                        status: 200,
                        headers
                    }
                );


            } catch (error) {

                console.error(
                    "Erro no proxy de imagem:",
                    error
                );


                return new Response(
                    "Erro interno ao carregar imagem.",
                    {
                        status: 500,
                        headers: CORS_HEADERS
                    }
                );

            }

        }


        /* =========================================================
           EXTRACT TAG
        ========================================================= */

        function extractTag(
            xml,
            tag
        ) {

            /*
             * Aceita tags normais e namespaces.
             */

            const regex =
                new RegExp(
                    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
                    "i"
                );

            const match =
                xml.match(regex);

            if (!match) {
                return "";
            }

            let value =
                match[1].trim();

            value =
                value.replace(
                    /^<!\[CDATA\[/,
                    ""
                );

            value =
                value.replace(
                    /\]\]>$/,
                    ""
                );

            return decodeHTMLEntities(
                value.trim()
            );
        }


        /* =========================================================
           LIMPEZA
        ========================================================= */

        function cleanText(text) {

            if (!text) {
                return "";
            }

            return decodeHTMLEntities(
                text
                    .replace(
                        /<!\[CDATA\[/g,
                        ""
                    )
                    .replace(
                        /\]\]>/g,
                        ""
                    )
                    .replace(
                        /<[^>]*>/g,
                        " "
                    )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim()
            );
        }


        /* =========================================================
           HTML ENTITIES
        ========================================================= */

        function decodeHTMLEntities(
            text
        ) {

            return text
                .replace(
                    /&amp;/g,
                    "&"
                )
                .replace(
                    /&lt;/g,
                    "<"
                )
                .replace(
                    /&gt;/g,
                    ">"
                )
                .replace(
                    /&quot;/g,
                    '"'
                )
                .replace(
                    /&#39;/g,
                    "'"
                )
                .replace(
                    /&apos;/g,
                    "'"
                )
                .replace(
                    /&#(\d+);/g,
                    (_, code) =>
                        String.fromCharCode(
                            Number(code)
                        )
                )
                .replace(
                    /&#x([0-9a-f]+);/gi,
                    (_, code) =>
                        String.fromCharCode(
                            parseInt(
                                code,
                                16
                            )
                        )
                );
        }


        /* =========================================================
           REGEX
        ========================================================= */

        function escapeRegex(
            text
        ) {

            return text.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );
        }


        /* =========================================================
           JSON RESPONSE
        ========================================================= */
        function jsonResponse(
            data,
            status = 200,
            extraHeaders = {}
        ) {
            return new Response(
                JSON.stringify(
                    data,
                    null,
                    2
                ),
                {
                    status,
                    headers: {
                        ...CORS_HEADERS,
                        "Content-Type":
                            "application/json; charset=UTF-8",
                        ...extraHeaders
                    }
                }
            );
        }
        async function handleWeather(env) {
            try {
                const apiUrl =
                    `https://my.meteoblue.com/packages/basic-day` +
                    `?lat=${WEATHER_LOCATION.latitude}` +
                    `&lon=${WEATHER_LOCATION.longitude}` +
                    `&tz=America%2FSao_Paulo` +
                    `&forecastDays=7` +
                    `&apikey=${env.METEOBLUE_API_KEY}`;

                const response = await fetch(apiUrl);

                if (!response.ok) {
                    const errorText = await response.text();

                    throw new Error(
                        `meteoblue ${response.status}: ${errorText}`
                    );
                }

                const data = await response.json();

                const daily = data.data_day;

                const dates =
                    Array.isArray(daily?.time)
                        ? daily.time
                        : [];

                const maxValues =
                    Array.isArray(daily?.temperature_max)
                        ? daily.temperature_max
                        : [];

                const minValues =
                    Array.isArray(daily?.temperature_min)
                        ? daily.temperature_min
                        : [];

                const conditionValues =
                    Array.isArray(daily?.pictocode)
                        ? daily.pictocode
                        : [];

                const length = Math.min(
                    7,
                    dates.length,
                    maxValues.length,
                    minValues.length,
                    conditionValues.length
                );

                const forecast = [];

                for (let i = 0; i < length; i++) {

                    forecast.push({
                        date: normalizeWeatherDate(dates[i]),
                        max: toNumberOrNull(maxValues[i]),
                        min: toNumberOrNull(minValues[i]),
                        conditionCode: toNumberOrNull(
                            conditionValues[i]
                        )
                    });

                }

                if (!forecast.length) {
                    throw new Error(
                        "Meteoblue não retornou previsão diária."
                    );
                }

                return jsonResponse(
                    {
                        success: true,
                        location: WEATHER_LOCATION.name,
                        updatedAt: new Date().toISOString(),
                        forecast
                    },
                    200,
                    {
                        "Cache-Control":
                            `public, max-age=${WEATHER_CACHE_SECONDS}`
                    }
                );

            } catch (error) {

                console.error(
                    "Erro ao buscar previsão do clima:",
                    error
                );

                return jsonResponse(
                    {
                        success: false,
                        error:
                            "Não foi possível obter os dados do clima."
                    },
                    500
                );
            }
        }

        function normalizeWeatherDate(value) {

            if (typeof value === "string") {
                return value.substring(0, 10);
            }

            if (typeof value === "number") {

                const milliseconds =
                    value > 100000000000
                        ? value
                        : value * 1000;

                return new Date(milliseconds)
                    .toISOString()
                    .substring(0, 10);
            }

            return null;
        }


        function toNumberOrNull(value) {

            const number = Number(value);

            return Number.isFinite(number)
                ? number
                : null;
        }


    }
}