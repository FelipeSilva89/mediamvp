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




// ========================================
// ESTADO DO PLAYER
// ========================================

let slides = [];

let currentSlide = 0;

let playerStarted = false;

let slideTimer = null;

let wakeLock = null;


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
    "assets/ads/midia-indoor-Lucas-Franca(slide).png"
];

const ADVERTISEMENT_DURATION = 7000;


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
            getLocalDateKey()
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
    // PUBLICIDADE
    // ====================================

    appendAdvertisementSlides();


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

    const slide =
        document.createElement(
            "section"
        );

    slide.className =
        "slide weather-slide";

    const forecast =
        Array.isArray(
            weather.forecast
        )
            ? weather.forecast
                .slice(0, 7)
            : [];

    const weekdayFormatter =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                weekday: "short"
            }
        );

    const dateFormatter =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit"
            }
        );

    const cards =
        forecast
            .map(
                day => {

                    const date =
                        new Date(
                            `${day.date}T12:00:00`
                        );

                    const condition =
                        getWeatherCondition(
                            day.conditionCode
                        );

                    const weekday =
                        weekdayFormatter
                            .format(date)
                            .replace(
                                ".",
                                ""
                            )
                            .substring(
                                0,
                                3
                            )
                            .toUpperCase();

                    const dateLabel =
                        dateFormatter
                            .format(date);

                    const max =
                        Number.isFinite(
                            Number(day.max)
                        )
                            ? Math.round(
                                Number(day.max)
                            )
                            : "--";

                    const min =
                        Number.isFinite(
                            Number(day.min)
                        )
                            ? Math.round(
                                Number(day.min)
                            )
                            : "--";

                    return `
                        <div class="weather-day">

                            <div class="weather-day-name">
                                ${weekday}
                            </div>

                            <div class="weather-day-date">
                                ${dateLabel}
                            </div>

                            <div class="weather-day-icon">
                                ${condition.icon}
                            </div>

                            <div class="weather-day-condition">
                                ${escapeHtml(
                                    condition.text
                                )}
                            </div>

                            <div class="weather-day-temp">
                                <strong>
                                    ${max}°
                                </strong>

                                <span>
                                    ${min}°
                                </span>
                            </div>

                        </div>
                    `;
                }
            )
            .join("");

    let updatedLabel =
        "Atualização pendente";

    if (
        weather.updatedAt
    ) {

        const updatedDate =
            new Date(
                weather.updatedAt
            );

        if (
            !Number.isNaN(
                updatedDate.getTime()
            )
        ) {

            updatedLabel =
                new Intl.DateTimeFormat(
                    "pt-BR",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                ).format(
                    updatedDate
                );
        }
    }

    slide.innerHTML = `

        <div class="weather-container">

            <div class="weather-header">

                <span class="label">CLIMA</span>

                <div class="weather-location">
                     ${escapeHtml(weather.location || "Itapetininga")} - SP
            </div>

        </div>

            <div class="weather-title">
                PREVISÃO DOS PRÓXIMOS 7 DIAS
            </div>

            <div class="weather-forecast">

                ${
                    cards ||
                    `
                        <div class="weather-empty">
                            Previsão indisponível
                        </div>
                    `
                }

            </div>

            <div class="weather-updated">
                Atualizado em: ${updatedLabel}
            </div>

        </div>

    `;

    return slide;
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
        <img
            src="${escapeHtml(imagePath)}"
            alt="Publicidade"
            class="advertisement-image"
        >
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

    const lastUpdate =
        localStorage.getItem(
            WEATHER_LAST_UPDATE_KEY
        );

    const today =
        getLocalDateKey(now);

    return (
        isUpdateDay &&
        isAfterScheduledTime &&
        lastUpdate !== today
    );
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

    const currentSlideElement =
        slides[currentSlide];

    const slideDuration =
        Number(
            currentSlideElement?.dataset.duration
        ) || SLIDE_DURATION;

    setTimeout(
        nextSlide,
        slideDuration
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