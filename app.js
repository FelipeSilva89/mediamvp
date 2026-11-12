// ========================================
// ELEMENTOS
// ========================================

const player =
    document.getElementById("player");

const progress =
    document.getElementById("progress");

const startScreen =
    document.getElementById("start-screen");

const startButton =
    document.getElementById("start-button");

const welcomeClock =
    document.getElementById("welcome-clock");

const welcomeDate =
    document.getElementById("welcome-date");

const welcomeGreeting =
    document.getElementById("welcome-greeting");

// Atualiza relógio, data e saudação sem depender de API.
function updateWelcomeScreen() {
    const now = new Date();

    if (welcomeClock) {
        welcomeClock.textContent = now.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    if (welcomeDate) {
        const formattedDate = new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long"
        }).format(now);
        welcomeDate.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    if (welcomeGreeting) {
        const hour = now.getHours();
        let greeting = "Olá! Seja bem-vindo!";
        if (hour >= 5 && hour < 12) greeting = "Bom dia! Seja bem-vindo!";
        else if (hour >= 12 && hour < 18) greeting = "Boa tarde! Seja bem-vindo!";
        else greeting = "Boa noite! Seja bem-vindo!";
        welcomeGreeting.textContent = greeting;
    }
}

updateWelcomeScreen();
setInterval(updateWelcomeScreen, 1000);




// ========================================
// ESTADO DO PLAYER
// ========================================

let slides = [];

let currentSlide = 0;

let playerStarted = false;

let slideTimer = null;

let wakeLock = null;

let weatherAdObjectUrls = [];


// ========================================
// CONFIGURAÇÕES
// ========================================

const SLIDE_DURATION =
    10000;

// Notícias
const NEWS_LIMIT = 5;

const NEWS_UPDATE_INTERVAL =
    3 * 60 * 60 * 1000;

const ADVERTISEMENTS = [
    "assets/ads/midia-indoor-Lucas-Franca(slide).png",
    "assets/ads/midia-indoor-Lucas-Franca(slide2).png"
];

const ADVERTISEMENT_DURATION = 10000;

// Publicidades exclusivas do painel de clima (coluna esquerda).
const WEATHER_ADVERTISEMENTS = [
    "assets/ads/clima-anuncio-1.png",
    "assets/ads/clima-anuncio-2.png"
];

const ANNOUNCE_HERE_IMAGE =
    "assets/ads/anuncie-aqui.png";


// ========================================
// API DE NOTÍCIAS
// ========================================

const NEWS_API_URL =
    "https://billowing-thunder-176amediamvp.drigo-felipe.workers.dev";

// Clima
const WEATHER_API_URL = `${NEWS_API_URL}/weather`;

const WEATHER_UPDATE_DAYS = [1, 4]; // segunda e quinta
const WEATHER_UPDATE_HOUR = 5;
const WEATHER_UPDATE_MINUTE = 30;

// Segurança de atualização
const WEATHER_MAX_DAYS_WITHOUT_UPDATE = 4;
const WEATHER_MIN_INTERVAL_MS =
    24 * 60 * 60 * 1000;

const WEATHER_STORAGE_KEY = "mediaMvpWeather";
const WEATHER_LAST_UPDATE_KEY = "mediaMvpWeatherLastUpdate";

// ========================================
// DADOS
// ========================================

let news = [];

let weather = {
    location: "Itapetininga",
    updatedAt: null,
    forecast: []
};


// ========================================
// BUSCAR NOTÍCIAS
// ========================================

async function loadNews() {

    console.log(
        "Buscando notícias..."
    );

    try {

        const response =
            await fetch(
                NEWS_API_URL,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(data.news)
        ) {

            throw new Error(
                "Resposta inválida da API."
            );

        }


        const parsedNews =
            data.news
                .slice(0, NEWS_LIMIT)
                .filter(
                    item =>
                        item.title
                );


        if (
            parsedNews.length === 0
        ) {

            throw new Error(
                "Nenhuma notícia encontrada."
            );

        }


        news =
            parsedNews;


        console.log(
            `${news.length} notícias carregadas.`
        );


        // Monta os slides
        renderPlaylist();


    } catch (error) {

        console.warn(
            "Não foi possível atualizar as notícias:",
            error
        );


        // Se já temos notícias,
        // mantém a playlist atual.
        if (
            news.length > 0
        ) {

            console.log(
                "Mantendo últimas notícias válidas."
            );

        } else {

            renderPlaylist();

        }

    }

}

// ========================================
// BUSCAR CLIMA
// ========================================

function getLocalDateKey(date = new Date()) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function loadStoredWeather() {

    try {

        const stored =
            localStorage.getItem(
                WEATHER_STORAGE_KEY
            );

        if (!stored) {
            return false;
        }

        const parsed =
            JSON.parse(stored);

        if (
            !parsed ||
            !Array.isArray(
                parsed.forecast
            ) ||
            parsed.forecast.length === 0
        ) {
            return false;
        }

        weather = {
            location:
                parsed.location ||
                "Itapetininga",

            updatedAt:
                parsed.updatedAt ||
                null,

            forecast:
                parsed.forecast
        };

        console.log(
            "Previsão salva carregada do dispositivo."
        );

        return true;

    } catch (error) {

        console.warn(
            "Não foi possível carregar o clima salvo:",
            error
        );

        return false;
    }
}

async function loadWeather() {

    console.log(
        "Buscando previsão de 7 dias..."
    );

    try {

        const response =
            await fetch(
                WEATHER_API_URL,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        if (
            !data.success ||
            !Array.isArray(
                data.forecast
            ) ||
            data.forecast.length === 0
        ) {

            throw new Error(
                "Resposta inválida da API de clima."
            );

        }

        weather = {
            location:
                data.location ||
                "Itapetininga",

            updatedAt:
                data.updatedAt ||
                new Date().toISOString(),

            forecast:
                data.forecast.slice(0, 7)
        };

        localStorage.setItem(
            WEATHER_STORAGE_KEY,
            JSON.stringify(weather)
        );

        localStorage.setItem(
            WEATHER_LAST_UPDATE_KEY,
            new Date().toISOString()
        );

        console.log(
            "Previsão atualizada com sucesso."
        );

        renderPlaylist();

        return true;

    } catch (error) {

        console.warn(
            "Não foi possível atualizar o clima:",
            error
        );

        if (
            weather.forecast.length > 0
        ) {

            console.log(
                "Mantendo a última previsão válida."
            );

        } else {

            renderPlaylist();

        }

        return false;
    }
}

// ========================================
// INTERPRETAR CONDIÇÃO DO CLIMA
// ========================================

function getWeatherCondition(code) {

    const conditions = {

        // ========================================
        // SOL
        // ========================================

        1: {
            icon: "☀️",
            text: "Ensolarado"
        },

        2: {
            icon: "☀️",
            text: "Ensolarado"
        },


        // ========================================
        // PARCIALMENTE NUBLADO
        // ========================================

        3: {
            icon: "⛅",
            text: "Parcialmente nublado"
        },


        // ========================================
        // NUBLADO
        // ========================================

        4: {
            icon: "☁️",
            text: "Nublado"
        },

        5: {
            icon: "🌫️",
            text: "Neblina"
        },


        // ========================================
        // CHUVA
        // ========================================

        6: {
            icon: "🌧️",
            text: "Chuva"
        },

        7: {
            icon: "🌧️",
            text: "Chuva"
        },

        12: {
            icon: "🌧️",
            text: "Chuva"
        },

        14: {
            icon: "🌧️",
            text: "Chuva"
        },

        16: {
            icon: "🌧️",
            text: "Chuva"
        },


        // ========================================
        // TROVOADAS
        // ========================================

        8: {
            icon: "⛈️",
            text: "Trovoadas"
        },

        21: {
            icon: "⛈️",
            text: "Trovoadas"
        },

        22: {
            icon: "⛈️",
            text: "Trovoadas"
        },

        23: {
            icon: "⛈️",
            text: "Trovoadas"
        },

        24: {
            icon: "⛈️",
            text: "Trovoadas"
        },

        25: {
            icon: "⛈️",
            text: "Trovoadas"
        },


        // ========================================
        // POSSIBILIDADE DE GEADA
        // ========================================

        9: {
            icon: "🌧️",
            text: "Possibilidade de geada"
        },

        10: {
            icon: "🌧️",
            text: "Possibilidade de geada"
        },

        11: {
            icon: "🌧️",
            text: "Possibilidade de geada"
        },

        13: {
            icon: "🌧️",
            text: "Possibilidade de geada"
        },

        15: {
            icon: "🌧️",
            text: "Possibilidade de geada"
        },

        17: {
            icon: "🌧️",
            text: "Possibilidade de geada"
        },


        // ========================================
        // NUBLADO / COBERTO
        // ========================================

        18: {
            icon: "☁️",
            text: "Nublado"
        },

        19: {
            icon: "☁️",
            text: "Nublado"
        },

        20: {
            icon: "☁️",
            text: "Nublado"
        }

    };


    return (
        conditions[Number(code)] || {
            icon: "🌤️",
            text: "Condição variável"
        }
    );

}



// ========================================
// MONTAR PLAYLIST
// ========================================

function renderPlaylist() {

    weatherAdObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    weatherAdObjectUrls = [];
    player.innerHTML = "";


    // ====================================
    // NOTÍCIA 1
    // ====================================

    if (news[0]) {

        player.appendChild(
            createNewsSlide(
                news[0],
                1
            )
        );

    }


    // ====================================
    // NOTÍCIA 2
    // ====================================

    if (news[1]) {

        player.appendChild(
            createNewsSlide(
                news[1],
                2
            )
        );

    }
    // ====================================
    // PUBLICIDADE — ANTES DO CLIMA
    // ====================================

    if (ADVERTISEMENTS.length > 0) {

        player.appendChild(
            createAdvertisementSlide(
                ADVERTISEMENTS[0],
                1
        )
        );

    }

    // ====================================
    // CLIMA
    // ====================================

    player.appendChild(
        createWeatherSlide()
    );


    // ====================================
    // NOTÍCIA 3
    // ====================================

    if (news[2]) {

        player.appendChild(
            createNewsSlide(
                news[2],
                3
            )
        );

    }


    // ====================================
    // NOTÍCIA 4
    // ====================================

    if (news[3]) {

        player.appendChild(
            createNewsSlide(
                news[3],
                4
            )
        );

    }

    // ====================================
    // PUBLICIDADE — APÓS NOTÍCIAS
    // ====================================

    ADVERTISEMENTS
        .slice(1)
        .forEach(
            (imagePath, index) => {

                player.appendChild(
                    createAdvertisementSlide(
                        imagePath,
                        index + 2
                    )
                );

            }
        );



    // ====================================
    // NOTÍCIA 5
    // ====================================

    if (news[4]) {

        player.appendChild(
            createNewsSlide(
                news[4],
                5
            )
        );

    }

    // ====================================
    // ANUNCIE AQUI — FINAL DA RODADA
    // ====================================

    player.appendChild(
        createAnnounceHereSlide()
    );


    // Atualiza referência dos slides
    slides =
        Array.from(
            player.querySelectorAll(
                ".slide"
            )
        );


    console.log(
        `Playlist criada com ${slides.length} slides.`
    );


    // Se o player já estiver rodando,
    // garante que o índice continua válido.
    if (
        currentSlide >= slides.length
    ) {

        currentSlide = 0;

    }


    if (
        playerStarted &&
        slides.length > 0
    ) {

        showSlide(
            currentSlide
        );

    }

}


// Marca compacta reutilizada nos slides editoriais e de clima.
function createBrandMarkup(extraClass = "") {
    return `
        <div class="media-brand ${extraClass}" aria-label="MediaMVP">
            <svg viewBox="0 0 72 72" aria-hidden="true">
                <path d="M12 8 L12 64 L52 36 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round" />
                <path d="M53 18 Q67 36 53 54 M61 10 Q81 36 61 62" fill="none" stroke="#13baff" stroke-width="5" stroke-linecap="round" />
            </svg>
            <span>Media<span class="media-brand-accent">MVP</span></span>
        </div>
    `;
}

// ========================================
// CRIAR SLIDE DE NOTÍCIA
// ========================================

function createNewsSlide(
    item,
    number
) {

    const slide =
        document.createElement(
            "section"
        );

    slide.className =
        "slide news-slide";


    const date =
        formatNewsDate(
            item.pubDate
        );


    const description =
        item.description
            ? cleanDescription(
                item.description,
                item.title
            )
            : "Resumo não disponível.";


    const image =
        item.image
            ? `${NEWS_API_URL}/image?url=${encodeURIComponent(item.image)}`
            : null;


    slide.innerHTML = `

        <div class="news-wrapper">

            <div class="news-header">
                ${createBrandMarkup()}

                <span class="label">
                    NOTÍCIAS
                </span>

                <span class="news-counter">
                    ${number} / ${NEWS_LIMIT}
                </span>

            </div>


            <div class="news-layout">


                <!-- IMAGEM -->

                <div class="news-image">

                    ${
                        image
                            ? `
                                <img
                                    src="${escapeHtml(image)}"
                                    alt=""
                                >
                              `
                            : `
                                <div class="image-placeholder">

                                    <div class="placeholder-icon">
                                        🖼
                                    </div>

                                    <strong>
                                        IMAGEM NÃO DISPONÍVEL
                                    </strong>

                                </div>
                              `
                    }

                </div>


                <!-- TEXTO -->

                <div class="news-info">

                    <h1>
                        ${escapeHtml(
                            item.title
                        )}
                    </h1>


                    <p class="news-description">

                        ${escapeHtml(
                            description
                        )}

                    </p>


                    <div class="news-meta">

                        <span>
                            ${date}
                        </span>

                        <span>
                            Fonte:
                            G1 Itapetininga e Região
                        </span>

                    </div>

                </div>

            </div>

        </div>

    `;


    // ====================================
    // FALLBACK DA IMAGEM
    // ====================================

    const imageElement =
        slide.querySelector(
            ".news-image img"
        );


    if (imageElement) {

        imageElement.addEventListener(
            "error",
            () => {

                const container =
                    imageElement.parentElement;


                container.innerHTML = `

                    <div class="image-placeholder">

                        <div class="placeholder-icon">
                            🖼
                        </div>

                        <strong>
                            IMAGEM NÃO DISPONÍVEL
                        </strong>

                    </div>

                `;

            }
        );

    }


    return slide;

}


// ========================================
// SLIDE DE CLIMA
// ========================================

function createWeatherSlide() {
    const slide = document.createElement("section");
    slide.className = "slide weather-slide";

    const forecast = Array.isArray(weather.forecast)
        ? weather.forecast.slice(0, 7)
        : [];

    const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
    const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

    const cards = forecast.map((day) => {
        const date = new Date(`${day.date}T12:00:00`);
        const condition = getWeatherCondition(day.conditionCode);
        const weekday = weekdayFormatter.format(date).replace(".", "").substring(0, 3).toUpperCase();
        const dateLabel = dateFormatter.format(date);
        const max = Number.isFinite(Number(day.max)) ? Math.round(Number(day.max)) : "--";
        const min = Number.isFinite(Number(day.min)) ? Math.round(Number(day.min)) : "--";

        return `
            <article class="weather-day">
                <div class="weather-day-heading">
                    <strong>${weekday}</strong>
                    <span>${dateLabel}</span>
                </div>
                <div class="weather-day-icon" aria-hidden="true">${condition.icon}</div>
                <div class="weather-day-condition">${escapeHtml(condition.text)}</div>
                <div class="weather-day-temp"><strong>${max}°</strong><span>${min}°</span></div>
            </article>
        `;
    }).join("");

    let updatedLabel = "Atualização pendente";
    if (weather.updatedAt) {
        const updatedDate = new Date(weather.updatedAt);
        if (!Number.isNaN(updatedDate.getTime())) {
            updatedLabel = new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
            }).format(updatedDate);
        }
    }

    const adMarkup = WEATHER_ADVERTISEMENTS.map((_, index) => `
        <div class="weather-ad-slot" data-ad-slot="${index + 1}"></div>
    `).join("");

    slide.innerHTML = `
        <aside class="weather-ad-column" aria-label="Espaços publicitários">
            ${adMarkup}
        </aside>
        <section class="weather-dashboard" aria-label="Previsão do tempo">
            <header class="weather-dashboard-header">
                <div>
                    <span class="weather-eyebrow">PREVISÃO DO TEMPO</span>
                    <h1>${escapeHtml(weather.location || "Itapetininga")} <span>— SP</span></h1>
                </div>
                ${createBrandMarkup("media-brand-weather")}
            </header>
            <div class="weather-panel-title">
                <span>Próximos 7 dias</span>
                <span class="weather-live-indicator"><i></i> Acompanhe a previsão</span>
            </div>
            <div class="weather-forecast">
                ${cards || '<div class="weather-empty">Previsão indisponível no momento</div>'}
            </div>
            <footer class="weather-updated">Última atualização: ${updatedLabel}</footer>
        </section>
    `;

    slide.querySelectorAll(".weather-ad-slot").forEach((slot, index) => {
        void loadWeatherAdvertisement(
            slot,
            WEATHER_ADVERTISEMENTS[index],
            index + 1
        );
    });

    return slide;
}

async function loadWeatherAdvertisement(slot, imagePath, number) {
    try {
        const response = await fetch(imagePath, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const imageUrl = URL.createObjectURL(await response.blob());
        if (!slot.isConnected) {
            URL.revokeObjectURL(imageUrl);
            return;
        }

        const image = document.createElement("img");
        image.className = "weather-ad-image";
        image.alt = `Publicidade ${number}`;
        image.addEventListener("error", () => {
            console.error(`Falha ao exibir publicidade ${number}:`, imagePath);
            slot.classList.add("is-empty");
            image.remove();
            URL.revokeObjectURL(imageUrl);
            weatherAdObjectUrls = weatherAdObjectUrls.filter((url) => url !== imageUrl);
        }, { once: true });

        weatherAdObjectUrls.push(imageUrl);
        image.src = imageUrl;
        slot.appendChild(image);
    } catch (error) {
        console.error(`Falha ao carregar publicidade ${number}:`, imagePath, error);
        slot.classList.add("is-empty");
    }
}


// ========================================
// SLIDE DE PUBLICIDADE
// ========================================

function createAdvertisementSlide(imagePath, number) {

    const slide =
        document.createElement("section");

    slide.className =
        "slide advertisement-image-slide";

    slide.dataset.duration =
        ADVERTISEMENT_DURATION;

    slide.innerHTML = `
        <img src="${escapeHtml(imagePath)}" alt="" class="advertisement-backdrop" aria-hidden="true">
        <img src="${escapeHtml(imagePath)}" alt="Publicidade" class="advertisement-image">
        ${createBrandMarkup("media-brand-ad")}
    `;

    return slide;
}

function appendAdvertisementSlides() {

    ADVERTISEMENTS.forEach(
        (imagePath, index) => {

            player.appendChild(
                createAdvertisementSlide(
                    imagePath,
                    index + 1
                )
            );

        }
    );

}

// ========================================
// SLIDE ANUNCIE AQUI
// ========================================

function createAnnounceHereSlide() {

    const slide =
        document.createElement(
            "section"
        );

    slide.className =
        "slide advertisement-image-slide";

    slide.dataset.duration =
        ADVERTISEMENT_DURATION;

    slide.innerHTML = `
        <img src="${escapeHtml(ANNOUNCE_HERE_IMAGE)}" alt="" class="advertisement-backdrop" aria-hidden="true">
        <img src="${escapeHtml(ANNOUNCE_HERE_IMAGE)}" alt="Anuncie Aqui" class="advertisement-image">
        ${createBrandMarkup("media-brand-ad")}
    `;

    return slide;

}


// ========================================
// FORMATAR DATA
// ========================================

function formatNewsDate(
    pubDate
) {

    if (!pubDate) {

        return "";

    }


    const date =
        new Date(pubDate);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);

}

// ========================================
// LIMPAR E RESUMIR DESCRIÇÃO DA NOTÍCIA
// ========================================

function cleanDescription(
    text,
    title = ""
) {

    if (!text) {

        return "";

    }


    // Remove HTML
    let value =
        text
            .replace(
                /<[^>]*>/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    // Remove conteúdos extras
    // normalmente encontrados no RSS do G1.
    const stopMarkers = [
        "📲 Participe do canal",
        "Initial plugin text",
        "LEIA TAMBÉM:",
        "Veja mais informações",
        "Veja mais notícias",
        "VÍDEOS: assista às reportagens"
    ];


    for (
        const marker of stopMarkers
    ) {

        const index =
            value.indexOf(marker);


        if (
            index !== -1
        ) {

            value =
                value
                    .substring(
                        0,
                        index
                    )
                    .trim();

        }

    }


    // Evita repetir o título
    // caso o RSS comece a descrição com ele.
    if (title) {

        const normalizedTitle =
            title
                .trim()
                .toLowerCase();


        const normalizedValue =
            value.toLowerCase();


        if (
            normalizedValue.startsWith(
                normalizedTitle
            )
        ) {

            value =
                value
                    .substring(
                        title.length
                    )
                    .trim();

        }

    }


    // Divide o texto em frases.
    const sentences =
        value
            .match(
                /[^.!?]+[.!?]+/g
            )
            ?.map(
                sentence =>
                    sentence.trim()
            )
            .filter(
                Boolean
            ) || [];


    // Mantém no máximo duas frases.
    let summary =
        sentences
            .slice(
                0,
                2
            )
            .join(" ");


    // Fallback caso o texto
    // não tenha pontuação reconhecível.
    if (!summary) {

        summary =
            value;

    }


    // Limite adicional de segurança.
    const MAX_LENGTH = 220;


    if (
        summary.length >
        MAX_LENGTH
    ) {

        summary =
            summary.substring(
                0,
                MAX_LENGTH
            );


        const lastSpace =
            summary.lastIndexOf(
                " "
            );


        if (
            lastSpace > 150
        ) {

            summary =
                summary.substring(
                    0,
                    lastSpace
                );

        }


        summary += "...";

    }


    return summary;

}

// ========================================
// LIMITAR TEXTO
// ========================================

function limitText(
    text,
    maxLength
) {

    if (
        text.length <= maxLength
    ) {

        return text;

    }


    return (
        text
            .substring(
                0,
                maxLength
            )
            .trim() +
        "..."
    );

}


// ========================================
// ESCAPAR HTML
// ========================================

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text || "";


    return div.innerHTML;

}


// ========================================
// FULLSCREEN
// ========================================

async function enterFullscreen() {

    try {

        if (
            !document.fullscreenElement
        ) {

            await document.documentElement
                .requestFullscreen();

        }

    } catch (error) {

        console.warn(
            "Não foi possível entrar em tela cheia:",
            error
        );

    }

}


// ========================================
// WAKE LOCK
// ========================================

async function requestWakeLock() {

    if (
        !("wakeLock" in navigator)
    ) {

        console.warn(
            "Wake Lock não é suportado neste navegador."
        );

        return;

    }


    try {

        wakeLock =
            await navigator.wakeLock.request(
                "screen"
            );


        console.log(
            "Wake Lock ativado."
        );


        wakeLock.addEventListener(
            "release",
            () => {

                console.log(
                    "Wake Lock liberado."
                );

            }
        );


    } catch (error) {

        console.warn(
            "Não foi possível ativar o Wake Lock:",
            error
        );

    }

}


// ========================================
// RECUPERAR WAKE LOCK
// ========================================

async function restoreWakeLock() {

    if (
        playerStarted &&
        document.visibilityState ===
            "visible"
    ) {

        await requestWakeLock();

    }

}


// ========================================
// MOSTRAR SLIDE
// ========================================

function showSlide(
    index
) {

    if (
        slides.length === 0
    ) {

        return;

    }


    slides.forEach(
        (slide, i) => {

            slide.classList.toggle(
                "active",
                i === index
            );

        }
    );


    // ========================================
    // DURAÇÃO DO SLIDE
    // ========================================

    const currentSlide =
        slides[index];

    const slideDuration =
        Number(
            currentSlide?.dataset.duration
        ) || SLIDE_DURATION;


    // ========================================
    // RESET DA BARRA DE PROGRESSO
    // ========================================

    progress.style.transition =
        "none";

    progress.style.width =
        "0%";


    // ========================================
    // ANIMAÇÃO DA BARRA
    // ========================================

    requestAnimationFrame(
        () => {

            requestAnimationFrame(
                () => {

                    progress.style.transition =
                        `width ${slideDuration}ms linear`;

                    progress.style.width =
                        "100%";

                }
            );

        }
    );

}


// ========================================
// PRÓXIMO SLIDE
// ========================================

function nextSlide() {

    if (
        slides.length === 0
    ) {

        return;

    }


    currentSlide++;


    if (
        currentSlide >=
        slides.length
    ) {

        currentSlide = 0;

    }


    showSlide(
        currentSlide
    );

}


// ========================================
// INICIAR PLAYER
// ========================================

async function startPlayer() {

    if (
        playerStarted
    ) {

        return;

    }


    playerStarted = true;


    console.log(
        "Iniciando Media Player..."
    );


    await enterFullscreen();


    await requestWakeLock();


    startScreen.style.display =
        "none";


    currentSlide = 0;


    showSlide(
        currentSlide
    );


    slideTimer =
        setInterval(
            nextSlide,
            SLIDE_DURATION
        );

}


// ========================================
// BOTÃO INICIAR
// ========================================

startButton.addEventListener(
    "click",
    startPlayer
);


// ========================================
// VISIBILIDADE
// ========================================

document.addEventListener(
    "visibilitychange",
    restoreWakeLock
);


// ========================================
// ATUALIZAÇÃO DE NOTÍCIAS
// ========================================

function startNewsUpdater() {

    setInterval(
        loadNews,
        NEWS_UPDATE_INTERVAL
    );

}
// ========================================
// ATUALIZAÇÃO DO CLIMA
// ========================================

function shouldUpdateWeather() {

    const now =
        new Date();

    const day =
        now.getDay();

    const hour =
        now.getHours();

    const minute =
        now.getMinutes();

    const lastUpdate =
        localStorage.getItem(
            WEATHER_LAST_UPDATE_KEY
        );

    // ========================================
    // SEM REGISTRO DE ATUALIZAÇÃO
    // ========================================

    if (!lastUpdate) {

        return true;

    }

    const lastUpdateTime =
        new Date(lastUpdate).getTime();

    if (
        !Number.isFinite(
            lastUpdateTime
        )
    ) {

        return true;

    }

    const elapsed =
        Date.now() -
        lastUpdateTime;


    // ========================================
    // PROTEÇÃO DE 24 HORAS
    // ========================================

    if (
        elapsed <
        WEATHER_MIN_INTERVAL_MS
    ) {

        return false;

    }


    // ========================================
    // ATUALIZAÇÃO PROGRAMADA
    // SEGUNDA / QUINTA ÀS 05:30
    // ========================================

    const isUpdateDay =
        WEATHER_UPDATE_DAYS.includes(
            day
        );

    const isAfterScheduledTime =
        hour >
            WEATHER_UPDATE_HOUR ||
        (
            hour ===
                WEATHER_UPDATE_HOUR &&
            minute >=
                WEATHER_UPDATE_MINUTE
        );

    if (
        isUpdateDay &&
        isAfterScheduledTime
    ) {

        return true;

    }


    // ========================================
    // ATUALIZAÇÃO DE SEGURANÇA
    // MAIS DE 4 DIAS SEM ATUALIZAR
    // ========================================

    const maxInterval =
        WEATHER_MAX_DAYS_WITHOUT_UPDATE *
        24 *
        60 *
        60 *
        1000;

    if (
        elapsed >=
        maxInterval
    ) {

        return true;

    }

    return false;
}

function getNextWeatherUpdate() {

    const now =
        new Date();

    const candidate =
        new Date(now);

    candidate.setHours(
        WEATHER_UPDATE_HOUR,
        WEATHER_UPDATE_MINUTE,
        0,
        0
    );

    if (
        WEATHER_UPDATE_DAYS.includes(
            now.getDay()
        ) &&
        now < candidate
    ) {

        return candidate;
    }

    for (
        let days = 1;
        days <= 7;
        days++
    ) {

        const next =
            new Date(now);

        next.setDate(
            now.getDate() + days
        );

        if (
            WEATHER_UPDATE_DAYS.includes(
                next.getDay()
            )
        ) {

            next.setHours(
                WEATHER_UPDATE_HOUR,
                WEATHER_UPDATE_MINUTE,
                0,
                0
            );

            return next;
        }
    }

    return null;
}

function startWeatherUpdater() {

    const hasStoredWeather =
        loadStoredWeather();

    if (
        !hasStoredWeather
    ) {

        console.log(
            "Nenhuma previsão local encontrada. " +
            "Executando atualização inicial."
        );

        loadWeather();

    } else if (
        shouldUpdateWeather()
    ) {

        loadWeather();

    }

    scheduleNextWeatherUpdate();
}

function scheduleNextWeatherUpdate() {

    const next =
        getNextWeatherUpdate();

    if (!next) {

        return;

    }

    const delay =
        Math.max(
            1000,
            next.getTime() -
                Date.now()
        );

    console.log(
        "Próxima atualização do clima:",
        next.toLocaleString(
            "pt-BR"
        )
    );

    setTimeout(
        async () => {

            if (
                shouldUpdateWeather()
            ) {

                console.log(
                    "Executando atualização programada do clima."
                );

                await loadWeather();

            }

            scheduleNextWeatherUpdate();

        },
        delay
    );
}


// ========================================
// INICIALIZAÇÃO
// ========================================

loadNews();

startNewsUpdater();

startWeatherUpdater();


console.log(
    "MVP aguardando início."
);


// ============================================================
// MEDIAMVP — ANALYTICS LOCAL
// ============================================================
// Integração adicionada sobre o player existente.
// Não altera a lógica de notícias, clima, playlist, anúncios,
// Wake Lock ou Fullscreen.
//
// Storage:
//     mediamvp_analytics
//
// O namespace window.mediaMVP.analytics também é exposto para
// diagnóstico e compatibilidade com o painel administrativo.
// ============================================================

(function initMediaMVPAnalytics() {

    "use strict";

    const STORAGE_KEY = "mediamvp_analytics";
    const HEARTBEAT_MS = 60 * 1000;
    const POLL_MS = 250;
    const MAX_SESSIONS = 100;
    const MAX_EVENTS = 2000;

    let session = null;
    let activeSlideId = null;
    let activeSlideStartedAt = null;
    let paused = false;
    let heartbeatTimer = null;
    let pollTimer = null;

    function now() {
        return Date.now();
    }

    function iso() {
        return new Date().toISOString();
    }

    function id(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function emptyData() {
        return {
            totalActiveTime: 0,
            sessions: [],
            slides: [],
            advertisements: {},
            events: [],
            lastActivity: null
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return emptyData();
            }

            const data = JSON.parse(raw);

            return {
                totalActiveTime:
                    Number(data.totalActiveTime) || 0,

                sessions:
                    Array.isArray(data.sessions)
                        ? data.sessions
                        : [],

                slides:
                    Array.isArray(data.slides)
                        ? data.slides
                        : [],

                advertisements:
                    data.advertisements &&
                    typeof data.advertisements === "object"
                        ? data.advertisements
                        : {},

                events:
                    Array.isArray(data.events)
                        ? data.events
                        : [],

                lastActivity:
                    data.lastActivity || null
            };
        } catch (error) {
            console.warn(
                "[MediaMVP Analytics] Falha ao ler dados:",
                error
            );

            return emptyData();
        }
    }

    function save(data) {
        try {
            data.lastActivity = iso();

            if (
                data.sessions.length >
                MAX_SESSIONS
            ) {
                data.sessions =
                    data.sessions.slice(
                        -MAX_SESSIONS
                    );
            }

            if (
                data.events.length >
                MAX_EVENTS
            ) {
                data.events =
                    data.events.slice(
                        -MAX_EVENTS
                    );
            }

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );
        } catch (error) {
            console.warn(
                "[MediaMVP Analytics] Falha ao salvar dados:",
                error
            );
        }
    }

    function addEvent(
        type,
        payload = {}
    ) {
        const data = load();

        data.events.push({
            id: id("evt"),
            type,
            timestamp: iso(),
            sessionId:
                session?.id || null,
            ...payload
        });

        save(data);
    }

    function getDevice() {
        return /Android/i.test(
            navigator.userAgent || ""
        )
            ? "Tablet Android"
            : "Navegador";
    }

    function getSlideId(
        slide,
        index
    ) {
        if (!slide) {
            return `slide-${index}`;
        }

        if (
            slide.dataset.analyticsId
        ) {
            return slide.dataset.analyticsId;
        }

        if (
            slide.classList.contains(
                "weather-slide"
            )
        ) {
            slide.dataset.analyticsId =
                "weather";

            return "weather";
        }

        if (
            slide.classList.contains(
                "news-slide"
            )
        ) {
            slide.dataset.analyticsId =
                `news-${index}`;

            return slide.dataset.analyticsId;
        }

        if (
            slide.classList.contains(
                "advertisement-image-slide"
            )
        ) {
            const img =
                slide.querySelector(
                    ".advertisement-image"
                );

            const src =
                img?.getAttribute("src") ||
                "";

            if (
                src ===
                ANNOUNCE_HERE_IMAGE
            ) {
                slide.dataset.analyticsId =
                    "announce-here";

                return "announce-here";
            }

            const filename =
                src
                    .split("/")
                    .pop()
                    .split("?")[0]
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        "-"
                    );

            slide.dataset.analyticsId =
                filename
                    ? `ad-${filename}`
                    : `advertisement-${index}`;

            return slide.dataset.analyticsId;
        }

        slide.dataset.analyticsId =
            `slide-${index}`;

        return slide.dataset.analyticsId;
    }

    function getSlideName(
        slide,
        index
    ) {
        if (!slide) {
            return `Slide ${index + 1}`;
        }

        if (
            slide.classList.contains(
                "weather-slide"
            )
        ) {
            return "Clima";
        }

        if (
            slide.classList.contains(
                "news-slide"
            )
        ) {
            const title =
                slide
                    .querySelector(
                        ".news-info h1"
                    )
                    ?.textContent
                    ?.trim();

            return title
                ? `Notícia: ${title}`
                : `Notícia ${index + 1}`;
        }

        if (
            slide.classList.contains(
                "advertisement-image-slide"
            )
        ) {
            const img =
                slide.querySelector(
                    ".advertisement-image"
                );

            const src =
                img?.getAttribute(
                    "src"
                ) || "";

            if (
                src ===
                ANNOUNCE_HERE_IMAGE
            ) {
                return "Anuncie Aqui";
            }

            return (
                src
                    .split("/")
                    .pop()
                    .split("?")[0] ||
                `Publicidade ${index + 1}`
            );
        }

        return (
            slide.textContent
                ?.trim()
                .slice(0, 80) ||
            `Slide ${index + 1}`
        );
    }

    function getAdvertisements(
        slide
    ) {
        if (!slide) {
            return [];
        }

        const advertisements = [];

        /*
         * Publicidade comercial normal.
         */
        if (
            slide.classList.contains(
                "advertisement-image-slide"
            )
        ) {
            const img =
                slide.querySelector(
                    ".advertisement-image"
                );

            const src =
                img?.getAttribute(
                    "src"
                ) || "";

            /*
             * "Anuncie Aqui" é comunicação
             * própria do MediaMVP e não deve
             * poluir as métricas comerciais.
             */
            if (
                src &&
                src !==
                    ANNOUNCE_HERE_IMAGE
            ) {
                const filename =
                    src
                        .split("/")
                        .pop()
                        .split("?")[0]
                        .replace(
                            /[^a-zA-Z0-9_-]/g,
                            "-"
                        );

                advertisements.push({
                    id:
                        filename
                            ? `ad-${filename}`
                            : "advertisement",

                    name:
                        src
                            .split("/")
                            .pop()
                            .split("?")[0] ||
                        "Publicidade",

                    image:
                        src
                });
            }
        }

        /*
         * As duas peças do clima ficam
         * visíveis ao mesmo tempo.
         */
        if (
            slide.classList.contains(
                "weather-slide"
            )
        ) {
            WEATHER_ADVERTISEMENTS.forEach(
                (
                    src,
                    index
                ) => {
                    advertisements.push({
                        id:
                            `weather-ad-${index + 1}`,

                        name:
                            src
                                .split("/")
                                .pop()
                                .split("?")[0] ||
                            `Publicidade clima ${index + 1}`,

                        image:
                            src
                    });
                }
            );
        }

        return advertisements;
    }

    function ensureSlideRecord(
        data,
        slide,
        index
    ) {
        const slideId =
            getSlideId(
                slide,
                index
            );

        let record =
            data.slides.find(
                item =>
                    item.id ===
                    slideId
            );

        if (!record) {
            record = {
                id:
                    slideId,

                name:
                    getSlideName(
                        slide,
                        index
                    ),

                views:
                    0,

                totalDisplayTime:
                    0,

                lastView:
                    null
            };

            data.slides.push(
                record
            );
        }

        return record;
    }

    function registerSlideView(
        slide,
        index
    ) {
        const data = load();

        const record =
            ensureSlideRecord(
                data,
                slide,
                index
            );

        record.views += 1;
        record.lastView =
            iso();

        save(data);

        addEvent(
            "slide_view",
            {
                slideId:
                    record.id,

                slideName:
                    record.name
            }
        );

        getAdvertisements(
            slide
        ).forEach(
            registerAdvertisementImpression
        );
    }

    function registerAdvertisementImpression(
        advertisement
    ) {
        const data = load();

        if (
            !data.advertisements[
                advertisement.id
            ]
        ) {
            data.advertisements[
                advertisement.id
            ] = {
                id:
                    advertisement.id,

                name:
                    advertisement.name,

                image:
                    advertisement.image,

                impressions:
                    0,

                displayTime:
                    0,

                lastDisplay:
                    null
            };
        }

        const record =
            data.advertisements[
                advertisement.id
            ];

        record.impressions += 1;
        record.lastDisplay =
            iso();

        save(data);

        addEvent(
            "advertisement_impression",
            {
                advertisementId:
                    advertisement.id,

                advertisementName:
                    advertisement.name
            }
        );
    }

    function addDisplayTime(
        slide,
        seconds
    ) {
        if (
            !slide ||
            seconds <= 0
        ) {
            return;
        }

        const data = load();

        const record =
            ensureSlideRecord(
                data,
                slide,
                0
            );

        record.totalDisplayTime +=
            seconds;

        getAdvertisements(
            slide
        ).forEach(
            advertisement => {
                if (
                    !data.advertisements[
                        advertisement.id
                    ]
                ) {
                    data.advertisements[
                        advertisement.id
                    ] = {
                        id:
                            advertisement.id,

                        name:
                            advertisement.name,

                        image:
                            advertisement.image,

                        impressions:
                            0,

                        displayTime:
                            0,

                        lastDisplay:
                            null
                    };
                }

                data.advertisements[
                    advertisement.id
                ].displayTime +=
                    seconds;
            }
        );

        save(data);
    }

    function getActiveSlide() {
        if (
            !player
        ) {
            return null;
        }

        const active =
            player.querySelector(
                ".slide.active"
            );

        if (!active) {
            return null;
        }

        const index =
            slides.indexOf(
                active
            );

        return {
            slide:
                active,

            index:
                index >= 0
                    ? index
                    : 0
        };
    }

    function finishCurrentSlide() {
        if (
            !activeSlideId ||
            !activeSlideStartedAt
        ) {
            return;
        }

        const active =
            getActiveSlide();

        if (
            active &&
            getSlideId(
                active.slide,
                active.index
            ) ===
                activeSlideId
        ) {
            const seconds =
                Math.max(
                    0,
                    (
                        now() -
                        activeSlideStartedAt
                    ) / 1000
                );

            addDisplayTime(
                active.slide,
                seconds
            );
        }

        activeSlideId =
            null;

        activeSlideStartedAt =
            null;
    }

    function startTrackingActiveSlide() {
        if (
            !session ||
            paused
        ) {
            return;
        }

        const active =
            getActiveSlide();

        if (!active) {
            return;
        }

        const newId =
            getSlideId(
                active.slide,
                active.index
            );

        /*
         * Mesmo slide = não gerar
         * nova impressão.
         *
         * Isso é importante quando
         * renderPlaylist() reconstrói
         * os elementos HTML.
         */
        if (
            activeSlideId ===
                newId &&
            activeSlideStartedAt
        ) {
            return;
        }

        finishCurrentSlide();

        activeSlideId =
            newId;

        activeSlideStartedAt =
            now();

        registerSlideView(
            active.slide,
            active.index
        );
    }

    function accumulateSessionTime() {
        if (
            !session ||
            !session.activeStartedAt
        ) {
            return;
        }

        const elapsed =
            Math.max(
                0,
                (
                    now() -
                    session.activeStartedAt
                ) / 1000
            );

        session.duration +=
            elapsed;

        session.activeStartedAt =
            now();
    }

    function startSession() {
        if (
            session
        ) {
            return;
        }

        const data =
            load();

        session = {
            id:
                id("session"),

            start:
                iso(),

            end:
                null,

            duration:
                0,

            slides:
                0,

            device:
                getDevice(),

            activeStartedAt:
                now()
        };

        data.sessions.push({
            id:
                session.id,

            start:
                session.start,

            end:
                null,

            duration:
                0,

            slides:
                0,

            device:
                session.device
        });

        save(data);

        paused =
            false;

        addEvent(
            "session_start"
        );

        startHeartbeat();

        setTimeout(
            startTrackingActiveSlide,
            100
        );
    }

    function pauseSession(
        reason
    ) {
        if (
            !session ||
            paused
        ) {
            return;
        }

        finishCurrentSlide();
        accumulateSessionTime();

        const data =
            load();

        const saved =
            data.sessions.find(
                item =>
                    item.id ===
                    session.id
            );

        if (saved) {
            saved.duration =
                session.duration;

            saved.lastActivity =
                iso();
        }

        save(data);

        session.activeStartedAt =
            null;

        paused =
            true;

        addEvent(
            "session_pause",
            {
                reason:
                    reason ||
                    "page_hidden"
            }
        );
    }

    function resumeSession() {
        if (
            !session ||
            !paused
        ) {
            return;
        }

        session.activeStartedAt =
            now();

        paused =
            false;

        addEvent(
            "session_resume"
        );

        setTimeout(
            startTrackingActiveSlide,
            100
        );
    }

    function endSession(
        reason
    ) {
        if (
            !session
        ) {
            return;
        }

        finishCurrentSlide();

        if (
            !paused
        ) {
            accumulateSessionTime();
        }

        const data =
            load();

        const saved =
            data.sessions.find(
                item =>
                    item.id ===
                    session.id
            );

        if (saved) {
            saved.end =
                iso();

            saved.duration =
                session.duration;

            saved.slides =
                countSessionSlides(
                    session.id,
                    data
                );

            saved.endReason =
                reason ||
                "unknown";
        }

        data.totalActiveTime =
            data.sessions.reduce(
                (
                    total,
                    item
                ) => {
                    if (
                        item.id ===
                        session.id
                    ) {
                        return (
                            total +
                            session.duration
                        );
                    }

                    return (
                        total +
                        (
                            Number(
                                item.duration
                            ) || 0
                        )
                    );
                },
                0
            );

        save(data);

        addEvent(
            "session_end",
            {
                reason:
                    reason ||
                    "unknown",

                duration:
                    session.duration
            }
        );

        stopHeartbeat();

        session =
            null;

        activeSlideId =
            null;

        activeSlideStartedAt =
            null;

        paused =
            false;
    }

    function countSessionSlides(
        sessionId,
        data
    ) {
        return data.events.filter(
            event =>
                event.sessionId ===
                    sessionId &&
                event.type ===
                    "slide_view"
        ).length;
    }

    function startHeartbeat() {
        stopHeartbeat();

        heartbeatTimer =
            setInterval(
                () => {
                    if (
                        !session ||
                        paused ||
                        document.hidden
                    ) {
                        return;
                    }

                    accumulateSessionTime();

                    const data =
                        load();

                    const saved =
                        data.sessions.find(
                            item =>
                                item.id ===
                                session.id
                        );

                    if (saved) {
                        saved.duration =
                            session.duration;

                        saved.lastActivity =
                            iso();
                    }

                    /*
                     * O total é recalculado a partir
                     * das sessões já encerradas + a
                     * sessão atual.
                     */
                    data.totalActiveTime =
                        data.sessions.reduce(
                            (
                                total,
                                item
                            ) =>
                                total +
                                (
                                    item.id ===
                                    session.id
                                        ? session.duration
                                        : Number(
                                            item.duration
                                        ) || 0
                                ),
                            0
                        );

                    save(data);
                },
                HEARTBEAT_MS
            );
    }

    function stopHeartbeat() {
        if (
            heartbeatTimer
        ) {
            clearInterval(
                heartbeatTimer
            );

            heartbeatTimer =
                null;
        }
    }

    function poll() {
        if (
            typeof playerStarted !==
            "undefined" &&
            playerStarted
        ) {
            if (
                !session
            ) {
                startSession();
            }

            if (
                !paused &&
                !document.hidden
            ) {
                startTrackingActiveSlide();
            }
        }

        pollTimer =
            setTimeout(
                poll,
                POLL_MS
            );
    }

    function handleVisibility() {
        if (
            document.hidden
        ) {
            pauseSession(
                "page_hidden"
            );

            return;
        }

        if (
            typeof playerStarted !==
                "undefined" &&
            playerStarted
        ) {
            if (
                session
            ) {
                resumeSession();
            } else {
                startSession();
            }
        }
    }

    function handlePageHide() {
        endSession(
            "page_unload"
        );
    }

    /*
     * Recupera uma sessão antiga que tenha
     * ficado aberta por fechamento abrupto.
     *
     * Não inventamos tempo após o último
     * heartbeat; encerramos no último
     * instante registrado.
     */
    function recoverOpenSession() {
        const data =
            load();

        let changed =
            false;

        data.sessions.forEach(
            item => {
                if (
                    !item.end
                ) {
                    item.end =
                        item.lastActivity ||
                        item.start;

                    item.duration =
                        Number(
                            item.duration
                        ) || 0;

                    item.endReason =
                        "recovered";

                    changed =
                        true;
                }
            }
        );

        if (changed) {
            data.totalActiveTime =
                data.sessions.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        (
                            Number(
                                item.duration
                            ) || 0
                        ),
                    0
                );

            save(data);
        }
    }

    function exposeDebugApi() {
        window.mediaMVP =
            window.mediaMVP ||
            {};

        window.mediaMVP.analytics = {
            getData:
                () =>
                    load(),

            clear:
                () => {
                    localStorage.removeItem(
                        STORAGE_KEY
                    );
                },

            endSession:
                () =>
                    endSession(
                        "manual"
                    )
        };
    }

    recoverOpenSession();
    exposeDebugApi();

    document.addEventListener(
        "visibilitychange",
        handleVisibility
    );

    window.addEventListener(
        "pagehide",
        handlePageHide
    );

    /*
     * Começa a observar o player sem
     * interferir no código existente.
     */
    pollTimer =
        setTimeout(
            poll,
            POLL_MS
        );

    console.log(
        "[MediaMVP Analytics] Analytics local inicializado."
    );

})();