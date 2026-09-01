const slides = document.querySelectorAll(".slide");
const progress = document.getElementById("progress");

const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");

let currentSlide = 0;
let playerStarted = false;
let slideTimer = null;
let wakeLock = null;

// Tempo de cada conteúdo
const SLIDE_DURATION = 10000;


/* =========================
   FULLSCREEN
   ========================= */

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


/* =========================
   WAKE LOCK
   ========================= */

async function requestWakeLock() {

    if (!("wakeLock" in navigator)) {

        console.warn(
            "Wake Lock não é suportado neste navegador."
        );

        return;

    }

    try {

        wakeLock = await navigator.wakeLock.request("screen");

        console.log("Wake Lock ativado.");

        wakeLock.addEventListener("release", () => {

            console.log("Wake Lock liberado.");

        });

    } catch (error) {

        console.warn(
            "Não foi possível ativar o Wake Lock:",
            error
        );

    }
}


/* =========================
   RECUPERAR WAKE LOCK
   ========================= */

async function restoreWakeLock() {

    if (
        playerStarted &&
        document.visibilityState === "visible"
    ) {

        await requestWakeLock();

    }

}


/* =========================
   MOSTRAR SLIDE
   ========================= */

function showSlide(index) {

    slides.forEach((slide, i) => {

        slide.classList.toggle(
            "active",
            i === index
        );

    });

    progress.style.transition = "none";

    progress.style.width = "0%";

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            progress.style.transition =
                `width ${SLIDE_DURATION}ms linear`;

            progress.style.width = "100%";

        });

    });

}


/* =========================
   PRÓXIMO SLIDE
   ========================= */

function nextSlide() {

    currentSlide++;

    if (currentSlide >= slides.length) {

        currentSlide = 0;

    }

    showSlide(currentSlide);

}


/* =========================
   INICIAR PLAYER
   ========================= */

async function startPlayer() {

    if (playerStarted) {
        return;
    }

    playerStarted = true;

    console.log("Iniciando Media Player...");

    // Tenta entrar em tela cheia
    await enterFullscreen();

    // Mantém a tela ligada
    await requestWakeLock();

    // Remove a tela inicial
    startScreen.style.display = "none";

    // Mostra primeiro slide
    currentSlide = 0;

    showSlide(currentSlide);

    // Inicia a playlist
    slideTimer = setInterval(
        nextSlide,
        SLIDE_DURATION
    );

}


/* =========================
   EVENTO DO BOTÃO
   ========================= */

startButton.addEventListener(
    "click",
    startPlayer
);


/* =========================
   RECUPERAR WAKE LOCK
   ========================= */

document.addEventListener(
    "visibilitychange",
    restoreWakeLock
);


/* =========================
   ESTADO INICIAL
   ========================= */

// Não iniciar automaticamente.
// O primeiro toque do usuário inicia o player.

console.log("Media Player aguardando início.");