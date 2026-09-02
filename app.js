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


// ========================================
// API DE NOTÍCIAS
// ========================================

const NEWS_API_URL =
    "https://billowing-thunder-176amediamvp.drigo-felipe.workers.dev/";


// ========================================
// DADOS
// ========================================

let news = [];


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
    // PUBLICIDADE
    // ====================================

    player.appendChild(
        createAdvertisementSlide()
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


    slide.innerHTML = `

        <div class="weather-container">

            <span class="label">
                CLIMA
            </span>


            <div class="weather-cities">


                <!-- =================================
                     ITAPETININGA
                ================================== -->

                <div class="weather-city">

                    <div class="weather-icon">
                        ☀️
                    </div>

                    <h1>
                        22°C
                    </h1>

                    <h2>
                        Itapetininga - SP
                    </h2>

                    <p>
                        Ensolarado
                    </p>

                </div>


                <!-- =================================
                     SÃO PAULO
                ================================== -->

                <div class="weather-city">

                    <div class="weather-icon">
                        ⛅
                    </div>

                    <h1>
                        20°C
                    </h1>

                    <h2>
                        São Paulo - SP
                    </h2>

                    <p>
                        Parcialmente Nublado
                    </p>

                </div>


            </div>

        </div>

    `;


    return slide;

}


// ========================================
// SLIDE DE PUBLICIDADE
// ========================================

function createAdvertisementSlide() {

    const slide =
        document.createElement(
            "section"
        );

    slide.className =
        "slide advertisement-slide";


    slide.innerHTML = `

        <div class="advertisement-content">

            <span class="label">
                PUBLICIDADE
            </span>

            <h1>
                OFERTA ESPECIAL
            </h1>

            <p>
                Seu anúncio pode aparecer aqui.
            </p>

            <div class="advertisement-box">
                ESPAÇO PUBLICITÁRIO
            </div>

        </div>

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


    progress.style.transition =
        "none";

    progress.style.width =
        "0%";


    requestAnimationFrame(
        () => {

            requestAnimationFrame(
                () => {

                    progress.style.transition =
                        `width ${SLIDE_DURATION}ms linear`;

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
// INICIALIZAÇÃO
// ========================================

loadNews();

startNewsUpdater();


console.log(
    "Media Player aguardando início."
);