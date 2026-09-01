javascript
const slides = document.querySelectorAll(".slide");
const progress = document.getElementById("progress");

const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");

let currentSlide = 0;
let playerStarted = false;
let slideTimer = null;
let wakeLock = null;

// =========================
// CONFIGURAÇÕES
// =========================

const SLIDE_DURATION = 10000;

// Notícias
const NEWS_LIMIT = 5;
const NEWS_UPDATE_INTERVAL = 3 * 60 * 60 * 1000;

// RSS do Jornal de Itapetininga
const RSS_URL =
    "https://www.jornaldeitapetininga.com.br/feed";

// Proxy para permitir acesso ao RSS pelo navegador
const RSS_PROXY =
    "https://api.allorigins.win/raw?url=";


// =========================
// NOTÍCIAS
// =========================

let news = [];


/**
 * Busca notícias no RSS.
 */
async function loadNews() {

    console.log("Buscando notícias...");

    try {

        const encodedUrl =
            encodeURIComponent(RSS_URL);

        const response = await fetch(
            RSS_PROXY + encodedUrl,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );

        }

        const xmlText =
            await response.text();

        const parser =
            new DOMParser();

        const xml =
            parser.parseFromString(
                xmlText,
                "application/xml"
            );

        const parserError =
            xml.querySelector("parsererror");

        if (parserError) {

            throw new Error(
                "RSS inválido."
            );

        }

        const items =
            Array.from(
                xml.querySelectorAll("item")
            );

        const parsedNews =
            items
                .slice(0, NEWS_LIMIT)
                .map((item) => {

                    const title =
                        item.querySelector("title")
                            ?.textContent
                            ?.trim() || "";

                    const description =
                        item.querySelector("description")
                            ?.textContent
                            ?.trim() || "";

                    const link =
                        item.querySelector("link")
                            ?.textContent
                            ?.trim() || "";

                    const pubDate =
                        item.querySelector("pubDate")
                            ?.textContent
                            ?.trim() || "";

                    return {
                        title,
                        description:
                            cleanDescription(
                                description
                            ),
                        link,
                        pubDate
                    };

                })
                .filter(
                    (item) =>
                        item.title !== ""
                );

        if (parsedNews.length === 0) {

            throw new Error(
                "Nenhuma notícia encontrada."
            );

        }

        news = parsedNews;

        console.log(
            `${news.length} notícias carregadas.`
        );

        renderNews();

    } catch (error) {

        console.warn(
            "Não foi possível atualizar as notícias:",
            error
        );

        // Se já temos notícias válidas,
        // simplesmente mantemos as anteriores.
        if (news.length > 0) {

            console.log(
                "Mantendo últimas notícias válidas."
            );

        } else {

            renderNewsError();

        }

    }

}


/**
 * Remove HTML do resumo da notícia.
 */
function cleanDescription(text) {

    const temp =
        document.createElement("div");

    temp.innerHTML = text;

    return (
        temp.textContent ||
        temp.innerText ||
        ""
    ).trim();

}


/**
 * Atualiza o conteúdo visual
 * do slide de notícias.
 */
function renderNews() {

    const newsContainer =
        document.querySelector("#news .content");

    if (!newsContainer) {
        return;
    }

    if (news.length === 0) {

        renderNewsError();

        return;

    }

    newsContainer.innerHTML = `

        <span class="label">
            NOTÍCIAS
        </span>

        <h1>
            Itapetininga
        </h1>

        <div id="news-list">

            ${news
                .map(
                    (item, index) => `

                    <article class="news-item">

                        <span class="news-number">
                            ${index + 1}
                        </span>

                        <h2>
                            ${escapeHtml(
                                item.title
                            )}
                        </h2>

                        ${
                            item.description
                                ? `
                                <p>
                                    ${escapeHtml(
                                        limitText(
                                            item.description,
                                            180
                                        )
                                    )}
                                </p>
                                `
                                : ""
                        }

                    </article>

                `
                )
                .join("")}

        </div>

    `;

}


/**
 * Mensagem exibida caso
 * nenhuma notícia esteja disponível.
 */
function renderNewsError() {

    const newsContainer =
        document.querySelector("#news .content");

    if (!newsContainer) {
        return;
    }

    newsContainer.innerHTML = `

        <span class="label">
            NOTÍCIAS
        </span>

        <h1>
            Notícias
        </h1>

        <p>
            Não foi possível atualizar as notícias.
        </p>

        <p>
            Tentaremos novamente automaticamente.
        </p>

    `;

}


/**
 * Limita o tamanho do texto.
 */
function limitText(
    text,
    maxLength
) {

    if (text.length <= maxLength) {

        return text;

    }

    return (
        text.substring(
            0,
            maxLength
        ).trim() + "..."
    );

}


/**
 * Evita inserir HTML vindo
 * diretamente do RSS.
 */
function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


/**
 * Atualiza notícias periodicamente.
 */
function startNewsUpdater() {

    setInterval(
        loadNews,
        NEWS_UPDATE_INTERVAL
    );

}


// =========================
// FULLSCREEN
// =========================

async function enterFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        }

    } catch (error) {

        console.warn(
            "Não foi possível entrar em tela cheia:",
            error
        );

    }

}


// =========================
// WAKE LOCK
// =========================

async function requestWakeLock() {

    if (!("wakeLock" in navigator)) {

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


// =========================
// RECUPERAR WAKE LOCK
// =========================

async function restoreWakeLock() {

    if (
        playerStarted &&
        document.visibilityState === "visible"
    ) {

        await requestWakeLock();

    }

}


// =========================
// MOSTRAR SLIDE
// =========================

function showSlide(index) {

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


// =========================
// PRÓXIMO SLIDE
// =========================

function nextSlide() {

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


// =========================
// INICIAR PLAYER
// =========================

async function startPlayer() {

    if (playerStarted) {

        return;

    }

    playerStarted = true;

    console.log(
        "Iniciando Media Player..."
    );

    // Tela cheia
    await enterFullscreen();

    // Mantém tela ligada
    await requestWakeLock();

    // Remove tela inicial
    startScreen.style.display =
        "none";

    // Primeiro slide
    currentSlide = 0;

    showSlide(
        currentSlide
    );

    // Playlist
    slideTimer =
        setInterval(
            nextSlide,
            SLIDE_DURATION
        );

}


// =========================
// BOTÃO INICIAR
// =========================

startButton.addEventListener(
    "click",
    startPlayer
);


// =========================
// VISIBILIDADE
// =========================

document.addEventListener(
    "visibilitychange",
    restoreWakeLock
);


// =========================
// INICIALIZAÇÃO
// =========================

// Busca notícias imediatamente.
loadNews();

// Agenda atualização a cada 3 horas.
startNewsUpdater();

console.log(
    "Media Player aguardando início."
);

